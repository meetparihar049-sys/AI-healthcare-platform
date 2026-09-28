from typing import Dict, Any, List, Optional
import json
import re
from backend.ai.safety_triage import UNIVERSAL_DISCLAIMER

def extract_specialist(text: str) -> Optional[str]:
    """Extracts specialist mention from generated response if present."""
    specialists = [
        "Cardiologist", "Neurologist", "Orthopedist", "Dermatologist", 
        "Pediatrician", "Gastroenterologist", "Pulmonologist", "Psychiatrist",
        "Ophthalmologist", "ENT Specialist", "Endocrinologist", "Gynecologist",
        "General Physician", "Urgent Care Doctor", "Nephrologist", "Oncologist"
    ]
    for spec in specialists:
        if re.search(rf"\b{re.escape(spec)}\b", text, re.IGNORECASE):
            return spec
    return "General Physician"

def extract_urgency(text: str, default_urgency: int = 2) -> int:
    """Detects urgency level mentioned in text (Level 1 to 4)."""
    # Check for explicit Level 1, 2, 3, or 4 mentions (including markdown like **Level 2**)
    explicit_match = re.search(r"(?:urgency\s+level|level)[\*:\s]+(?:level\s+)?\*?([1-4])\b", text, re.IGNORECASE)
    if explicit_match:
        try:
            return int(explicit_match.group(1))
        except ValueError:
            pass

    # Check for explicit urgency phrases in main body (excluding universal disclaimer)
    body_text = text.split("---")[0].lower() if "---" in text else text.lower()
    if re.search(r"\b(immediate\s+emergency|go\s+to\s+the\s+er|call\s+(?:112|108|ambulance))\b", body_text):
        return 4
    if re.search(r"\b(urgent\s+care|see\s+a\s+doctor\s+today|urgent\s+medical\s+attention)\b", body_text):
        return 3
    if re.search(r"\b(routine\s+medical|few\s+days|schedule\s+an\s+appointment)\b", body_text):
        return 2
    if re.search(r"\b(monitor\s+at\s+home|self-care|rest\s+and\s+hydrate)\b", body_text):
        return 1

    return default_urgency

def generate_suggested_actions(intent: str, urgency: int) -> List[str]:
    """Generates context-aware interactive suggestion chips."""
    if urgency == 4:
        return [
            "Call Emergency Services (112 / 108)",
            "Find Closest Emergency ER",
            "What to do while waiting for ambulance"
        ]
    
    if intent == "symptom_check":
        return [
            "Find nearest recommended clinic",
            "What questions should I ask my doctor?",
            "What red flags mean I should go to ER?",
            "Check available government schemes"
        ]
    elif intent == "doctor_recommendation":
        return [
            "Find clinics with this specialist",
            "What tests might they order?",
            "How should I prepare for my appointment?"
        ]
    elif intent == "facility_finder":
        return [
            "Show free / government facilities only",
            "Show facilities open 24/7",
            "Tell me about public health insurance for these"
        ]
    elif intent == "scheme_advisor":
        return [
            "How do I apply with an Aadhaar card?",
            "What hospitals accept PM-JAY near me?",
            "Are generic medicines covered under Jan Aushadhi?"
        ]
    elif intent == "report_explanation":
        return [
            "What doctor should review this report?",
            "What diet changes could improve these numbers?",
            "Explain the abnormal values in detail"
        ]
    elif intent == "preventive_guidance":
        return [
            "What annual checkups are recommended for my age?",
            "Nutrition tips for disease prevention",
            "Recommended adult vaccine checklist"
        ]
    else:
        return [
            "Check my symptoms",
            "Find nearby hospitals",
            "Explore government health schemes",
            "Preventive wellness advice"
        ]

def format_ai_response(
    response_text: str,
    intent: str,
    is_emergency: bool = False,
    override_urgency: Optional[int] = None,
    facilities: Optional[List[Dict[str, Any]]] = None,
    schemes: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """Formats the raw AI output into a standardized, safe, structured payload."""
    urgency = override_urgency if override_urgency is not None else extract_urgency(response_text)
    if is_emergency:
        urgency = 4
        
    specialist = extract_specialist(response_text)
    suggested_actions = generate_suggested_actions(intent, urgency)
    
    # Ensure disclaimer is attached if not already in text
    clean_text = response_text.strip()
    if "This information is for general health" not in clean_text:
        clean_text = f"{clean_text}\n\n---\n**Disclaimer:** {UNIVERSAL_DISCLAIMER}"

    return {
        "response_text": clean_text,
        "intent": intent,
        "is_emergency": is_emergency or urgency == 4,
        "urgency_level": urgency,
        "recommended_specialist": specialist,
        "suggested_actions": suggested_actions,
        "disclaimer": UNIVERSAL_DISCLAIMER,
        "facilities": facilities,
        "schemes": schemes
    }
