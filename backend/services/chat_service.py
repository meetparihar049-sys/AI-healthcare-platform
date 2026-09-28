import json
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.models import User, ChatSession, ChatMessage
from backend.ai.safety_triage import check_emergency_triage, UNIVERSAL_DISCLAIMER
from backend.ai.modules.symptom_module import analyze_symptoms
from backend.ai.modules.facility_module import recommend_facilities
from backend.ai.modules.scheme_module import advise_schemes
from backend.ai.modules.prevention_module import generate_prevention_guidance
from backend.ai.prompt_builder import build_system_prompt
from backend.ai.llm_client import llm_client
from backend.ai.response_formatter import format_ai_response
from backend.services.facility_service import facility_service
from backend.services.scheme_service import scheme_service

logger = logging.getLogger(__name__)

class ChatService:
    @staticmethod
    def classify_intent(message: str) -> str:
        """Determines clinical intent from keywords and query context."""
        msg = message.lower()
        if any(w in msg for w in [
            "symptom", "pain", "fever", "cough", "ache", "swollen", "nausea",
            "dizzy", "rash", "vomit", "sick", "hurts", "migraine", "headache",
            "fatigue", "tired", "bleeding", "infection", "cramp", "sore", "cold"
        ]):
            return "symptom_check"
        elif any(w in msg for w in ["hospital", "clinic", "doctor near me", "pharmacy", "urgent care", "phc", "chc", "facility", "where can i go"]):
            return "facility_finder"
        elif any(w in msg for w in ["scheme", "ayushman", "pmjay", "insurance", "government help", "subsidy", "bpl", "card", "free treatment", "benefit"]):
            return "scheme_advisor"
        elif any(w in msg for w in ["prevent", "diet", "nutrition", "exercise", "vaccine", "wellness", "sleep", "lifestyle", "blood pressure normal"]):
            return "preventive_guidance"
        elif any(w in msg for w in ["which doctor", "specialist", "see a cardiologist", "ent", "dermatologist", "neurologist", "what type of doctor"]):
            return "doctor_recommendation"
        return "general_health"

    async def process_chat_message(
        self,
        db: AsyncSession,
        user: Optional[User],
        message_text: str,
        session_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end chat orchestration:
        1. Safety triage check (emergency short-circuit)
        2. Session creation / retrieval
        3. Intent determination & context injection
        4. AI reasoning & response formatting
        5. Database message persistence
        """
        clean_text = message_text.strip()

        # Step 1: Emergency Triage Check (Short-circuit before LLM)
        emergency_triage = check_emergency_triage(clean_text)

        # Step 2: Session Management
        session = None
        if user:
            if session_id:
                res = await db.execute(
                    select(ChatSession)
                    .where(ChatSession.id == session_id, ChatSession.user_id == user.id)
                    .options(selectinload(ChatSession.messages))
                )
                session = res.scalars().first()

            if not session:
                # Auto-generate title from first 50 chars of query
                title = clean_text[:50].strip() or "Health Consultation"
                session = ChatSession(user_id=user.id, title=title)
                db.add(session)
                await db.commit()
                await db.refresh(session)

        # Step 3: Handle Emergency Short-Circuit
        if emergency_triage:
            assistant_text = emergency_triage["response_text"]
            urgency = emergency_triage["urgency_level"]
            intent = "emergency"
            is_emergency = True
            suggested_actions = emergency_triage["suggested_actions"]

            user_msg_db, assistant_msg_db = await self._save_messages(
                db=db,
                session=session,
                user_text=clean_text,
                assistant_text=assistant_text,
                intent=intent,
                urgency=urgency,
                is_emergency=is_emergency,
                suggested_actions=suggested_actions
            )

            return {
                "session_id": session.id if session else 0,
                "user_message": user_msg_db,
                "assistant_message": assistant_msg_db,
                "intent": intent,
                "is_emergency": True,
                "urgency_level": urgency,
                "recommended_specialist": "Emergency Medicine / ER Trauma Team",
                "suggested_actions": suggested_actions,
                "disclaimer": UNIVERSAL_DISCLAIMER,
                "facilities": facility_service.get_all(emergency_only=True)[:3],
                "schemes": []
            }

        # Step 4: Normal Clinical Flow
        intent = self.classify_intent(clean_text)
        
        # Build history context safely
        history = []
        if session:
            try:
                res = await db.execute(
                    select(ChatMessage)
                    .where(ChatMessage.session_id == session.id)
                    .order_by(ChatMessage.id.desc())
                    .limit(8)
                )
                past_msgs = list(reversed(res.scalars().all()))
                for m in past_msgs:
                    history.append({"role": m.role, "content": m.content})
            except Exception as e:
                logger.warning(f"Could not load session history: {e}")

        facilities_data = None
        schemes_data = None

        if intent == "symptom_check":
            formatted = await analyze_symptoms(clean_text, history)
        elif intent == "facility_finder":
            facilities_data = facility_service.get_all()
            formatted = await recommend_facilities(clean_text, facilities_data)
        elif intent == "scheme_advisor":
            schemes_data = scheme_service.get_all()
            formatted = await advise_schemes(clean_text, schemes_data)
        elif intent == "preventive_guidance":
            formatted = await generate_prevention_guidance(clean_text)
        else:
            system_prompt = build_system_prompt(intent)
            messages = history + [{"role": "user", "content": clean_text}]
            raw_ai = await llm_client.generate_response(system_prompt, messages, intent=intent)
            formatted = format_ai_response(raw_ai, intent=intent)

        # Step 5: Save messages to Database
        user_msg_db, assistant_msg_db = await self._save_messages(
            db=db,
            session=session,
            user_text=clean_text,
            assistant_text=formatted["response_text"],
            intent=formatted["intent"],
            urgency=formatted["urgency_level"],
            is_emergency=formatted["is_emergency"],
            suggested_actions=formatted["suggested_actions"]
        )

        return {
            "session_id": session.id if session else 0,
            "user_message": user_msg_db,
            "assistant_message": assistant_msg_db,
            "intent": formatted["intent"],
            "is_emergency": formatted["is_emergency"],
            "urgency_level": formatted["urgency_level"],
            "recommended_specialist": formatted.get("recommended_specialist"),
            "suggested_actions": formatted.get("suggested_actions", []),
            "disclaimer": formatted.get("disclaimer", UNIVERSAL_DISCLAIMER),
            "facilities": formatted.get("facilities") or (facilities_data[:3] if facilities_data else None),
            "schemes": formatted.get("schemes") or (schemes_data[:3] if schemes_data else None)
        }

    async def _save_messages(
        self,
        db: AsyncSession,
        session: Optional[ChatSession],
        user_text: str,
        assistant_text: str,
        intent: str,
        urgency: int,
        is_emergency: bool,
        suggested_actions: List[str]
    ):
        from datetime import datetime, timezone
        
        user_msg_dict = {
            "id": 1,
            "session_id": session.id if session else 0,
            "role": "user",
            "content": user_text,
            "intent_tag": None,
            "urgency_level": None,
            "is_emergency": False,
            "suggested_actions": None,
            "created_at": datetime.now(timezone.utc)
        }
        
        assistant_msg_dict = {
            "id": 2,
            "session_id": session.id if session else 0,
            "role": "assistant",
            "content": assistant_text,
            "intent_tag": intent,
            "urgency_level": urgency,
            "is_emergency": is_emergency,
            "suggested_actions": suggested_actions,
            "created_at": datetime.now(timezone.utc)
        }

        if session:
            user_msg = ChatMessage(
                session_id=session.id,
                role="user",
                content=user_text
            )
            assistant_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content=assistant_text,
                intent_tag=intent,
                urgency_level=urgency,
                is_emergency=is_emergency,
                suggested_actions=json.dumps(suggested_actions)
            )
            db.add(user_msg)
            db.add(assistant_msg)
            await db.commit()
            await db.refresh(user_msg)
            await db.refresh(assistant_msg)
            
            user_msg_dict["id"] = user_msg.id
            assistant_msg_dict["id"] = assistant_msg.id

        return user_msg_dict, assistant_msg_dict

chat_service = ChatService()
