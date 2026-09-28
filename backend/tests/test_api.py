import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data

@pytest.mark.asyncio
async def test_facilities_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/facilities")
    assert response.status_code == 200
    facilities = response.json()
    assert len(facilities) >= 15
    assert any(f["emergency_available"] is True for f in facilities)

@pytest.mark.asyncio
async def test_schemes_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/schemes")
    assert response.status_code == 200
    schemes = response.json()
    assert len(schemes) >= 8
    assert any("Ayushman" in s["name"] for s in schemes)

@pytest.mark.asyncio
async def test_wellness_topics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/wellness/topics")
    assert response.status_code == 200
    topics = response.json()
    assert len(topics) == 10

@pytest.mark.asyncio
async def test_chat_emergency_short_circuit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={"message": "Severe crushing chest pain can't breathe"})
    assert response.status_code == 200
    data = response.json()
    assert data["is_emergency"] is True
    assert data["urgency_level"] == 4
    assert "CRITICAL MEDICAL EMERGENCY ALERT" in data["assistant_message"]["content"]

@pytest.mark.asyncio
async def test_chat_symptom_inquiry():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={"message": "I have had a throbbing migraine for 2 hours"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "symptom_check"
    assert data["urgency_level"] in [1, 2, 3]
    assert data["disclaimer"] != ""
