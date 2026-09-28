import json
from pathlib import Path
from typing import List, Dict, Any, Optional

SCHEMES_FILE = Path(__file__).resolve().parent.parent / "data" / "schemes.json"

class SchemeService:
    def __init__(self):
        self._schemes: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if SCHEMES_FILE.exists():
            with open(SCHEMES_FILE, "r", encoding="utf-8") as f:
                self._schemes = json.load(f)
        else:
            self._schemes = []

    def get_all(
        self,
        demographic: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        results = self._schemes

        if demographic and demographic.lower() != "all":
            demo_lower = demographic.lower()
            results = [
                s for s in results 
                if demo_lower in [d.lower() for d in s.get("target_demographics", [])] or "all" in s.get("target_demographics", [])
            ]

        if search:
            query = search.lower()
            results = [
                s for s in results
                if query in s.get("name", "").lower()
                or query in s.get("benefits", "").lower()
                or any(query in c.lower() for c in s.get("eligibility_criteria", []))
            ]

        return results

    def get_by_id(self, scheme_id: str) -> Optional[Dict[str, Any]]:
        for s in self._schemes:
            if s.get("id") == scheme_id:
                return s
        return None

scheme_service = SchemeService()
