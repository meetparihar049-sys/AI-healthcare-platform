from fastapi import APIRouter, Query, HTTPException, status
from typing import List, Optional
from backend.schemas.scheme import Scheme
from backend.services.scheme_service import scheme_service

router = APIRouter(prefix="/schemes", tags=["Government Schemes"])

@router.get("", response_model=List[Scheme])
async def list_schemes(
    demographic: Optional[str] = Query(None, description="Demographic focus: low_income, women, children, seniors, all"),
    search: Optional[str] = Query(None, description="Keyword search in scheme name, benefits, or criteria")
):
    """Retrieves filterable list of government healthcare welfare schemes."""
    return scheme_service.get_all(demographic=demographic, search=search)

@router.get("/{scheme_id}", response_model=Scheme)
async def get_scheme(scheme_id: str):
    """Retrieves details of a specific government health scheme."""
    scheme = scheme_service.get_by_id(scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    return scheme
