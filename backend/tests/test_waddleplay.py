"""Waddle Play backend regression tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
DEMO = {"email": "demo@waddleplay.com", "password": "password123"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- Auth ---
def test_login_demo():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == DEMO["email"]
    assert "access_token" in body


def test_signup_new_user():
    email = f"test_{uuid.uuid4().hex[:8]}@waddleplay.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "TEST User"}, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["email"] == email


def test_auth_me(auth):
    r = requests.get(f"{API}/auth/me", headers=auth, timeout=20)
    assert r.status_code == 200
    assert r.json()["email"] == DEMO["email"]


def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=20)
    assert r.status_code == 401


# --- Playdates ---
def test_playdates_list_ranked(auth):
    r = requests.get(f"{API}/playdates", headers=auth, timeout=20)
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 5
    for p in items:
        assert "match_score" in p and "host_verified" in p and "age_range" in p
        assert "category" in p and "sensory_friendly_tags" in p
    scores = [p["match_score"] for p in items]
    assert scores == sorted(scores, reverse=True)


def test_playdate_detail(auth):
    r = requests.get(f"{API}/playdates/pd-art", headers=auth, timeout=20)
    assert r.status_code == 200
    p = r.json()
    assert p["id"] == "pd-art"
    assert p["host"] and p["host"]["id"] == "fam-emma"
    assert "match_score" in p


def test_join_playdate_flow(auth):
    r1 = requests.post(f"{API}/playdates/pd-music/join", headers=auth, timeout=20)
    assert r1.status_code == 200
    assert r1.json()["status"] in ("requested", "already_joined")
    r2 = requests.post(f"{API}/playdates/pd-music/join", headers=auth, timeout=20)
    assert r2.status_code == 200
    assert r2.json()["status"] == "already_joined"


# --- Families ---
def test_get_family(auth):
    r = requests.get(f"{API}/families/fam-sarah", headers=auth, timeout=20)
    assert r.status_code == 200
    fam = r.json()
    assert fam["id"] == "fam-sarah"
    assert "match_score" in fam and "blocked" in fam


# --- Safety block/unblock ---
def test_block_hides_playdates_then_unblock(auth):
    # Block fam-emma (host of pd-art)
    r = requests.post(f"{API}/safety/block", headers=auth, json={"target_family_id": "fam-emma"}, timeout=20)
    assert r.status_code == 200
    lst = requests.get(f"{API}/playdates", headers=auth, timeout=20).json()
    assert not any(p["host_family_id"] == "fam-emma" for p in lst)
    # Family detail should show blocked=True
    fam = requests.get(f"{API}/families/fam-emma", headers=auth, timeout=20).json()
    assert fam["blocked"] is True
    # Unblock
    r2 = requests.post(f"{API}/safety/unblock", headers=auth, json={"target_family_id": "fam-emma"}, timeout=20)
    assert r2.status_code == 200
    lst2 = requests.get(f"{API}/playdates", headers=auth, timeout=20).json()
    assert any(p["host_family_id"] == "fam-emma" for p in lst2)


def test_safety_report(auth):
    r = requests.post(f"{API}/safety/report", headers=auth, json={"target_family_id": "fam-james", "reason": "TEST report"}, timeout=20)
    assert r.status_code == 200
    assert r.json()["status"] == "reported"


# --- Profile ---
def test_profile_get_and_update(auth):
    r = requests.get(f"{API}/profile/me", headers=auth, timeout=20)
    assert r.status_code == 200
    prof = r.json()
    assert prof["parent_name"]
    new_sensory = ["quiet", "small groups", "TEST_tag"]
    new_interests = ["painting", "nature", "TEST_interest"]
    r2 = requests.put(f"{API}/profile/me", headers=auth, json={"sensory_preferences": new_sensory, "interests": new_interests}, timeout=20)
    assert r2.status_code == 200
    updated = r2.json()
    assert "TEST_tag" in updated["sensory_preferences"]
    assert "TEST_interest" in updated["interests"]
    # Restore
    requests.put(f"{API}/profile/me", headers=auth, json={"sensory_preferences": prof["sensory_preferences"], "interests": prof["interests"]}, timeout=20)
