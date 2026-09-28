import pytest
from backend.ai.safety_triage import check_emergency_triage

def test_emergency_chest_pain():
    result = check_emergency_triage("I am having severe crushing chest pain and shortness of breath")
    assert result is not None
    assert result["is_emergency"] is True
    assert result["urgency_level"] == 4
    assert "CRITICAL MEDICAL EMERGENCY ALERT" in result["response_text"]
    assert any("112" in h["number"] or "911" in h["number"] for h in result["hotlines"])

def test_emergency_stroke():
    result = check_emergency_triage("My father has sudden facial droop and slurred speech")
    assert result is not None
    assert result["is_emergency"] is True
    assert result["urgency_level"] == 4

def test_emergency_mental_health_crisis():
    result = check_emergency_triage("I want to end my life, please help")
    assert result is not None
    assert result["is_emergency"] is True
    assert "Tele-MANAS" in result["response_text"]
    assert "988" in result["response_text"]

def test_informational_query_no_lockout():
    # Educational question about chest pain should NOT trigger emergency lockout
    result = check_emergency_triage("What are the common causes of chest pain in adults?")
    assert result is None

def test_routine_symptom_no_lockout():
    result = check_emergency_triage("I have had a mild headache and runny nose since yesterday")
    assert result is None
