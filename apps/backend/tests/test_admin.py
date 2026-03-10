def login(client, user_id: str, password: str):
    return client.post("/auth/login", json={"user_id": user_id, "password": password})


def test_admin_users_requires_admin_session(client):
    client.post("/auth/signup", json={"user_id": "alice", "password": "strong-pass-123"})
    login(client, "alice", "strong-pass-123")

    response = client.get("/admin/users")

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin only"


def test_admin_users_returns_seeded_admin_and_recent_users(client):
    client.post("/auth/signup", json={"user_id": "alice", "password": "strong-pass-123"})
    login(client, "admin", "Admin#2026!Mirror")

    response = client.get("/admin/users")

    assert response.status_code == 200
    user_ids = [user["user_id"] for user in response.json()]
    assert "admin" in user_ids
    assert "alice" in user_ids
