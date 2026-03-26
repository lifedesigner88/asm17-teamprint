def test_admin_users_requires_admin_session(user_session):
    client, _ = user_session()

    response = client.get("/admin/users")

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin only"


def test_admin_users_returns_seeded_admin_and_recent_users(signup_user, admin_session):
    client = admin_session
    signup_user()

    response = client.get("/admin/users")

    assert response.status_code == 200
    users = response.json()
    assert any(user["is_admin"] is True for user in users)
    assert any(user["email"] == "parksejong88@gmail.com" for user in users)
    assert any(user["email"] == "alice@example.com" for user in users)
