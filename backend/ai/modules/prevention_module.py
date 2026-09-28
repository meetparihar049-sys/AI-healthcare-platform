from typing import Dict, Any, List
from backend.ai.llm_client import llm_client
from backend.ai.prompt_builder import build_system_prompt
from backend.ai.response_formatter import format_ai_response

async def generate_prevention_guidance(query: str) -> Dict[str, Any]:
    """Generates evidence-based preventive health recommendations."""
    system_prompt = build_system_prompt("preventive_guidance")
    messages = [{"role": "user", "content": query}]
    
    raw_response = await llm_client.generate_response(system_prompt, messages, intent="preventive_guidance")
    return format_ai_response(raw_response, intent="preventive_guidance", override_urgency=1)
