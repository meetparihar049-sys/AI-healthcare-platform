from typing import Dict, Any, List
from backend.ai.llm_client import llm_client
from backend.ai.prompt_builder import build_system_prompt
from backend.ai.response_formatter import format_ai_response

async def recommend_facilities(message: str, facilities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates AI guidance on facility navigation enriched with mock data."""
    # Build text summary of top 5 relevant facilities
    summary_lines = []
    for f in facilities[:6]:
        summary_lines.append(f"- {f['name']} ({f['type']}, Cost: {f['cost_tier']}, Emergency: {'Yes' if f['emergency_available'] else 'No'})")
    facilities_summary = "\n".join(summary_lines)

    system_prompt = build_system_prompt("facility_finder", {"facilities_summary": facilities_summary})
    messages = [{"role": "user", "content": message}]
    
    raw_response = await llm_client.generate_response(system_prompt, messages, intent="facility_finder")
    return format_ai_response(raw_response, intent="facility_finder", facilities=facilities[:4])
