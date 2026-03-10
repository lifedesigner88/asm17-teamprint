def test_signup_login_me_and_logout_flow(client):
    signup_response = client.post(
        "/auth/signup",
        json={"user_id": "alice", "password": "strong-pass-123"},
    )
    assert signup_response.status_code == 201
    assert signup_response.json()["user_id"] == "alice"
    assert signup_response.json()["is_admin"] is False

    login_response = client.post(
        "/auth/login",
        json={"user_id": "alice", "password": "strong-pass-123"},
    )
    assert login_response.status_code == 200
    assert login_response.json() == {"user_id": "alice", "is_admin": False}
    assert "pm_access_token" in login_response.cookies

    me_response = client.get("/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user_id"] == "alice"
    assert me_response.json()["is_admin"] is False

    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 204

    me_after_logout = client.get("/auth/me")
    assert me_after_logout.status_code == 401
