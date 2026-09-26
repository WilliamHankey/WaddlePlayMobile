"""Waddle Play backend: auth, profiles, playdates, matching, safety."""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, List, Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "waddleplay-dev-secret-change-in-prod")
JWT_ALG = "HS256"
JWT_EXP_MINUTES = 60 * 24 * 7  # 7 days

app = FastAPI()
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("waddleplay")


# --------------------------- Models ---------------------------
class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    name: str


class ChildProfile(BaseModel):
    name: str
    age: int
    diagnosis: Optional[str] = None  # e.g., "Autism", "ADHD"
    sensory_preferences: List[str] = []  # e.g., "quiet", "small groups"
    interests: List[str] = []
    communication_style: Optional[str] = None  # e.g., "verbal", "AAC", "mixed"


class FamilyProfile(BaseModel):
    id: str
    user_id: str
    parent_name: str
    location: str = ""
    bio: str = ""
    avatar_url: Optional[str] = None
    family_values: List[str] = []
    sensory_preferences: List[str] = []
    interests: List[str] = []
    communication_style: Optional[str] = None
    verified: bool = True
    children: List[ChildProfile] = []


class FamilyUpdate(BaseModel):
    parent_name: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    family_values: Optional[List[str]] = None
    sensory_preferences: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    communication_style: Optional[str] = None
    children: Optional[List[ChildProfile]] = None


class Playdate(BaseModel):
    id: str
    host_family_id: str
    host_name: str
    title: str
    category: str  # soccer, art, sensory, park, music
    image_url: str
    location: str
    date: str  # ISO date
    start_time: str
    end_time: str
    age_range: str  # "4-6 years"
    age_min: int
    age_max: int
    description: str = ""
    sensory_friendly_tags: List[str] = []
    interests: List[str] = []
    attendee_family_ids: List[str] = []
    attendees_avatars: List[str] = []
    max_children: int = 8


class ReportBody(BaseModel):
    target_family_id: str
    reason: str


class BlockBody(BaseModel):
    target_family_id: str


# --------------------------- Auth helpers ---------------------------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user_id, "email": email, "iat": now, "exp": now + timedelta(minutes=JWT_EXP_MINUTES)},
        JWT_SECRET,
        algorithm=JWT_ALG,
    )


async def current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    unauthorized = HTTPException(status_code=401, detail="Invalid or expired token")
    if not credentials or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise unauthorized
        return user
    except Exception:
        raise unauthorized


# --------------------------- Matching ---------------------------
def match_score(family: dict, playdate: dict, host: Optional[dict]) -> int:
    """Rule-based score 0-100 based on shared traits."""
    score = 40  # baseline for verified family

    def overlap(a: list, b: list) -> int:
        if not a or not b:
            return 0
        return len(set(a) & set(b))

    # Sensory preferences overlap with playdate tags
    score += min(20, overlap(family.get("sensory_preferences", []), playdate.get("sensory_friendly_tags", [])) * 7)
    # Interests overlap
    score += min(20, overlap(family.get("interests", []), playdate.get("interests", [])) * 6)

    if host:
        # Values with host
        score += min(10, overlap(family.get("family_values", []), host.get("family_values", [])) * 4)
        # Communication style match
        if family.get("communication_style") and family["communication_style"] == host.get("communication_style"):
            score += 10

    # Age fit: does family have a kid in the age range?
    ages = [c.get("age", 0) for c in family.get("children", [])]
    if any(playdate.get("age_min", 0) <= a <= playdate.get("age_max", 99) for a in ages):
        score += 10

    return max(0, min(100, score))


# --------------------------- Endpoints ---------------------------
@api.get("/")
async def root():
    return {"app": "Waddle Play", "status": "ok"}


