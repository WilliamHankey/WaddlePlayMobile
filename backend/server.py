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
def match_details(family: dict, playdate: dict, host: Optional[dict]) -> tuple[int, list[str]]:
    """Rule-based score 0-100 plus a list of human-readable match reasons."""
    score = 40  # baseline for verified family
    reasons: list[str] = []

    def shared(a: list, b: list) -> list:
        if not a or not b:
            return []
        return sorted(set(a) & set(b))

    sensory_hits = shared(family.get("sensory_preferences", []), playdate.get("sensory_friendly_tags", []))
    if sensory_hits:
        score += min(20, len(sensory_hits) * 7)
        reasons.extend(sensory_hits[:2])

    interest_hits = shared(family.get("interests", []), playdate.get("interests", []))
    if interest_hits:
        score += min(20, len(interest_hits) * 6)
        reasons.extend(interest_hits[:2])

    if host:
        value_hits = shared(family.get("family_values", []), host.get("family_values", []))
        if value_hits:
            score += min(10, len(value_hits) * 4)
            reasons.append(value_hits[0])
        if family.get("communication_style") and family["communication_style"] == host.get("communication_style"):
            score += 10
            reasons.append(f"{family['communication_style']} communication")

    ages = [c.get("age", 0) for c in family.get("children", [])]
    if any(playdate.get("age_min", 0) <= a <= playdate.get("age_max", 99) for a in ages):
        score += 10
        reasons.append("age fits your child")

    # Dedupe preserving order
    seen: set[str] = set()
    deduped: list[str] = []
    for r in reasons:
        if r and r not in seen:
            seen.add(r)
            deduped.append(r)

    return max(0, min(100, score)), deduped[:3]


def match_score(family: dict, playdate: dict, host: Optional[dict]) -> int:
    return match_details(family, playdate, host)[0]


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
        p["match_score"], p["match_reasons"] = match_details(my_fam, p, host)
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
    p["match_score"], p["match_reasons"] = match_details(my_fam, p, host)
    p["host_verified"] = bool(host and host.get("verified"))
    p["host"] = host
    p["joined"] = user["id"] in p.get("attendee_family_ids", [])
    p["is_host"] = user["id"] == p.get("host_family_id")

    # Compute request status for this user (host has None)
    if p["is_host"]:
        p["request_status"] = "host"
        pending_count = await db.join_requests.count_documents({"playdate_id": playdate_id, "status": "pending"})
        p["pending_requests_count"] = pending_count
    elif p["joined"]:
        p["request_status"] = "approved"
    else:
        existing = await db.join_requests.find_one(
            {"playdate_id": playdate_id, "user_id": user["id"]},
            sort=[("created_at", -1)],
        )
        p["request_status"] = existing["status"] if existing else "none"

    # Only reveal private_note to host or joined attendees
    if user["id"] != p.get("host_family_id") and user["id"] not in p.get("attendee_family_ids", []):
        p.pop("private_note", None)
    return p


