import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.main import app

@pytest.mark.asyncio
async def test_auth_registration_and_login():
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register new user
        reg_payload = {
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Test User",
            "age_group": "adult"
        }
        reg_resp = await ac.post("/api/v1/auth/register", json=reg_payload)
        assert reg_resp.status_code == 201
        reg_data = reg_resp.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["email"] == unique_email

        # Login with correct password
        login_resp = await ac.post("/api/v1/auth/login", json={
            "email": unique_email,
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        assert token

        # Login with bad password
        bad_login = await ac.post("/api/v1/auth/login", json={
            "email": unique_email,
            "password": "WrongPassword!"
        })
        assert bad_login.status_code == 401

        # Profile /me with token
        me_resp = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == unique_email
