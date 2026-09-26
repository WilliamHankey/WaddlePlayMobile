"""Waddle Play backend API tests - auth, profile, playdates, safety."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://safe-playdates-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@waddleplay.com"
DEMO_PW = "password123"


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PW}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="module")
def new_user():
    email = f"TEST_{uuid.uuid4().hex[:8]}@waddleplay.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "TestUser"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["access_token"], "user_id": data["user_id"]}


# ---------- Auth ----------
class TestAuth:
    def test_login_demo(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PW}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["access_token"] and d["email"] == DEMO_EMAIL

    def test_login_bad_pw(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_signup_creates_family(self, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        r = requests.get(f"{API}/profile/me", headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["user_id"] == new_user["user_id"]

    def test_signup_duplicate_conflict(self):
        r = requests.post(f"{API}/auth/signup", json={"email": DEMO_EMAIL, "password": "password123"}, timeout=15)
        assert r.status_code == 409

    def test_me_requires_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, demo_headers):
        r = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL


# ---------- Profile ----------
class TestProfile:
    def test_get_my_profile(self, demo_headers):
        r = requests.get(f"{API}/profile/me", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "children" in d and "interests" in d and "sensory_preferences" in d
        assert len(d["children"]) >= 1


# ---------- Playdates ----------
class TestPlaydates:
    def test_list_sorted_and_fields(self, demo_headers):
        r = requests.get(f"{API}/playdates", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 5
        scores = [p["match_score"] for p in items]
        assert scores == sorted(scores, reverse=True)
        p0 = items[0]
        for k in ("match_score", "host_verified", "sensory_friendly_tags"):
            assert k in p0

    def test_filter_by_category(self, demo_headers):
        r = requests.get(f"{API}/playdates?category=art", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all(p["category"] == "art" for p in items)

    def test_detail(self, demo_headers):
        r = requests.get(f"{API}/playdates/pd-art", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "pd-art"
        assert "match_score" in d and "host" in d

    def test_join(self, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        r = requests.post(f"{API}/playdates/pd-soccer/join", headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] in ("requested", "already_joined")
        # verify attendee added
        r2 = requests.get(f"{API}/playdates/pd-soccer", headers=h, timeout=15)
        assert new_user["user_id"] in r2.json()["attendee_family_ids"]


# ---------- Families ----------
class TestFamilies:
    def test_get_family(self, demo_headers):
        r = requests.get(f"{API}/families/fam-sarah", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "fam-sarah"
        assert "match_score" in d and "blocked" in d
        assert d["blocked"] is False


# ---------- Safety block/unblock/report ----------
class TestSafety:
    def test_block_then_unblock_and_report(self, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        # get a playdate host to block - use fam-sarah (host of pd-park)
        target = "fam-sarah"
        # baseline: pd-park visible
        r = requests.get(f"{API}/playdates", headers=h, timeout=15)
        assert any(p["id"] == "pd-park" for p in r.json())

        # block
        r = requests.post(f"{API}/safety/block", headers=h, json={"target_family_id": target}, timeout=15)
        assert r.status_code == 200

        # pd-park hosted by blocked family should be excluded
        r = requests.get(f"{API}/playdates", headers=h, timeout=15)
        assert not any(p["id"] == "pd-park" for p in r.json())

        # family shows blocked=true
        r = requests.get(f"{API}/families/{target}", headers=h, timeout=15)
        assert r.json()["blocked"] is True

        # unblock
        r = requests.post(f"{API}/safety/unblock", headers=h, json={"target_family_id": target}, timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/playdates", headers=h, timeout=15)
        assert any(p["id"] == "pd-park" for p in r.json())

        # report
        r = requests.post(f"{API}/safety/report", headers=h, json={"target_family_id": target, "reason": "test"}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "reported"
