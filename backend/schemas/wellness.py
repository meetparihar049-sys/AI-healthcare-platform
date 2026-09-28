from pydantic import BaseModel
from typing import List, Optional

class WellnessTopic(BaseModel):
    id: str
    title: str
    domain: str  # nutrition, mental_health, vaccination, heart_health, sleep, etc.
    summary: str
    tips: List[str]
    suggested_chat_prompt: str
    screening_guidance: Optional[str] = None
    icon: str
