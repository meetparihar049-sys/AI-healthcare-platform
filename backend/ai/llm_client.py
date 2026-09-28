import logging
from typing import List, Dict, Any, Optional
import httpx
from backend.core.config import settings
from backend.ai.safety_triage import UNIVERSAL_DISCLAIMER

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.gemini_model = settings.GEMINI_MODEL
        self.openai_key = settings.OPENAI_API_KEY
        self.openai_model = settings.OPENAI_MODEL

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        intent: str = "general_health",
        extra_context: Optional[str] = None
    ) -> str:
        """
        Generates an AI response using Google Gemini if configured,
        or OpenAI / built-in clinical fallback engine.
        """
        # 1. Try Google Gemini API
        if self.gemini_key and self.gemini_key.strip() and not self.gemini_key.startswith("your-"):
            try:
                return await self._call_gemini(system_prompt, messages)
            except Exception as e:
                logger.warning(f"Google Gemini call failed ({e}); attempting secondary provider or fallback.")

        # 2. Try OpenAI API as secondary fallback if key exists
        if self.openai_key and self.openai_key.strip() and not self.openai_key.startswith("your-"):
            try:
                return await self._call_openai(system_prompt, messages)
            except Exception as e:
                logger.warning(f"OpenAI call failed ({e}); falling back to local clinical knowledge engine.")

        # 3. Use built-in evidence-based clinical knowledge engine
        logger.info("Using built-in clinical AI engine (no external API key configured or API error).")
        return self._generate_fallback(messages[-1]["content"], intent, extra_context)

    async def _call_gemini(self, system_prompt: str, messages: List[Dict[str, str]]) -> str:
        """Calls Google Gemini Generative Language API (e.g. gemini-1.5-flash / gemini-2.0-flash)."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
        
        # Convert message history to Gemini contents format
        contents = []
        for m in messages:
            role = "model" if m.get("role") in ["assistant", "system"] else "user"
            contents.append({
                "role": role,
                "parts": [{"text": m.get("content", "")}]
            })

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1000
            }
        }

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            resp.raise_for_status()
            data = resp.json()
            
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
            raise ValueError("No text candidate returned from Gemini API")

    async def _call_openai(self, system_prompt: str, messages: List[Dict[str, str]]) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.openai_model,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "temperature": 0.4,
            "max_tokens": 1000
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    def _generate_fallback(self, user_msg: str, intent: str, extra_context: Optional[str] = None) -> str:
        """Generates evidence-informed, context-aware healthcare responses offline."""
        msg_lower = user_msg.lower()

        if intent == "symptom_check":
            if any(k in msg_lower for k in ["headache", "migraine", "head pain"]):
                return (
                    "### Clinical Observation & Triage Assessment\n\n"
                    "Based on your report of headache symptoms, here is a structured health assessment:\n\n"
                    "**1. Possible Explanations (Hedged Analysis):**\n"
                    "- *Tension-type Headache:* Often associated with physical fatigue, prolonged screen exposure, or neck muscle stiffness.\n"
                    "- *Migraine:* Characterized by throbbing, unilateral pain, frequently accompanied by sensitivity to bright light or sound.\n"
                    "- *Dehydration or Sinus Pressure:* Common after poor fluid intake or viral upper-respiratory congestion.\n\n"
                    "**2. Urgency Level:** **Level 2 (Routine medical consultation)**\n"
                    "If this is a typical headache, resting in a quiet, dark room, maintaining hydration, and gentle neck stretches can help. "
                    "However, if headaches persist for more than 48 hours or recur frequently, visit a physician.\n\n"
                    "**3. Recommended Specialist:** **General Physician** or **Neurologist** (for chronic migraines).\n\n"
                    "**4. Red-Flag Warnings (Seek Immediate Care if Present):**\n"
                    "- Sudden, explosive 'thunderclap' onset ('worst headache of your life').\n"
                    "- Accompanying high fever and stiff neck.\n"
                    "- Confusion, slurred speech, or weakness on one side of the body.\n\n"
                    "**5. Helpful Questions for Your Doctor:**\n"
                    "- 'Could my headaches be related to eye strain or blood pressure?'\n"
                    "- 'What non-pharmacological triggers should I track?'"
                )
            elif any(k in msg_lower for k in ["fever", "temperature", "chills"]):
                return (
                    "### Clinical Observation & Triage Assessment\n\n"
                    "Based on your report of fever and chills:\n\n"
                    "**1. Possible Explanations:**\n"
                    "- *Viral Infection:* Most common cause of short-term febrile illness (common cold, influenza, or seasonal viral syndrome).\n"
                    "- *Bacterial Infection:* May include urinary tract, throat (strep), or ear infection requiring antibiotic intervention.\n\n"
                    "**2. Urgency Level:** **Level 2 to Level 3 (Consult a Doctor)**\n"
                    "- Adults with fever under 102°F (38.9°C) without red flags should rest, hydrate with oral electrolytes, and monitor.\n"
                    "- If fever exceeds 103°F (39.4°C), lasts > 3 days, or is in an infant, seek prompt medical attention.\n\n"
                    "**3. Recommended Specialist:** **General Physician** or **Pediatrician** (for children).\n\n"
                    "**4. Red Flags:** Persistent vomiting, stiff neck, shortness of breath, or rash."
                )
            elif any(k in msg_lower for k in ["stomach", "abdominal", "belly", "nausea", "vomit"]):
                return (
                    "### Clinical Observation & Triage Assessment\n\n"
                    "Based on your report of abdominal discomfort or digestive symptoms:\n\n"
                    "**1. Possible Explanations:**\n"
                    "- *Acute Gastroenteritis / Food Indiscretion:* Stomach flu or food intolerance, usually self-limiting with oral rehydration.\n"
                    "- *Gastritis or Acid Peptic Disease:* Epigastric burning or nausea often aggravated by spicy food or skipped meals.\n\n"
                    "**2. Urgency Level:** **Level 2 (Routine Medical Evaluation)**\n"
                    "Stay well-hydrated with electrolyte fluids (ORS), take small sips, and eat bland foods (BRAT diet: bananas, rice, applesauce, toast).\n\n"
                    "**3. Recommended Specialist:** **Gastroenterologist** or **General Physician**.\n\n"
                    "**4. Red Flags:** Severe localized right-lower abdominal pain (possible appendicitis), vomiting blood, high fever, or rigid abdomen."
                )
            else:
                return (
                    f"### Clinical Observation & Triage Assessment\n\n"
                    f"Thank you for sharing your symptoms regarding: *\"{user_msg.strip()}\"*.\n\n"
                    "**1. Clinical Evaluation:**\n"
                    "The reported symptoms may be consistent with several benign or acute health conditions. "
                    "A physician will evaluate the exact onset, triggers, and physical findings.\n\n"
                    "**2. Urgency Level:** **Level 2 (Routine Evaluation)**\n"
                    "Unless you experience sudden worsening, breathing difficulty, or extreme pain, "
                    "scheduling a consultation with a healthcare provider in the next 1–3 days is recommended.\n\n"
                    "**3. Recommended Specialist:** **General Physician**\n\n"
                    "**4. What to Monitor:** Track your temperature, note when symptoms peak, and record any medication you have taken."
                )

        elif intent == "facility_finder":
            return (
                "### Healthcare Facility Recommendations\n\n"
                "Navigating the healthcare system efficiently ensures you get the right care at an affordable cost:\n\n"
                "**1. Recommended Facility Types:**\n"
                "- **Government General Hospitals & CHCs:** Ideal for free or heavily subsidized inpatient care, diagnostic labs, and emergency stabilization.\n"
                "- **Primary Health Centers (PHCs):** Best for first-contact care, general consultations, vaccinations, and free basic medicines.\n"
                "- **Specialty Clinics / Multispecialty Hospitals:** Recommended when advanced imaging (MRI/CT) or sub-specialist consultations are required.\n"
                "- **24/7 Pharmacies:** For immediate prescription refills, first aid, and basic diagnostic test strips.\n\n"
                "You can explore our interactive **Facilities Directory** tab above to filter options by cost tier, emergency readiness, and travel proximity."
            )

        elif intent == "scheme_advisor":
            return (
                "### Government Healthcare Schemes & Subsidies\n\n"
                "Here are key public health programs you may be eligible to utilize:\n\n"
                "1. **Ayushman Bharat PM-JAY:**\n"
                "   - *Coverage:* Up to ₹5,00,000 per family per year for secondary and tertiary hospitalization.\n"
                "   - *Key Highlight:* Covers all senior citizens aged 70+ regardless of income category.\n"
                "   - *Where to apply:* Nearest empaneled hospital helpdesk or `mera.pmjay.gov.in`.\n\n"
                "2. **Janani Shishu Suraksha Karyakram (JSSK):**\n"
                "   - *Coverage:* 100% free delivery, C-section, medicines, and newborn care in public facilities.\n\n"
                "3. **Pradhan Mantri Bhartiya Jan Aushadhi Pariyojana (PMBJP):**\n"
                "   - *Coverage:* Quality generic drugs available at 50% to 90% discount at over 10,000 Jan Aushadhi Kendras.\n\n"
                "Explore the **Schemes** tab on this platform to filter schemes tailored to your state, age, and health condition."
            )

        elif intent == "preventive_guidance":
            return (
                "### Evidence-Based Preventive Health Guidance\n\n"
                "Proactive preventive care significantly reduces the long-term risk of chronic illnesses like hypertension, diabetes, and heart disease:\n\n"
                "**1. Cardiovascular & Metabolic Health:**\n"
                "- Maintain at least 150 minutes of moderate aerobic activity (e.g. brisk walking) weekly.\n"
                "- Aim for a nutrient-dense diet rich in fiber, whole grains, and leafy vegetables; reduce sodium and ultra-processed sugars.\n\n"
                "**2. Essential Routine Screenings:**\n"
                "- **Blood Pressure Check:** At least once every 12 months for adults.\n"
                "- **Fasting Blood Glucose / HbA1c:** Every 3 years starting at age 35, or earlier if family history of diabetes.\n"
                "- **Lipid Profile (Cholesterol):** Every 4–5 years for adults.\n\n"
                "**3. Sleep & Restorative Wellness:**\n"
                "- Prioritize 7–9 hours of continuous sleep to support hormonal balance and immune resilience.\n\n"
                "**4. Adult Immunizations:** Ensure annual influenza vaccines and tetanus boosters every 10 years."
            )

        elif intent == "doctor_recommendation":
            return (
                "### Specialist Consultation Recommendation\n\n"
                "To get the most accurate evaluation for your health concern, here is the suggested clinical pathway:\n\n"
                "1. **Primary Recommendation:** Consult a **General Physician / Internal Medicine Specialist**.\n"
                "   - A general physician provides a comprehensive initial evaluation, orders baseline blood or imaging tests, and can refer you to a sub-specialist if required.\n\n"
                "2. **Sub-Specialty Options:**\n"
                "   - For skin, hair, or nail concerns: **Dermatologist**\n"
                "   - For heart, palpitations, or blood pressure issues: **Cardiologist**\n"
                "   - For stomach, digestion, or acid reflux: **Gastroenterologist**\n"
                "   - For joint, bone, or muscle pain: **Orthopedist**\n\n"
                "3. **What to Prepare for Your Visit:**\n"
                "   - A list of current medications and dosages.\n"
                "   - Timeline of when symptoms started and what triggers them.\n"
                "   - Any previous lab or radiology test reports."
            )

        else:
            return (
                "### Health Awareness & Information\n\n"
                f"Thank you for reaching out with your health question: *\"{user_msg.strip()}\"*.\n\n"
                "Understanding your health and taking proactive steps is the best way to safeguard well-being. "
                "Here are key points to consider:\n\n"
                "- Always monitor changes in symptoms over time.\n"
                "- Stay well hydrated and maintain balanced nutrition.\n"
                "- When in doubt, consult a licensed healthcare professional for individualized guidance.\n\n"
                "Feel free to ask about specific symptoms, nearby healthcare facilities, or government healthcare support programs."
            )

llm_client = LLMClient()
