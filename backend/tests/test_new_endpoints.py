"""Tests for new endpoints: forum, resources, threads, notifications."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@waddleplay.com"
DEMO_PW = "password123"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PW}, timeout=15)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestForum:
    def test_list_returns_5(self, headers):
        r = requests.get(f"{API}/forum", headers=headers, timeout=15)
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) == 5
        keys = {"id", "author_name", "title", "topic", "replies", "hours_ago"}
        assert keys.issubset(posts[0].keys())

    def test_get_single_post(self, headers):
        r = requests.get(f"{API}/forum/fp-1", headers=headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == "fp-1"


class TestResources:
    def test_list_returns_5(self, headers):
        r = requests.get(f"{API}/resources", headers=headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 5
        kinds = {i["kind"] for i in items}
        assert kinds & {"article", "guide", "video"}
        assert any(i["featured"] is True for i in items)


class TestThreads:
    def test_list_returns_4_with_unread(self, headers):
        r = requests.get(f"{API}/threads", headers=headers, timeout=15)
        assert r.status_code == 200
        threads = r.json()
        assert len(threads) == 4
        t = threads[0]
        assert {"id", "name", "last", "unread", "messages"}.issubset(t.keys())

    def test_get_thread_messages(self, headers):
        r = requests.get(f"{API}/threads/th-sarah", headers=headers, timeout=15)
        assert r.status_code == 200
        t = r.json()
        assert isinstance(t["messages"], list)
        assert len(t["messages"]) >= 2

    def test_send_message_appends_and_resets_unread(self, headers):
        # get before
        before = requests.get(f"{API}/threads/th-lisa", headers=headers, timeout=15).json()
        n_before = len(before["messages"])

        r = requests.post(f"{API}/threads/th-lisa/messages", headers=headers,
                          json={"text": "TEST_message from pytest"}, timeout=15)
        assert r.status_code == 200
        m = r.json()["message"]
        assert m["from"] == "me" and m["text"] == "TEST_message from pytest"

        # verify persisted + unread=0
        after = requests.get(f"{API}/threads/th-lisa", headers=headers, timeout=15).json()
        assert len(after["messages"]) == n_before + 1
        assert after["messages"][-1]["text"] == "TEST_message from pytest"
        assert after["unread"] == 0
        assert after["last"] == "TEST_message from pytest"


class TestNotifications:
    def test_list_returns_5(self, headers):
        r = requests.get(f"{API}/notifications", headers=headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 5
        assert {"id", "title", "body", "unread", "icon"}.issubset(items[0].keys())

    def test_read_all_marks_read(self, headers):
        r = requests.post(f"{API}/notifications/read-all", headers=headers, timeout=15)
        assert r.status_code == 200
        # verify
        items = requests.get(f"{API}/notifications", headers=headers, timeout=15).json()
        assert all(i["unread"] is False for i in items)


class TestProfileUpdatePersistence:
    def test_update_then_get(self, headers):
        payload = {"bio": "TEST_updated bio", "location": "TEST_loc", "interests": ["nature", "books"]}
        r = requests.put(f"{API}/profile/me", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["bio"] == "TEST_updated bio"
        assert d["location"] == "TEST_loc"
        # confirm GET returns it
        g = requests.get(f"{API}/profile/me", headers=headers, timeout=15).json()
        assert g["bio"] == "TEST_updated bio"
