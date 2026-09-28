from fastapi import APIRouter, HTTPException, status
from typing import List
from backend.schemas.wellness import WellnessTopic

router = APIRouter(prefix="/wellness", tags=["Preventive Health & Wellness"])

WELLNESS_TOPICS: List[WellnessTopic] = [
    WellnessTopic(
        id="well-001",
        title="Cardiovascular Health & Blood Pressure",
        domain="heart_health",
        summary="Maintaining healthy vascular tone, arterial elasticity, and optimal blood pressure through daily lifestyle adjustments.",
        tips=[
            "Limit dietary sodium to under 2,000 mg (about 1 teaspoon of table salt) daily.",
            "Incorporate 30 minutes of moderate cardiovascular aerobic activity 5 days a week.",
            "Consume potassium-rich foods (bananas, spinach, beans, sweet potatoes) to counter sodium."
        ],
        suggested_chat_prompt="How can I naturally lower my blood pressure and what foods should I avoid?",
        screening_guidance="Adults 18+ should check blood pressure at least once a year; every 6 months if borderline.",
        icon="heart"
    ),
    WellnessTopic(
        id="well-002",
        title="Type 2 Diabetes Prevention & Glucose Control",
        domain="metabolic_health",
        summary="Understanding insulin sensitivity, glycemic index of foods, and proactive prediabetes intervention.",
        tips=[
            "Replace refined carbohydrates and sugary sodas with whole grains and leafy vegetables.",
            "Take a brisk 10-minute walk immediately after major meals to blunt postprandial glucose spikes.",
            "Target a modest 5% to 7% reduction in body weight to cut diabetes risk by up to 58%."
        ],
        suggested_chat_prompt="What are the early warning signs of insulin resistance and prediabetes?",
        screening_guidance="Fasting blood sugar or HbA1c test every 3 years starting at age 35, or earlier with family history.",
        icon="activity"
    ),
    WellnessTopic(
        id="well-003",
        title="Mental Wellness & Stress Resilience",
        domain="mental_health",
        summary="Techniques for managing chronic cortisol elevation, anxiety reduction, and sleep-mood stabilization.",
        tips=[
            "Practice box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) during moments of acute anxiety.",
            "Set healthy digital boundaries: disconnect from work emails and notifications at least 60 minutes before bed.",
            "Engage in meaningful social connection or talk therapy if feelings of overwhelm persist."
        ],
        suggested_chat_prompt="What are evidence-based techniques to reduce daily stress and anxiety?",
        screening_guidance="Annual PHQ-9 depression and GAD-7 anxiety self-screening during wellness checkups.",
        icon="smile"
    ),
    WellnessTopic(
        id="well-004",
        title="Restorative Sleep Hygiene",
        domain="sleep",
        summary="Optimizing circadian rhythm, REM architecture, and cellular repair through bedtime consistency.",
        tips=[
            "Maintain a strict sleep-wake schedule, even on weekends, to stabilize your internal circadian clock.",
            "Eliminate blue-light screen exposure 1 hour prior to sleep; keep the bedroom dark, quiet, and cool (65-68°F / 18-20°C).",
            "Avoid caffeine within 8 hours of anticipated bedtime."
        ],
        suggested_chat_prompt="Why am I waking up tired and how can I improve my deep sleep quality?",
        screening_guidance="Screen for Obstructive Sleep Apnea (STOP-Bang questionnaire) if loud snoring or daytime fatigue occurs.",
        icon="moon"
    ),
    WellnessTopic(
        id="well-005",
        title="Anti-Inflammatory Nutrition & Hydration",
        domain="nutrition",
        summary="Fueling cellular health with nutrient-dense Mediterranean-style dietary patterns and adequate fluid intake.",
        tips=[
            "Fill half your plate with colorful vegetables and fruits at every main meal.",
            "Prioritize healthy fats (extra virgin olive oil, walnuts, chia seeds, fatty fish) over saturated fats.",
            "Drink 2 to 3 liters of clean water daily, adjusting upward for heat and physical exertion."
        ],
        suggested_chat_prompt="Can you give me a simple 7-day anti-inflammatory meal guideline?",
        screening_guidance="Annual lipid panel (Total, LDL, HDL, Triglycerides) and Vitamin D / B12 levels.",
        icon="coffee"
    ),
    WellnessTopic(
        id="well-006",
        title="Age-Appropriate Cancer Screenings",
        domain="cancer_prevention",
        summary="Early detection protocols that find precancerous lesions and localized tumors before symptoms arise.",
        tips=[
            "Avoid all forms of tobacco (smoking, chewing) and limit alcohol consumption.",
            "Apply broad-spectrum SPF 30+ sunscreen daily and inspect skin for evolving moles (ABCDE criteria).",
            "Follow standard population screening schedules for cervical, breast, and colorectal health."
        ],
        suggested_chat_prompt="What cancer screening tests should I schedule based on my age and sex?",
        screening_guidance="Colorectal screening starting at age 45; Mammography at 40-50; Pap smear / HPV every 3-5 years for women 21-65.",
        icon="shield"
    ),
    WellnessTopic(
        id="well-007",
        title="Adult & Lifespan Immunization Schedule",
        domain="immunization",
        summary="Protecting against severe vaccine-preventable bacterial and viral infections throughout adulthood.",
        tips=[
            "Receive an annual seasonal influenza vaccine each autumn.",
            "Ensure a Tdap (Tetanus, Diphtheria, Pertussis) booster every 10 years.",
            "Adults 50+ should receive the recombinant Shingles (Herpes Zoster) 2-dose series."
        ],
        suggested_chat_prompt="Which vaccines do adults need, and when should I get boosters?",
        screening_guidance="Check vaccination records with your primary care provider at every annual physical exam.",
        icon="check-circle"
    ),
    WellnessTopic(
        id="well-008",
        title="Bone Density, Joint Health & Mobility",
        domain="musculoskeletal",
        summary="Preventing osteoporosis, maintaining synovial joint lubrication, and avoiding fall-related fractures.",
        tips=[
            "Engage in progressive resistance strength training 2–3 times per week to stimulate bone remodeling.",
            "Ensure adequate dietary Calcium (1,000–1,200 mg/day) and Vitamin D3 (600–1,000 IU/day).",
            "Perform balance exercises (e.g. single-leg stands, heel-to-toe walking) to preserve neuromuscular control."
        ],
        suggested_chat_prompt="How do I protect my joints from arthritis and keep my bones strong as I age?",
        screening_guidance="DEXA bone density scan for women 65+ (or men 70+), or earlier if high fracture risk.",
        icon="user-check"
    ),
    WellnessTopic(
        id="well-009",
        title="Maternal & Perinatal Health Guidance",
        domain="maternal_health",
        summary="Safeguarding maternal and fetal vitality through antenatal care, folic acid, and nutrition.",
        tips=[
            "Take 400 mcg of daily folic acid prior to conception and through the first trimester to prevent neural tube defects.",
            "Attend at least 4 comprehensive antenatal clinical checkups throughout pregnancy.",
            "Watch for preeclampsia red flags: sudden swelling in face/hands, severe headache, or visual disturbances."
        ],
        suggested_chat_prompt="What are essential foods, vitamins, and warning signs during pregnancy?",
        screening_guidance="Routine gestational diabetes screening (OGTT) at 24–28 weeks; blood group and Rh factor at first visit.",
        icon="heart"
    ),
    WellnessTopic(
        id="well-010",
        title="Pediatric Growth & Developmental Milestones",
        domain="child_health",
        summary="Supporting early childhood cognitive, physical, and emotional development from infancy through adolescence.",
        tips=[
            "Exclusive breastfeeding for the first 6 months of life provides optimal immunological protection.",
            "Track motor and speech milestones (sitting at 6 mos, walking at 12 mos, two-word sentences at 24 mos).",
            "Limit recreational screen time for children under 2 to near zero, and 1 hour/day of high-quality content for ages 2–5."
        ],
        suggested_chat_prompt="What are the essential developmental milestones for a 1-year-old child?",
        screening_guidance="Well-child visits at 1, 2, 4, 6, 9, 12, 15, 18, 24, and 30 months, followed by annual visits.",
        icon="award"
    )
]

@router.get("/topics", response_model=List[WellnessTopic])
async def list_wellness_topics():
    """Returns all 10 evidence-based preventive health topic guides."""
    return WELLNESS_TOPICS

@router.get("/topics/{topic_id}", response_model=WellnessTopic)
async def get_wellness_topic(topic_id: str):
    """Retrieves specific wellness topic guide."""
    for t in WELLNESS_TOPICS:
        if t.id == topic_id:
            return t
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wellness topic not found")
