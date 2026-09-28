from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportOut(BaseModel):
    id: int
    filename: str
    file_type: str
    created_at: datetime
    ai_explanation: Optional[str] = None
    findings_summary: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReportAnalysisResponse(BaseModel):
    report_id: int
    filename: str
    extracted_text_preview: str
    document_type: str
    abnormal_findings: List[str]
    normal_findings: List[str]
    plain_language_explanation: str
    recommended_doctor_questions: List[str]
    urgency_level: int
    disclaimer: str
