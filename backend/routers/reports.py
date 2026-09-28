from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import json

from backend.core.database import get_db
from backend.services.auth_service import get_current_user
from backend.models import User, UploadedReport
from backend.schemas.report import ReportAnalysisResponse, ReportOut
from backend.services.ocr_service import ocr_service
from backend.ai.modules.report_module import explain_report
from backend.ai.safety_triage import UNIVERSAL_DISCLAIMER

router = APIRouter(prefix="/reports", tags=["Medical Reports Explainer"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

@router.post("/upload", response_model=ReportAnalysisResponse)
async def upload_report(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Uploads a medical diagnostic report (PDF or Image) and produces plain-language AI explanation."""
    filename = file.filename or "medical_report"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Please upload PDF, PNG, JPG, or WEBP."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum permitted limit of 10MB."
        )

    # Extract text using dual strategy (fast digital PDF first, OCR fallback second)
    extracted_text, method = ocr_service.extract_text(
        file_bytes=file_bytes,
        filename=filename,
        content_type=file.content_type or ""
    )

    # Analyze extracted text with Clinical AI
    analysis = await explain_report(extracted_text=extracted_text, filename=filename)

    report_id = 1
    if current_user:
        db_report = UploadedReport(
            user_id=current_user.id,
            filename=filename,
            file_type=ext.replace(".", ""),
            extracted_text=extracted_text,
            ai_explanation=analysis["plain_language_explanation"],
            findings_summary=json.dumps({
                "abnormal": analysis["abnormal_findings"],
                "normal": analysis["normal_findings"],
                "doc_type": analysis["document_type"]
            })
        )
        db.add(db_report)
        await db.commit()
        await db.refresh(db_report)
        report_id = db_report.id

    return ReportAnalysisResponse(
        report_id=report_id,
        filename=filename,
        extracted_text_preview=analysis["extracted_text_preview"],
        document_type=analysis["document_type"],
        abnormal_findings=analysis["abnormal_findings"],
        normal_findings=analysis["normal_findings"],
        plain_language_explanation=analysis["plain_language_explanation"],
        recommended_doctor_questions=analysis["recommended_doctor_questions"],
        urgency_level=analysis["urgency_level"],
        disclaimer=UNIVERSAL_DISCLAIMER
    )

@router.get("", response_model=List[ReportOut])
async def list_reports(
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves uploaded report history for the authenticated user."""
    if not current_user:
        return []
    
    result = await db.execute(
        select(UploadedReport)
        .where(UploadedReport.user_id == current_user.id)
        .order_by(UploadedReport.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves specific report analysis."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    result = await db.execute(
        select(UploadedReport)
        .where(UploadedReport.id == report_id, UploadedReport.user_id == current_user.id)
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report
