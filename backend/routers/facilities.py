from fastapi import APIRouter, Query, HTTPException, status
from typing import List, Optional
from backend.schemas.facility import Facility
from backend.services.facility_service import facility_service

router = APIRouter(prefix="/facilities", tags=["Facilities Directory"])

@router.get("", response_model=List[Facility])
async def list_facilities(
    type: Optional[str] = Query(None, description="Facility type (e.g. Government Hospital, Clinic, Pharmacy)"),
    cost_tier: Optional[str] = Query(None, description="Cost tier: Free, Low, Moderate, High"),
    emergency_only: bool = Query(False, description="Filter for facilities with 24/7 emergency care"),
    specialization: Optional[str] = Query(None, description="Specialty keyword (e.g. Cardiology, Pediatrics)"),
    search: Optional[str] = Query(None, description="General search term across name, address, specialties")
):
    """Retrieves filterable list of verified healthcare facilities."""
    return facility_service.get_all(
        facility_type=type,
        cost_tier=cost_tier,
        emergency_only=emergency_only,
        specialization=specialization,
        search=search
    )

@router.get("/{facility_id}", response_model=Facility)
async def get_facility(facility_id: str):
    """Retrieves detailed profile for a specific healthcare facility."""
    fac = facility_service.get_by_id(facility_id)
    if not fac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    return fac