@api.post("/auth/signup", response_model=TokenResponse)
async def signup(body: Credentials):
    email = str(body.email).strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = str(uuid.uuid4())
    name = (body.name or email.split("@")[0]).strip() or "Parent"
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "name": name,
        "password_hash": hash_pw(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # Create empty family profile
    await db.families.insert_one({
        "id": user_id,
        "user_id": user_id,
        "parent_name": name,
        "location": "",
        "bio": "",
        "avatar_url": None,
        "family_values": [],
        "sensory_preferences": [],
        "interests": [],
        "communication_style": None,
        "verified": True,
        "children": [],
    })
    return TokenResponse(access_token=make_token(user_id, email), user_id=user_id, email=email, name=name)


@api.post("/auth/login", response_model=TokenResponse)
async def login(body: Credentials):
    email = str(body.email).strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return TokenResponse(
        access_token=make_token(user["id"], email),
        user_id=user["id"],
        email=email,
        name=user.get("name", ""),
    )


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return {"id": user["id"], "email": user["email"], "name": user.get("name", "")}


@api.get("/profile/me", response_model=FamilyProfile)
async def get_my_profile(user=Depends(current_user)):
    fam = await db.families.find_one({"user_id": user["id"]}, {"_id": 0})
    if not fam:
        raise HTTPException(status_code=404, detail="Profile not found")
    return FamilyProfile(**fam)


@api.put("/profile/me", response_model=FamilyProfile)
async def update_my_profile(body: FamilyUpdate, user=Depends(current_user)):
    update: dict[str, Any] = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.families.update_one({"user_id": user["id"]}, {"$set": update})
    fam = await db.families.find_one({"user_id": user["id"]}, {"_id": 0})
    return FamilyProfile(**fam)


@api.get("/playdates")
async def list_playdates(
    category: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    user=Depends(current_user),
):
    my_fam = await db.families.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    blocks = await db.blocks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    blocked_ids = {b["target_family_id"] for b in blocks}

    q: dict[str, Any] = {}
    if category:
        q["category"] = category
    cursor = db.playdates.find(q, {"_id": 0}).sort("date", 1)
    items = await cursor.to_list(200)
    out = []
    for p in items:
        if p["host_family_id"] in blocked_ids:
            continue
        if age_min is not None and p["age_max"] < age_min:
            continue
        if age_max is not None and p["age_min"] > age_max:
            continue
        host = await db.families.find_one({"id": p["host_family_id"]}, {"_id": 0})
        p["match_score"] = match_score(my_fam, p, host)
        p["host_verified"] = bool(host and host.get("verified"))
        out.append(p)
    out.sort(key=lambda x: x["match_score"], reverse=True)
    return out


@api.get("/playdates/{playdate_id}")
async def get_playdate(playdate_id: str, user=Depends(current_user)):
    p = await db.playdates.find_one({"id": playdate_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Playdate not found")
    my_fam = await db.families.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    host = await db.families.find_one({"id": p["host_family_id"]}, {"_id": 0})
    p["match_score"] = match_score(my_fam, p, host)
    p["host_verified"] = bool(host and host.get("verified"))
    p["host"] = host
    p["joined"] = user["id"] in p.get("attendee_family_ids", [])
    return p


@api.post("/playdates/{playdate_id}/join")
async def join_playdate(playdate_id: str, user=Depends(current_user)):
    p = await db.playdates.find_one({"id": playdate_id})
    if not p:
        raise HTTPException(status_code=404, detail="Playdate not found")
    if user["id"] in p.get("attendee_family_ids", []):
        return {"status": "already_joined"}
    if len(p.get("attendee_family_ids", [])) >= p.get("max_children", 8):
        raise HTTPException(status_code=400, detail="Playdate is full")
    await db.playdates.update_one(
        {"id": playdate_id},
        {"$push": {"attendee_family_ids": user["id"]}},
    )
    await db.join_requests.insert_one({
        "id": str(uuid.uuid4()),
        "playdate_id": playdate_id,
        "user_id": user["id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "requested"}


@api.get("/families/{family_id}")
async def get_family(family_id: str, user=Depends(current_user)):
    fam = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not fam:
        raise HTTPException(status_code=404, detail="Family not found")
    # Check block status
    blocked = await db.blocks.find_one({"user_id": user["id"], "target_family_id": family_id})
    fam["blocked"] = bool(blocked)
    # Match score
    my_fam = await db.families.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fam["match_score"] = match_score(my_fam, {"sensory_friendly_tags": fam.get("sensory_preferences", []), "interests": fam.get("interests", []), "age_min": 0, "age_max": 99}, fam)
    return fam


@api.post("/safety/block")
async def block(body: BlockBody, user=Depends(current_user)):
    await db.blocks.update_one(
        {"user_id": user["id"], "target_family_id": body.target_family_id},
        {"$set": {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "target_family_id": body.target_family_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"status": "blocked"}


@api.post("/safety/unblock")
async def unblock(body: BlockBody, user=Depends(current_user)):
    await db.blocks.delete_one({"user_id": user["id"], "target_family_id": body.target_family_id})
    return {"status": "unblocked"}


@api.post("/safety/report")
async def report(body: ReportBody, user=Depends(current_user)):
    await db.reports.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "target_family_id": body.target_family_id,
        "reason": body.reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "reported"}


# --------------------------- Seed data ---------------------------
SEED_FAMILIES = [
    {
        "id": "fam-sarah",
        "user_id": "fam-sarah",
        "parent_name": "Sarah Mitchell",
        "location": "Green Point, Cape Town",
        "bio": "Mom to Leo (5). We love quiet parks, animals, and building forts. Leo is autistic and thrives with small groups and predictable routines.",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
        "family_values": ["neurodiversity-affirming", "kindness", "patience", "outdoors"],
        "sensory_preferences": ["quiet", "small groups", "outdoors", "predictable routine"],
        "interests": ["animals", "building", "nature", "books"],
        "communication_style": "verbal",
        "verified": True,
        "children": [{"name": "Leo", "age": 5, "diagnosis": "Autism", "sensory_preferences": ["quiet"], "interests": ["dinosaurs", "trains"], "communication_style": "verbal"}],
    },
    {
        "id": "fam-james",
        "user_id": "fam-james",
        "parent_name": "James & Priya Naidoo",
        "location": "Sea Point, Cape Town",
        "bio": "Parents to Aarav (6, ADHD) — high energy, loves running, water play, and Lego. We embrace movement breaks.",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
        "family_values": ["movement-friendly", "inclusion", "creativity"],
        "sensory_preferences": ["movement", "outdoors", "flexible"],
        "interests": ["lego", "swimming", "soccer"],
        "communication_style": "verbal",
        "verified": True,
        "children": [{"name": "Aarav", "age": 6, "diagnosis": "ADHD", "sensory_preferences": ["movement"], "interests": ["soccer", "lego"], "communication_style": "verbal"}],
    },
    {
        "id": "fam-emma",
        "user_id": "fam-emma",
        "parent_name": "Emma van der Merwe",
        "location": "Claremont, Cape Town",
        "bio": "Mom to Zoe (4) — nonverbal, uses AAC. We love sensory play, painting, and calm indoor spaces.",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
        "family_values": ["neurodiversity-affirming", "AAC-friendly", "patience"],
        "sensory_preferences": ["quiet", "small groups", "predictable routine", "sensory play"],
        "interests": ["painting", "water play", "music"],
        "communication_style": "AAC",
        "verified": True,
        "children": [{"name": "Zoe", "age": 4, "diagnosis": "Autism", "sensory_preferences": ["quiet", "sensory play"], "interests": ["painting", "water"], "communication_style": "AAC"}],
    },
    {
        "id": "fam-tom",
        "user_id": "fam-tom",
        "parent_name": "Tom & Aisha Adams",
        "location": "Woodstock, Cape Town",
        "bio": "Dads to Kai (5) — sensory-seeker who loves jumping, spinning, and drums. Music is our love language.",
        "avatar_url": "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=200",
        "family_values": ["inclusion", "creativity", "movement-friendly"],
        "sensory_preferences": ["movement", "sensory play", "music"],
        "interests": ["music", "drums", "trampoline"],
        "communication_style": "verbal",
        "verified": True,
        "children": [{"name": "Kai", "age": 5, "diagnosis": "SPD", "sensory_preferences": ["movement", "music"], "interests": ["drums"], "communication_style": "verbal"}],
    },
    {
        "id": "fam-lisa",
        "user_id": "fam-lisa",
        "parent_name": "Lisa Botha",
        "location": "Rondebosch, Cape Town",
        "bio": "Mom to twin girls Mia & Eva (6). We love art, quiet libraries, and gentle group play.",
        "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
        "family_values": ["kindness", "creativity", "neurodiversity-affirming"],
        "sensory_preferences": ["quiet", "small groups", "outdoors"],
        "interests": ["painting", "books", "nature"],
        "communication_style": "verbal",
        "verified": True,
        "children": [
            {"name": "Mia", "age": 6, "diagnosis": "Autism", "sensory_preferences": ["quiet"], "interests": ["painting"], "communication_style": "verbal"},
            {"name": "Eva", "age": 6, "diagnosis": None, "sensory_preferences": ["quiet"], "interests": ["books"], "communication_style": "verbal"},
        ],
    },
    {
        "id": "fam-david",
        "user_id": "fam-david",
        "parent_name": "David Okonkwo",
        "location": "Newlands, Cape Town",
        "bio": "Dad to Amara (7). We love hikes, gentle animals, and predictable playdates in small groups.",
        "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
        "family_values": ["outdoors", "patience", "neurodiversity-affirming"],
        "sensory_preferences": ["quiet", "outdoors", "predictable routine"],
        "interests": ["hiking", "animals", "reading"],
        "communication_style": "verbal",
        "verified": True,
        "children": [{"name": "Amara", "age": 7, "diagnosis": "Autism", "sensory_preferences": ["quiet"], "interests": ["hiking"], "communication_style": "verbal"}],
    },
]

SEED_PLAYDATES = [
    {
        "id": "pd-soccer",
        "host_family_id": "fam-james",
        "host_name": "James & Priya",
        "title": "Gentle Soccer Playdate",
        "category": "soccer",
        "image_url": "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
        "location": "Green Point Park",
        "date": "2026-06-14",
        "start_time": "10:00 AM",
        "end_time": "12:00 PM",
        "age_range": "4-6 years",
        "age_min": 4,
        "age_max": 6,
        "description": "Small-group soccer with movement breaks. No scoring, just fun. Sensory-safe zone available.",
        "sensory_friendly_tags": ["movement", "small groups", "outdoors", "flexible"],
        "interests": ["soccer", "outdoors"],
        "attendee_family_ids": ["fam-tom", "fam-david"],
        "attendees_avatars": [
            "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=100",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
        ],
        "max_children": 6,
    },
    {
        "id": "pd-art",
        "host_family_id": "fam-emma",
        "host_name": "Emma",
        "title": "Quiet Art & Creativity",
        "category": "art",
        "image_url": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
        "location": "Little Steps Studio",
        "date": "2026-06-15",
        "start_time": "3:00 PM",
        "end_time": "5:00 PM",
        "age_range": "3-5 years",
        "age_min": 3,
        "age_max": 5,
        "description": "Calm painting session with soft music. AAC-friendly. Noise-cancelling headphones available.",
        "sensory_friendly_tags": ["quiet", "small groups", "predictable routine", "sensory play"],
        "interests": ["painting", "art"],
        "attendee_family_ids": ["fam-sarah", "fam-lisa"],
        "attendees_avatars": [
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
        ],
        "max_children": 4,
    },
    {
        "id": "pd-park",
        "host_family_id": "fam-sarah",
        "host_name": "Sarah",
        "title": "Quiet Nature Walk",
        "category": "park",
        "image_url": "https://images.unsplash.com/photo-1471421298428-1a04ad715e18?w=800",
        "location": "De Waal Park",
        "date": "2026-06-16",
        "start_time": "9:30 AM",
        "end_time": "11:30 AM",
        "age_range": "5-7 years",
        "age_min": 5,
        "age_max": 7,
        "description": "Nature-themed walk, animal spotting. Small group, predictable route.",
        "sensory_friendly_tags": ["quiet", "outdoors", "predictable routine", "small groups"],
        "interests": ["nature", "animals", "hiking"],
        "attendee_family_ids": ["fam-david"],
        "attendees_avatars": ["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"],
        "max_children": 5,
    },
    {
        "id": "pd-music",
        "host_family_id": "fam-tom",
        "host_name": "Tom & Aisha",
        "title": "Sensory Music Jam",
        "category": "music",
        "image_url": "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800",
        "location": "Woodstock Hub",
        "date": "2026-06-17",
        "start_time": "2:00 PM",
        "end_time": "3:30 PM",
        "age_range": "4-8 years",
        "age_min": 4,
        "age_max": 8,
        "description": "Drums, shakers, and sensory-safe music play. Movement-friendly.",
        "sensory_friendly_tags": ["music", "movement", "sensory play"],
        "interests": ["music", "drums"],
        "attendee_family_ids": ["fam-james"],
        "attendees_avatars": ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"],
        "max_children": 6,
    },
    {
        "id": "pd-sensory",
        "host_family_id": "fam-lisa",
        "host_name": "Lisa",
        "title": "Indoor Sensory Playroom",
        "category": "sensory",
        "image_url": "https://images.unsplash.com/photo-1547621869-13698ff2c2f3?w=800",
        "location": "Rondebosch Community Center",
        "date": "2026-06-18",
        "start_time": "10:00 AM",
        "end_time": "12:00 PM",
        "age_range": "3-6 years",
        "age_min": 3,
        "age_max": 6,
        "description": "Quiet sensory bins, weighted blankets, calm corners. Perfect for anxious first playdates.",
        "sensory_friendly_tags": ["quiet", "sensory play", "small groups", "predictable routine"],
        "interests": ["sensory play", "books"],
        "attendee_family_ids": ["fam-emma"],
        "attendees_avatars": ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"],
        "max_children": 4,
    },
]


@app.on_event("startup")
async def seed_data():
    # Seed families
    for fam in SEED_FAMILIES:
        await db.families.update_one({"id": fam["id"]}, {"$setOnInsert": fam}, upsert=True)
    for pd in SEED_PLAYDATES:
        await db.playdates.update_one({"id": pd["id"]}, {"$setOnInsert": pd}, upsert=True)
    # Seed demo user
    demo_email = "demo@waddleplay.com"
    if not await db.users.find_one({"email": demo_email}):
        demo_id = "demo-user-1"
        await db.users.insert_one({
            "id": demo_id,
            "email": demo_email,
            "name": "Demo Parent",
            "password_hash": hash_pw("password123"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.families.update_one(
            {"id": demo_id},
            {"$setOnInsert": {
                "id": demo_id,
                "user_id": demo_id,
                "parent_name": "Demo Parent",
                "location": "Cape Town",
                "bio": "Parent to a wonderful 5-year-old.",
                "avatar_url": None,
                "family_values": ["neurodiversity-affirming", "kindness", "patience"],
                "sensory_preferences": ["quiet", "small groups", "outdoors"],
                "interests": ["nature", "painting", "books"],
                "communication_style": "verbal",
                "verified": True,
                "children": [{"name": "Sam", "age": 5, "diagnosis": "Autism", "sensory_preferences": ["quiet"], "interests": ["nature"], "communication_style": "verbal"}],
            }},
            upsert=True,
        )
    log.info("Seed complete: %d families, %d playdates", len(SEED_FAMILIES), len(SEED_PLAYDATES))


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
