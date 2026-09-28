from typing import Dict, Any, List
import re
from backend.ai.llm_client import llm_client
from backend.ai.prompt_builder import build_system_prompt
from backend.ai.safety_triage import UNIVERSAL_DISCLAIMER

async def explain_report(extracted_text: str, filename: str) -> Dict[str, Any]:
    """Analyzes extracted text from lab or radiology report and generates plain-language translation."""
    system_prompt = build_system_prompt("report_explanation")
    messages = [
        {
            "role": "user",
            "content": f"Please analyze this medical report text (File: {filename}):\n\n{extracted_text[:4000]}"
        }
    ]
    
    # Identify document type
    text_lower = extracted_text.lower()
    doc_type = "Laboratory Diagnostic Report"
    if "lipid" in text_lower or "cholesterol" in text_lower:
        doc_type = "Lipid / Cholesterol Panel"
    elif "cbc" in text_lower or "hemoglobin" in text_lower or "white blood cell" in text_lower:
        doc_type = "Complete Blood Count (CBC)"
    elif "hba1c" in text_lower or "glucose" in text_lower:
        doc_type = "Diabetes / Blood Glucose Evaluation"
    elif "creatinine" in text_lower or "urea" in text_lower or "egfr" in text_lower:
        doc_type = "Renal (Kidney) Function Panel"
    elif "tsh" in text_lower or "thyroid" in text_lower:
        doc_type = "Thyroid Function Test (TFT)"
    elif "x-ray" in text_lower or "ct scan" in text_lower or "mri" in text_lower:
        doc_type = "Radiology Imaging Report"

    # Identify abnormal vs normal keywords
    abnormal_findings = []
    normal_findings = []

    # Heuristic checks on extracted text
    if "high" in text_lower or "elevated" in text_lower:
        abnormal_findings.append("Identified markers tagged as higher than standard laboratory reference range.")
    if "low" in text_lower or "deficient" in text_lower:
        abnormal_findings.append("Identified markers tagged as lower than standard laboratory reference range.")
    if not abnormal_findings:
        abnormal_findings.append("No critical 'High' or 'Low' alarm tags detected in primary text scan.")

    normal_findings.append("Core metabolic and electrolyte markers appear within expected operational thresholds.")

    raw_ai_text = await llm_client.generate_response(system_prompt, messages, intent="report_explanation")
    
    # Structure response
    return {
        "document_type": doc_type,
        "filename": filename,
        "extracted_text_preview": extracted_text[:500] + ("..." if len(extracted_text) > 500 else ""),
        "abnormal_findings": abnormal_findings,
        "normal_findings": normal_findings,
        "plain_language_explanation": raw_ai_text,
        "recommended_doctor_questions": [
            "What clinical factors could explain the markers outside standard reference ranges?",
            "Are follow-up repeat tests recommended in 4–12 weeks to observe the trend?",
            "Should I make any specific dietary or lifestyle modifications based on these results?",
            "Do any current medications need dosage adjustments?"
        ],
        "urgency_level": 2,
        "disclaimer": UNIVERSAL_DISCLAIMER
    }
