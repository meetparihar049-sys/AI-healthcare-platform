import re
from typing import Dict, Any, Optional

EMERGENCY_PATTERNS = [
    # Cardiac / Chest pain
    r"\b(crushing|severe|radiating|sharp|heavy)\s+(chest\s+pain|chest\s+pressure|heart\s+pain)\b",
    r"\b(chest\s+pain|chest\s+tightness|chest\s+pressure)\b",
    r"\b(heart\s+attack|cardiac\s+arrest)\b",
    
    # Respiratory distress
    r"\b(can'?t\s+breathe|gasping\s+for\s+air|severe\s+shortness\s+of\s+breath|choking|difficulty\s+breathing)\b",
    r"\b(turning\s+blue|lips\s+turning\s+blue|cyanosis)\b",

    # Neurological / Stroke
    r"\b(stroke|facial\s+droop|slurred\s+speech|sudden\s+numbness|sudden\s+paralysis)\b",
    r"\b(unconscious|passed\s+out|unresponsive|fainted\s+and\s+not\s+waking)\b",
    r"\b(seizure|active\s+convulsions|status\s+epilepticus)\b",

    # Bleeding & Trauma
    r"\b(severe\s+bleeding|uncontrolled\s+bleeding|hemorrhage|coughing\s+up\s+blood|vomiting\s+blood)\b",
    r"\b(deep\s+stab|gunshot|head\s+trauma\s+loss\s+of\s+consciousness)\b",

    # Severe Allergy / Anaphylaxis
    r"\b(anaphylaxis|throat\s+closing|tongue\s+swelling|severe\s+allergic\s+reaction)\b",

    # Poisoning & Overdose
    r"\b(swallowed\s+poison|drank\s+bleach|overdosed|drug\s+overdose|swallowed\s+chemicals)\b",

    # Self-harm / Suicidal ideation
    r"\b(suicide|suicidal|want\s+to\s+end\s+my\s+life|kill\s+myself|end\s+it\s+all)\b",
]

# Informational query overrides (user is asking academic or general questions rather than experiencing immediate crisis)
INFORMATIONAL_PREFIXES = [
    r"^(what\s+is|what\s+are|define|explain|tell\s+me\s+about|how\s+to\s+prevent|difference\s+between|why\s+does)\b",
    r"\b(history\s+of\s+stroke|study\s+on|statistics\s+about)\b"
]

UNIVERSAL_DISCLAIMER = (
    "This information is for general health awareness and educational purposes only. "
    "It is not a medical diagnosis or treatment plan, and should never replace consultation "
    "with a qualified doctor or emergency medical professional."
)

HOTLINE_INFO = [
    {"name": "Emergency Medical Services (India)", "number": "112 / 108"},
    {"name": "Emergency Services (US/Canada)", "number": "911"},
    {"name": "Tele-MANAS National Mental Health Crisis Hotline", "number": "14416 / 1800-891-4416"},
    {"name": "988 Suicide & Crisis Lifeline (US)", "number": "988"}
]

def check_emergency_triage(user_message: str) -> Optional[Dict[str, Any]]:
    """
    Evaluates whether the user's message indicates an immediate, life-threatening medical emergency.
    Runs deterministically before any LLM inference to protect patient safety.
    """
    clean_msg = user_message.strip().lower()

    # Check if this is an explicitly informational/educational query
    for info_pat in INFORMATIONAL_PREFIXES:
        if re.search(info_pat, clean_msg):
            # Educational query: allow to proceed through normal AI flow with safety disclaimer
            return None

    # Check emergency indicators
    for pattern in EMERGENCY_PATTERNS:
        if re.search(pattern, clean_msg, re.IGNORECASE):
            is_mental_health = bool(re.search(r"\b(suicide|suicidal|kill\s+myself|end\s+my\s+life)\b", clean_msg))
            
            if is_mental_health:
                content = (
                    "🚨 **IMMEDIATE CRISIS SUPPORT ALERT** 🚨\n\n"
                    "If you or someone you know is struggling or in crisis, help is available right now. "
                    "You are not alone, and compassionate professionals are ready to listen and support you 24/7:\n\n"
                    "- **India (Tele-MANAS):** Call toll-free **14416** or **1800-891-4416**\n"
                    "- **Kiran Helpline (India):** Call **1800-599-0019**\n"
                    "- **US / Canada (Crisis Lifeline):** Call or text **988**\n"
                    "- **UK:** Call **111** or Samaritan hotline **116 123**\n"
                    "- **Emergency Services:** Call **112** (India/EU) or **911** (US)\n\n"
                    "Please reach out to one of these services immediately or contact someone you trust."
                )
            else:
                content = (
                    "🚨 **CRITICAL MEDICAL EMERGENCY ALERT** 🚨\n\n"
                    "Your symptoms indicate a potentially life-threatening medical situation requiring **immediate emergency care**.\n\n"
                    "**Immediate Actions:**\n"
                    "1. **Call Emergency Services immediately:**\n"
                    "   - **112** or **108** (India)\n"
                    "   - **911** (US / Canada)\n"
                    "   - **999** (UK) / **000** (Australia)\n"
                    "2. Do NOT drive yourself to the hospital; have an ambulance or someone else take you.\n"
                    "3. Rest in a safe, seated or semi-reclined position while emergency assistance is en route.\n"
                    "4. If experiencing chest pain, difficulty breathing, or severe trauma, alert someone nearby immediately.\n\n"
                    "This AI platform cannot treat emergencies. Please seek emergency medical care immediately."
                )

            return {
                "is_emergency": True,
                "urgency_level": 4,  # Level 4 = Emergency
                "intent": "emergency",
                "response_text": content,
                "suggested_actions": [
                    "Call Emergency Services (112 / 911)",
                    "Find Nearest Emergency Hospital",
                    "Notify Emergency Contact",
                    "Call Crisis Hotline"
                ],
                "hotlines": HOTLINE_INFO,
                "disclaimer": UNIVERSAL_DISCLAIMER
            }

    return None
