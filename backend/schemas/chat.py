from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessageCreate(BaseModel):
    session_id: Optional[int] = None
    message: str = Field(..., min_length=1, description="User health query or message")

class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    intent_tag: Optional[str] = None
    urgency_level: Optional[int] = None
    is_emergency: bool = False
    suggested_actions: Optional[List[str]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Consultation"

class ChatSessionOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class ChatResponse(BaseModel):
    session_id: int
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut
    intent: str
    is_emergency: bool
    urgency_level: int
    recommended_specialist: Optional[str] = None
    suggested_actions: List[str] = []
    disclaimer: str
    facilities: Optional[List[Dict[str, Any]]] = None
    schemes: Optional[List[Dict[str, Any]]] = None