@api.post("/playdates/{playdate_id}/join")
async def join_playdate(playdate_id: str, user=Depends(current_user)):
    p = await db.playdates.find_one({"id": playdate_id})
    if not p:
        raise HTTPException(status_code=404, detail="Playdate not found")
    if user["id"] == p.get("host_family_id"):
        raise HTTPException(status_code=400, detail="You are the host of this playdate")
    if user["id"] in p.get("attendee_family_ids", []):
        return {"status": "already_joined"}
    if len(p.get("attendee_family_ids", [])) >= p.get("max_children", 8):
        raise HTTPException(status_code=400, detail="Playdate is full")
    existing = await db.join_requests.find_one({"playdate_id": playdate_id, "user_id": user["id"], "status": "pending"})
    if existing:
        return {"status": "already_pending"}
    await db.join_requests.insert_one({
        "id": str(uuid.uuid4()),
        "playdate_id": playdate_id,
        "user_id": user["id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "requested"}


@api.get("/playdates/{playdate_id}/requests")
async def list_playdate_requests(playdate_id: str, user=Depends(current_user)):
    p = await db.playdates.find_one({"id": playdate_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Playdate not found")
    if user["id"] != p.get("host_family_id"):
        raise HTTPException(status_code=403, detail="Only the host can view join requests")
    reqs = await db.join_requests.find({"playdate_id": playdate_id, "status": "pending"}, {"_id": 0}).sort("created_at", 1).to_list(200)
    out = []
    for r in reqs:
        fam = await db.families.find_one({"id": r["user_id"]}, {"_id": 0})
        if fam:
            my_fam = p  # for score, use fam vs playdate
            score, reasons = match_details(fam, p, await db.families.find_one({"id": p["host_family_id"]}, {"_id": 0}))
            out.append({**r, "family": fam, "match_score": score, "match_reasons": reasons})
    return out


class DecideBody(BaseModel):
    request_id: str


@api.post("/playdates/{playdate_id}/requests/{request_id}/approve")
async def approve_request(playdate_id: str, request_id: str, user=Depends(current_user)):
    p = await db.playdates.find_one({"id": playdate_id})
    if not p:
        raise HTTPException(status_code=404, detail="Playdate not found")
    if user["id"] != p.get("host_family_id"):
        raise HTTPException(status_code=403, detail="Only the host can approve")
    req = await db.join_requests.find_one({"id": request_id, "playdate_id": playdate_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["status"] != "pending":
        return {"status": req["status"]}
    if len(p.get("attendee_family_ids", [])) >= p.get("max_children", 8):
        raise HTTPException(status_code=400, detail="Playdate is full")
    await db.playdates.update_one({"id": playdate_id}, {"$addToSet": {"attendee_family_ids": req["user_id"]}})
    await db.join_requests.update_one({"id": request_id}, {"$set": {"status": "approved", "decided_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": "approved"}


@api.post("/playdates/{playdate_id}/requests/{request_id}/decline")
async def decline_request(playdate_id: str, request_id: str, user=Depends(current_user)):
    p = await db.playdates.find_one({"id": playdate_id})
    if not p:
        raise HTTPException(status_code=404, detail="Playdate not found")
    if user["id"] != p.get("host_family_id"):
        raise HTTPException(status_code=403, detail="Only the host can decline")
    await db.join_requests.update_one(
        {"id": request_id, "playdate_id": playdate_id},
        {"$set": {"status": "declined", "decided_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "declined"}


CATEGORY_IMAGES = {
    "soccer": "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
    "art": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
    "park": "https://images.unsplash.com/photo-1471421298428-1a04ad715e18?w=800",
    "music": "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800",
    "sensory": "https://images.unsplash.com/photo-1547621869-13698ff2c2f3?w=800",
}


class CreatePlaydate(BaseModel):
    title: str
    category: str
    location: str
    date: str
    start_time: str
    end_time: str
    age_min: int
    age_max: int
    description: str = ""
    sensory_friendly_tags: List[str] = []
    interests: List[str] = []
    max_children: int = 6
    private_note: Optional[str] = None


@api.post("/playdates")
async def create_playdate(body: CreatePlaydate, user=Depends(current_user)):
    fam = await db.families.find_one({"user_id": user["id"]}, {"_id": 0})
    if not fam:
        raise HTTPException(status_code=400, detail="Complete your profile first")
    new_id = f"pd-{uuid.uuid4().hex[:8]}"
    doc = {
        "id": new_id,
        "host_family_id": user["id"],
        "host_name": fam.get("parent_name", "Host"),
        "title": body.title,
        "category": body.category,
        "image_url": CATEGORY_IMAGES.get(body.category, CATEGORY_IMAGES["park"]),
        "location": body.location,
        "date": body.date,
        "start_time": body.start_time,
        "end_time": body.end_time,
        "age_range": f"{body.age_min}-{body.age_max} years",
        "age_min": body.age_min,
        "age_max": body.age_max,
        "description": body.description,
        "sensory_friendly_tags": body.sensory_friendly_tags,
        "interests": body.interests,
        "attendee_family_ids": [],
        "attendees_avatars": [],
        "max_children": max(2, min(20, body.max_children)),
        "private_note": (body.private_note or "").strip() or None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.playdates.insert_one(doc)
    doc.pop("_id", None)
    return doc


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


@api.get("/forum")
async def list_forum(user=Depends(current_user)):
    posts = await db.forum_posts.find({}, {"_id": 0}).sort("hours_ago", 1).to_list(200)
    return posts


@api.get("/forum/{post_id}")
async def get_forum_post(post_id: str, user=Depends(current_user)):
    p = await db.forum_posts.find_one({"id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    return p


@api.get("/resources")
async def list_resources(user=Depends(current_user)):
    items = await db.resources.find({}, {"_id": 0}).to_list(200)
    saved = await db.saved_resources.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    saved_ids = {s["resource_id"] for s in saved}
    for i in items:
        i["saved"] = i["id"] in saved_ids
    return items


@api.post("/resources/{resource_id}/save")
async def save_resource(resource_id: str, user=Depends(current_user)):
    r = await db.resources.find_one({"id": resource_id})
    if not r:
        raise HTTPException(status_code=404, detail="Resource not found")
    await db.saved_resources.update_one(
        {"user_id": user["id"], "resource_id": resource_id},
        {"$setOnInsert": {"user_id": user["id"], "resource_id": resource_id, "saved_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"status": "saved"}


@api.post("/resources/{resource_id}/unsave")
async def unsave_resource(resource_id: str, user=Depends(current_user)):
    await db.saved_resources.delete_one({"user_id": user["id"], "resource_id": resource_id})
    return {"status": "unsaved"}


@api.get("/profile/saved-resources")
async def my_saved_resources(user=Depends(current_user)):
    saved = await db.saved_resources.find({"user_id": user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(500)
    ids = [s["resource_id"] for s in saved]
    if not ids:
        return []
    items = await db.resources.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    order = {rid: idx for idx, rid in enumerate(ids)}
    items.sort(key=lambda r: order.get(r["id"], 999))
    for i in items:
        i["saved"] = True
    return items


@api.get("/threads")
async def list_threads(user=Depends(current_user)):
    # A thread is visible to its participants; seeded threads use the demo user.
    items = await db.threads.find({}, {"_id": 0}).to_list(200)
    # Ensure status default for legacy seeded threads
    for t in items:
        t.setdefault("status", "active")
        t.setdefault("initiator_id", None)
        # Compute a display "role" for the current user
        t["is_initiator"] = t.get("initiator_id") == user["id"]
    # Sort: incoming requests first, then active
    items.sort(key=lambda t: (0 if (t["status"] == "requested" and not t["is_initiator"]) else 1 if t["status"] == "requested" else 2))
    return items


@api.get("/threads/{thread_id}")
async def get_thread(thread_id: str, user=Depends(current_user)):
    t = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    t.setdefault("status", "active")
    t.setdefault("initiator_id", None)
    t["is_initiator"] = t.get("initiator_id") == user["id"]
    return t


class SendMessage(BaseModel):
    text: str


@api.post("/threads/{thread_id}/messages")
async def send_message(thread_id: str, body: SendMessage, user=Depends(current_user)):
    t = await db.threads.find_one({"id": thread_id})
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    if t.get("status") == "requested":
        raise HTTPException(status_code=400, detail="Waiting for the other family to accept your chat request")
    if t.get("status") == "declined":
        raise HTTPException(status_code=400, detail="This chat request was declined")
    now = datetime.now(timezone.utc).strftime("%H:%M")
    msg = {"from": "me", "text": body.text, "at": now}
    await db.threads.update_one(
        {"id": thread_id},
        {"$push": {"messages": msg}, "$set": {"last": body.text, "at": now, "unread": 0}},
    )
    return {"status": "sent", "message": msg}


class ChatRequestBody(BaseModel):
    target_family_id: str
    opening_message: str


@api.post("/threads/request")
async def request_chat(body: ChatRequestBody, user=Depends(current_user)):
    fam = await db.families.find_one({"id": body.target_family_id}, {"_id": 0})
    if not fam:
        raise HTTPException(status_code=404, detail="Family not found")
    if body.target_family_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot message yourself")
    # Reuse existing thread if there is one
    existing = await db.threads.find_one({"family_id": body.target_family_id, "initiator_id": user["id"]}, {"_id": 0})
    if existing:
        return {"status": "exists", "thread_id": existing["id"]}
    new_id = f"th-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).strftime("%H:%M")
    doc = {
        "id": new_id,
        "family_id": body.target_family_id,
        "name": fam.get("parent_name", "Family"),
        "avatar_url": fam.get("avatar_url"),
        "last": body.opening_message,
        "at": now,
        "unread": 0,
        "status": "requested",
        "initiator_id": user["id"],
        "messages": [{"from": "me", "text": body.opening_message, "at": now}],
    }
    await db.threads.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "requested", "thread_id": new_id, "thread": doc}


@api.post("/threads/{thread_id}/accept")
async def accept_chat(thread_id: str, user=Depends(current_user)):
    t = await db.threads.find_one({"id": thread_id})
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    if t.get("initiator_id") == user["id"]:
        raise HTTPException(status_code=400, detail="Only the recipient can accept")
    await db.threads.update_one({"id": thread_id}, {"$set": {"status": "active"}})
    return {"status": "active"}


@api.post("/threads/{thread_id}/decline")
async def decline_chat(thread_id: str, user=Depends(current_user)):
    t = await db.threads.find_one({"id": thread_id})
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    if t.get("initiator_id") == user["id"]:
        raise HTTPException(status_code=400, detail="Only the recipient can decline")
    await db.threads.update_one({"id": thread_id}, {"$set": {"status": "declined"}})
    return {"status": "declined"}


@api.get("/notifications")
async def list_notifications(user=Depends(current_user)):
    items = await db.notifications.find({}, {"_id": 0}).to_list(200)
    return items


@api.post("/notifications/read-all")
async def mark_all_read(user=Depends(current_user)):
    await db.notifications.update_many({}, {"$set": {"unread": False}})
    return {"status": "ok"}


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

SEED_FORUM = [
    {"id": "fp-1", "author_id": "fam-sarah", "author_name": "Sarah M.", "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", "topic": "Parenting", "title": "Best outdoor activities for 4-6 year olds", "body": "Looking for calm outdoor spaces in Cape Town that work well for a sensory-sensitive 5yo. What are your favourite quiet parks?", "replies": 24, "hours_ago": 2},
    {"id": "fp-2", "author_id": "fam-james", "author_name": "James N.", "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", "topic": "Parenting", "title": "How do you manage screen time on weekends?", "body": "Our ADHD 6yo struggles with transitions off screens. What works for your family?", "replies": 18, "hours_ago": 5},
    {"id": "fp-3", "author_id": "fam-lisa", "author_name": "Lisa B.", "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", "topic": "Activities", "title": "Looking for art class recommendations in Cape Town", "body": "Anyone know of neurodiversity-affirming art classes for 6-year-olds?", "replies": 12, "hours_ago": 24},
    {"id": "fp-4", "author_id": "fam-emma", "author_name": "Emma vdM", "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", "topic": "Local", "title": "AAC-friendly speech therapist recommendations", "body": "Our SLP is moving overseas. Any recs for AAC-savvy therapists in the Southern Suburbs?", "replies": 9, "hours_ago": 30},
    {"id": "fp-5", "author_id": "fam-tom", "author_name": "Tom A.", "avatar_url": "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=100", "topic": "General", "title": "Music therapy vs sensory playgroups — thoughts?", "body": "Trying to decide between weekly music therapy and a sensory playgroup. Would love to hear experiences.", "replies": 7, "hours_ago": 48},
]

SEED_RESOURCES = [
    {"id": "rs-1", "kind": "article", "title": "10 outdoor games kids will never get tired of", "image_url": "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600", "read_minutes": 5, "featured": True, "summary": "Ideas to keep kids engaged and learning at home and outdoors."},
    {"id": "rs-2", "kind": "guide", "title": "Positive parenting tips that really work", "image_url": "https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=600", "read_minutes": 7, "featured": False, "summary": "Compassionate, evidence-based approaches to daily challenges."},
    {"id": "rs-3", "kind": "video", "title": "Finding the right activities for your child", "image_url": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600", "read_minutes": 12, "featured": False, "summary": "A short video guide for choosing sensory-appropriate activities."},
    {"id": "rs-4", "kind": "guide", "title": "Preparing your child for a first playdate", "image_url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600", "read_minutes": 6, "featured": True, "summary": "A calm, step-by-step way to reduce first-playdate anxiety."},
    {"id": "rs-5", "kind": "article", "title": "Understanding sensory profiles: a parent primer", "image_url": "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600", "read_minutes": 8, "featured": False, "summary": "What sensory-seeking vs. sensory-avoiding means in daily life."},
]

SEED_THREADS = [
    {"id": "th-sarah", "family_id": "fam-sarah", "name": "Sarah Mitchell", "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200", "last": "Leo would love the nature walk on Saturday! What do you usually bring?", "at": "10:24", "unread": 2, "messages": [
        {"from": "them", "text": "Hi! Saw your request for the Quiet Nature Walk — welcome 💚", "at": "Mon 09:12"},
        {"from": "me", "text": "Thanks so much! Leo is really excited. Anything he should bring?", "at": "Mon 09:15"},
        {"from": "them", "text": "Just a water bottle and something for the sun. We keep it very small (max 4 kids) so it stays calm.", "at": "Mon 09:20"},
        {"from": "them", "text": "Leo would love the nature walk on Saturday! What do you usually bring?", "at": "10:24"},
    ]},
    {"id": "th-james", "family_id": "fam-james", "name": "James & Priya", "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", "last": "Perfect — see you at 10 at Green Point Park 🙌", "at": "Yesterday", "unread": 0, "messages": [
        {"from": "me", "text": "Hi! Just confirming the soccer playdate on Sat.", "at": "Sun 14:00"},
        {"from": "them", "text": "Yes we&apos;re on! Aarav can&apos;t wait.", "at": "Sun 14:12"},
        {"from": "them", "text": "Perfect — see you at 10 at Green Point Park 🙌", "at": "Yesterday"},
    ]},
    {"id": "th-emma", "family_id": "fam-emma", "name": "Emma van der Merwe", "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200", "last": "Zoe uses AAC — I&apos;ll bring her device 🙂", "at": "Tue", "unread": 0, "messages": [
        {"from": "them", "text": "Hi 👋 We&apos;d love to join the art playdate!", "at": "Tue 11:02"},
        {"from": "them", "text": "Zoe uses AAC — I&apos;ll bring her device 🙂", "at": "Tue 11:05"},
    ]},
    {"id": "th-lisa", "family_id": "fam-lisa", "name": "Lisa Botha", "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200", "last": "The twins are excited — see you Wednesday!", "at": "Sat", "unread": 1, "messages": [
        {"from": "them", "text": "Hi! Mia and Eva would love to join.", "at": "Sat 08:30"},
        {"from": "them", "text": "The twins are excited — see you Wednesday!", "at": "Sat 08:32"},
    ]},
]

SEED_NOTIFICATIONS = [
    {"id": "nt-1", "kind": "playdate_join", "title": "Sarah accepted your join request", "body": "Quiet Nature Walk on Sat 14 Jun is confirmed.", "at": "10 min ago", "unread": True, "icon": "check-circle"},
    {"id": "nt-2", "kind": "match", "title": "New 96% match nearby", "body": "Sarah&apos;s family shares 4 sensory preferences with you.", "at": "1 hr ago", "unread": True, "icon": "star"},
    {"id": "nt-3", "kind": "forum", "title": "New reply on your discussion", "body": "James replied to \"Best outdoor activities…\"", "at": "3 hr ago", "unread": False, "icon": "message-circle"},
    {"id": "nt-4", "kind": "safety", "title": "Community verification complete", "body": "Your family profile is now verified.", "at": "Yesterday", "unread": False, "icon": "shield"},
    {"id": "nt-5", "kind": "resource", "title": "New guide for you", "body": "Preparing your child for a first playdate.", "at": "2 d ago", "unread": False, "icon": "book-open"},
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
    for fp in SEED_FORUM:
        await db.forum_posts.update_one({"id": fp["id"]}, {"$setOnInsert": fp}, upsert=True)
    for rs in SEED_RESOURCES:
        await db.resources.update_one({"id": rs["id"]}, {"$setOnInsert": rs}, upsert=True)
    for th in SEED_THREADS:
        await db.threads.update_one({"id": th["id"]}, {"$setOnInsert": th}, upsert=True)
    for nt in SEED_NOTIFICATIONS:
        await db.notifications.update_one({"id": nt["id"]}, {"$setOnInsert": nt}, upsert=True)
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
