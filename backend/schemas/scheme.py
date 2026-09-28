from pydantic import BaseModel
from typing import List, Optional

class Scheme(BaseModel):
    id: str
    name: str
    administering_body: str
    eligibility_criteria: List[str]
    benefits: str
    how_to_apply: str
    official_link: str
    coverage_amount: Optional[str] = None
    target_demographics: List[str]  # e.g., low_income, women, children, seniors, all
    state_scope: str  # National or state name

class SchemeFilter(BaseModel):
    state: Optional[str] = None
    target_demographic: Optional[str] = None
    search: Optional[str] = None
