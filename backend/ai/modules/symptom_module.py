from typing import Dict, Any, List
from backend.ai.llm_client import llm_client
from backend.ai.prompt_builder import build_system_prompt
from backend.ai.response_formatter import format_ai_response

async def analyze_symptoms(message: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """Analyzes symptoms using clinical safety guidelines and returns structured triage advice."""
    messages = []
    if history:
        messages.extend(history[-6:])
    messages.append({"role": "user", "content": message})
    
    system_prompt = build_system_prompt("symptom_check")
    raw_response = await llm_client.generate_response(system_prompt, messages, intent="symptom_check")
    
    return format_ai_response(raw_response, intent="symptom_check")
