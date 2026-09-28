from typing import Dict, Any, List
from backend.ai.llm_client import llm_client
from backend.ai.prompt_builder import build_system_prompt
from backend.ai.response_formatter import format_ai_response

async def advise_schemes(message: str, schemes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates AI guidance on government schemes with relevant matches."""
    scheme_lines = []
    for s in schemes[:6]:
        scheme_lines.append(f"- {s['name']}: {s['benefits']} (Eligibility: {', '.join(s['eligibility_criteria'][:2])})")
    schemes_summary = "\n".join(scheme_lines)

    system_prompt = build_system_prompt("scheme_advisor", {"schemes_summary": schemes_summary})
    messages = [{"role": "user", "content": message}]
    
    raw_response = await llm_client.generate_response(system_prompt, messages, intent="scheme_advisor")
    return format_ai_response(raw_response, intent="scheme_advisor", schemes=schemes[:3])
