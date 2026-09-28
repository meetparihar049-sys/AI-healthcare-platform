import json
from pathlib import Path
from typing import List, Dict, Any, Optional

FACILITIES_FILE = Path(__file__).resolve().parent.parent / "data" / "facilities.json"

class FacilityService:
    def __init__(self):
        self._facilities: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if FACILITIES_FILE.exists():
            with open(FACILITIES_FILE, "r", encoding="utf-8") as f:
                self._facilities = json.load(f)
        else:
            self._facilities = []

    def get_all(
        self,
        facility_type: Optional[str] = None,
        cost_tier: Optional[str] = None,
        emergency_only: bool = False,
        specialization: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        results = self._facilities

        if facility_type and facility_type.lower() != "all":
            results = [f for f in results if f.get("type", "").lower() == facility_type.lower()]

        if cost_tier and cost_tier.lower() != "all":
            results = [f for f in results if f.get("cost_tier", "").lower() == cost_tier.lower()]

        if emergency_only:
            results = [f for f in results if f.get("emergency_available", False)]

        if specialization:
            spec_lower = specialization.lower()
            results = [
                f for f in results 
                if any(spec_lower in s.lower() for s in f.get("specializations", []))
            ]

        if search:
            query = search.lower()
            results = [
                f for f in results
                if query in f.get("name", "").lower() 
                or query in f.get("address", "").lower()
                or any(query in s.lower() for s in f.get("specializations", []))
            ]

        return results

    def get_by_id(self, facility_id: str) -> Optional[Dict[str, Any]]:
        for f in self._facilities:
            if f.get("id") == facility_id:
                return f
        return None

facility_service = FacilityService()
