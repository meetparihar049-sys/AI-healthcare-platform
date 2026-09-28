from pydantic import BaseModel
from typing import List, Optional

class Facility(BaseModel):
    id: str
    name: str
    type: str  # Government Hospital, Private Hospital, PHC, CHC, Clinic, Pharmacy, Telehealth
    cost_tier: str  # Free, Low, Moderate, High
    address: str
    phone: str
    emergency_available: bool
    specializations: List[str]
    lat: float
    lng: float
    operating_hours: str
    notes: Optional[str] = None

class FacilityFilter(BaseModel):
    type: Optional[str] = None
    cost_tier: Optional[str] = None
    emergency_only: Optional[bool] = False
    specialization: Optional[str] = None
    search: Optional[str] = None
