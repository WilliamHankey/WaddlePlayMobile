"""Iteration 4 tests: Playdate RSVP Queue + Family Chat Requests."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


def _auth(email, password, name=None):
    """Login or signup."""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return r.json()
    r = requests.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": password, "name": name or email.split("@")[0]})
    assert r.status_code in (200, 409), r.text
    if r.status_code == 409:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    return r.json()


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def demo():
    return _auth("demo@waddleplay.com", "password123")


@pytest.fixture(scope="module")
def parent2():
    return _auth(f"TEST_parent2_{uuid.uuid4().hex[:6]}@test.com", "password123", "TEST Parent2")


@pytest.fixture(scope="module")
def host_playdate(demo):
    """Create a playdate owned by demo user for host-side testing."""
    body = {
        "title": f"TEST_host_pd_{uuid.uuid4().hex[:6]}",
        "category": "park", "location": "Test park",
        "date": "2026-07-01", "start_time": "10:00 AM", "end_time": "11:00 AM",
        "age_min": 4, "age_max": 8, "description": "test",
        "sensory_friendly_tags": ["quiet"], "interests": ["nature"], "max_children": 6,
    }
    r = requests.post(f"{BASE_URL}/api/playdates", headers=_h(demo["access_token"]), json=body)
    assert r.status_code == 200
    return r.json()


# ---------- Playdate RSVP Queue ----------

class TestPlaydateJoinQueue:
    def test_join_creates_pending_request(self, demo):
        # Use pd-soccer where demo is not host or attendee
        r = requests.post(f"{BASE_URL}/api/playdates/pd-soccer/join", headers=_h(demo["access_token"]))
        assert r.status_code == 200, r.text
        status = r.json()["status"]
        assert status in ("requested", "already_pending", "already_joined"), status

    def test_join_second_call_pending(self, demo):
        # After first call, next call should be 'already_pending' (or already_joined if approved during other test)
        r = requests.post(f"{BASE_URL}/api/playdates/pd-soccer/join", headers=_h(demo["access_token"]))
        assert r.status_code == 200
        assert r.json()["status"] in ("already_pending", "already_joined")

    def test_join_playdate_not_auto_added(self, demo, parent2):
        # parent2 joins pd-art (they are not host, not attendee)
        r = requests.post(f"{BASE_URL}/api/playdates/pd-art/join", headers=_h(parent2["access_token"]))
        assert r.status_code == 200
        assert r.json()["status"] in ("requested", "already_pending")
        # Verify user is NOT in attendee_family_ids
        pd = requests.get(f"{BASE_URL}/api/playdates/pd-art", headers=_h(parent2["access_token"])).json()
        assert parent2["user_id"] not in pd.get("attendee_family_ids", [])
        assert pd["request_status"] == "pending"
        assert pd["is_host"] is False

    def test_host_cannot_join_own(self, demo, host_playdate):
        r = requests.post(f"{BASE_URL}/api/playdates/{host_playdate['id']}/join", headers=_h(demo["access_token"]))
        assert r.status_code == 400


class TestPlaydateRequestsList:
    def test_non_host_gets_403(self, demo, host_playdate, parent2):
        # parent2 requests to join demo's playdate
        requests.post(f"{BASE_URL}/api/playdates/{host_playdate['id']}/join", headers=_h(parent2["access_token"]))
        r = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}/requests", headers=_h(parent2["access_token"]))
        assert r.status_code == 403

    def test_host_sees_pending_requests(self, demo, host_playdate, parent2):
        # ensure parent2 has a pending request on host_playdate
        requests.post(f"{BASE_URL}/api/playdates/{host_playdate['id']}/join", headers=_h(parent2["access_token"]))
        r = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}/requests", headers=_h(demo["access_token"]))
        assert r.status_code == 200
        reqs = r.json()
        assert len(reqs) >= 1
        first = reqs[0]
        assert "family" in first
        assert "match_score" in first
        assert "match_reasons" in first
        assert isinstance(first["match_reasons"], list)
        assert first["status"] == "pending"

    def test_pending_count_visible_to_host(self, demo, host_playdate):
        pd = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}", headers=_h(demo["access_token"])).json()
        assert pd["is_host"] is True
        assert pd["request_status"] == "host"
        assert pd.get("pending_requests_count", 0) >= 1


class TestApproveDecline:
    def test_approve_adds_attendee(self, demo, host_playdate, parent2):
        # Get requests, find parent2's
        reqs = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}/requests", headers=_h(demo["access_token"])).json()
        target = next((rq for rq in reqs if rq["user_id"] == parent2["user_id"]), None)
        if not target:
            # create pending
            requests.post(f"{BASE_URL}/api/playdates/{host_playdate['id']}/join", headers=_h(parent2["access_token"]))
            reqs = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}/requests", headers=_h(demo["access_token"])).json()
            target = next(rq for rq in reqs if rq["user_id"] == parent2["user_id"])

        r = requests.post(f"{BASE_URL}/api/playdates/{host_playdate['id']}/requests/{target['id']}/approve",
                          headers=_h(demo["access_token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "approved"

        # Verify attendee added via GET
        pd = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}", headers=_h(demo["access_token"])).json()
        assert parent2["user_id"] in pd["attendee_family_ids"]

        # parent2 sees status=approved
        pd2 = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}", headers=_h(parent2["access_token"])).json()
        assert pd2["request_status"] == "approved"
        assert pd2["joined"] is True

    def test_decline_does_not_add_attendee(self, demo, host_playdate):
        # Create a fresh throwaway parent
        p3 = _auth(f"TEST_p3_{uuid.uuid4().hex[:6]}@test.com", "password123")
        requests.post(f"{BASE_URL}/api/playdates/{host_playdate['id']}/join", headers=_h(p3["access_token"]))
        reqs = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}/requests", headers=_h(demo["access_token"])).json()
        target = next(rq for rq in reqs if rq["user_id"] == p3["user_id"])
        r = requests.post(f"{BASE_URL}/api/playdates/{host_playdate['id']}/requests/{target['id']}/decline",
                          headers=_h(demo["access_token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "declined"
        pd = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}", headers=_h(demo["access_token"])).json()
        assert p3["user_id"] not in pd["attendee_family_ids"]
        # p3 sees declined
        pd3 = requests.get(f"{BASE_URL}/api/playdates/{host_playdate['id']}", headers=_h(p3["access_token"])).json()
        assert pd3["request_status"] == "declined"


# ---------- Chat Request flows ----------

class TestChatRequests:
    def test_create_thread_request(self, demo):
        body = {"target_family_id": "fam-sarah", "opening_message": "Hi! TEST opener"}
        r = requests.post(f"{BASE_URL}/api/threads/request", headers=_h(demo["access_token"]), json=body)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("requested", "exists")
        tid = data["thread_id"]
        # verify thread
        t = requests.get(f"{BASE_URL}/api/threads/{tid}", headers=_h(demo["access_token"])).json()
        assert t["status"] in ("requested", "active")  # active only if the other side already accepted
        assert t["is_initiator"] is True
        assert any(m["text"] == "Hi! TEST opener" for m in t["messages"])
        return tid

    def test_duplicate_returns_exists(self, demo):
        body = {"target_family_id": "fam-sarah", "opening_message": "second call"}
        r1 = requests.post(f"{BASE_URL}/api/threads/request", headers=_h(demo["access_token"]), json=body)
        r2 = requests.post(f"{BASE_URL}/api/threads/request", headers=_h(demo["access_token"]), json=body)
        assert r2.status_code == 200
        assert r2.json()["status"] == "exists"
        assert r1.json()["thread_id"] == r2.json()["thread_id"]

    def test_send_blocked_on_requested(self, demo):
        # Create fresh request to a new family so status is 'requested'
        body = {"target_family_id": "fam-james", "opening_message": "TEST hi james"}
        r = requests.post(f"{BASE_URL}/api/threads/request", headers=_h(demo["access_token"]), json=body)
        tid = r.json()["thread_id"]
        # send message should 400 if requested
        t = requests.get(f"{BASE_URL}/api/threads/{tid}", headers=_h(demo["access_token"])).json()
        if t["status"] == "requested":
            r2 = requests.post(f"{BASE_URL}/api/threads/{tid}/messages",
                               headers=_h(demo["access_token"]), json={"text": "blocked"})
            assert r2.status_code == 400

    def test_accept_flips_status(self, demo, parent2):
        # parent2 sends chat request to demo's family (demo id: demo-user-1)
        body = {"target_family_id": "demo-user-1", "opening_message": "TEST from parent2"}
        r = requests.post(f"{BASE_URL}/api/threads/request", headers=_h(parent2["access_token"]), json=body)
        assert r.status_code == 200
        tid = r.json()["thread_id"]
        # demo (recipient) accepts
        r2 = requests.post(f"{BASE_URL}/api/threads/{tid}/accept", headers=_h(demo["access_token"]))
        assert r2.status_code == 200
        assert r2.json()["status"] == "active"
        # verify
        t = requests.get(f"{BASE_URL}/api/threads/{tid}", headers=_h(demo["access_token"])).json()
        assert t["status"] == "active"
        # send now works
        r3 = requests.post(f"{BASE_URL}/api/threads/{tid}/messages",
                           headers=_h(demo["access_token"]), json={"text": "TEST hi back"})
        assert r3.status_code == 200

    def test_initiator_cannot_accept(self, demo):
        body = {"target_family_id": "fam-emma", "opening_message": "TEST cant accept my own"}
        r = requests.post(f"{BASE_URL}/api/threads/request", headers=_h(demo["access_token"]), json=body)
        tid = r.json()["thread_id"]
        r2 = requests.post(f"{BASE_URL}/api/threads/{tid}/accept", headers=_h(demo["access_token"]))
        # If status was already active (thread previously existed), backend still tries to flip; but rule blocks initiator
        # Some seeded threads may be shared but this thread was created by demo, so demo is initiator -> 400
        assert r2.status_code == 400

    def test_decline_flow(self, parent2, demo):
        body = {"target_family_id": "demo-user-1", "opening_message": "TEST to decline"}
        # Use unique family — re-use parent2 -> demo; existing may return 'exists' active
        r = requests.post(f"{BASE_URL}/api/threads/request", headers=_h(parent2["access_token"]), json=body)
        tid = r.json()["thread_id"]
        # demo declines
        r2 = requests.post(f"{BASE_URL}/api/threads/{tid}/decline", headers=_h(demo["access_token"]))
        assert r2.status_code == 200
        t = requests.get(f"{BASE_URL}/api/threads/{tid}", headers=_h(demo["access_token"])).json()
        assert t["status"] == "declined"


class TestThreadsList:
    def test_threads_have_status_and_is_initiator(self, demo):
        r = requests.get(f"{BASE_URL}/api/threads", headers=_h(demo["access_token"]))
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        for t in items:
            assert "status" in t
            assert "is_initiator" in t
        # Seeded thread th-sarah exists with default active
        sarah = next((t for t in items if t["id"] == "th-sarah"), None)
        assert sarah is not None
        assert sarah["status"] == "active"


class TestRegression:
    def test_seeded_thread_send(self, demo):
        r = requests.post(f"{BASE_URL}/api/threads/th-sarah/messages",
                          headers=_h(demo["access_token"]), json={"text": "TEST regression"})
        assert r.status_code == 200

    def test_block_still_works(self, demo):
        r = requests.post(f"{BASE_URL}/api/safety/block", headers=_h(demo["access_token"]),
                          json={"target_family_id": "fam-lisa"})
        assert r.status_code == 200
        # unblock
        r2 = requests.post(f"{BASE_URL}/api/safety/unblock", headers=_h(demo["access_token"]),
                           json={"target_family_id": "fam-lisa"})
        assert r2.status_code == 200

    def test_create_playdate_still_works(self, demo):
        body = {
            "title": f"TEST_regression_{uuid.uuid4().hex[:6]}",
            "category": "park", "location": "x", "date": "2026-08-01",
            "start_time": "10 AM", "end_time": "11 AM",
            "age_min": 3, "age_max": 6,
        }
        r = requests.post(f"{BASE_URL}/api/playdates", headers=_h(demo["access_token"]), json=body)
        assert r.status_code == 200
        assert r.json()["id"].startswith("pd-")
