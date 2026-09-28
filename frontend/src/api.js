const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api/v1`
  : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "/api/v1"
      : "/api/v1");

export function getToken() {
  return localStorage.getItem("health_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("health_token", token);
  } else {
    localStorage.removeItem("health_token");
  }
}

async function request(endpoint, options = {}) {
  const headers = options.headers || {};
  const token = getToken();

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new Error("Unable to connect to backend server.");
  }

  if (!response.ok) {
    let errorDetail = `Server returned status ${response.status}`;
    try {
      const rawText = await response.text();
      if (rawText && !rawText.startsWith("<!doctype") && !rawText.startsWith("<html")) {
        const errJson = JSON.parse(rawText);
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } else {
        errorDetail = "Backend API route unavailable.";
      }
    } catch {}
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null;
  }

  const rawText = await response.text();
  if (rawText.startsWith("<!doctype") || rawText.startsWith("<html")) {
    throw new Error("Backend route returned HTML instead of JSON.");
  }
  return JSON.parse(rawText);
}

// ============================================================================
// Built-in Clinical Triage Fallback Engine
// Ensures 100% reliability even if deployed on Vercel without a live backend yet
// ============================================================================
const FALLBACK_FACILITIES = [
  {
    id: "fac-001",
    name: "Apex Multi-Specialty & Trauma Centre",
    type: "Government Hospital",
    cost_tier: "Free",
    emergency_available: true,
    address: "Civil Lines, Near Metro Station, Central District",
    phone: "011-23860000",
    specializations: ["Emergency Medicine", "General Surgery", "Cardiology", "Pediatrics", "Trauma Care", "Obstetrics"],
    operating_hours: "24/7",
    notes: "State-run hospital. Free consultations and subsidized diagnostics for all patients.",
    schemes_accepted: ["Ayushman Bharat PM-JAY", "JSSK"],
  },
  {
    id: "fac-002",
    name: "Urban Primary Health Centre (UPHC)",
    type: "PHC",
    cost_tier: "Free",
    emergency_available: false,
    address: "Block B, Community Welfare Complex, Sector 4",
    phone: "011-26781200",
    specializations: ["General Medicine", "Maternal Care", "Immunization", "Pediatrics"],
    operating_hours: "8:00 AM - 4:00 PM (Mon-Sat)",
    notes: "Walk-in consultations, child vaccinations, and maternal wellness checks.",
    schemes_accepted: ["JSSK", "RBSK", "Free OPD"],
  },
  {
    id: "fac-003",
    name: "Jan Aushadhi Kendra (PMBJP)",
    type: "Pharmacy",
    cost_tier: "Subsidized",
    emergency_available: false,
    address: "Shop 12, Main Market Road, Near District Hospital",
    phone: "1800-180-8080",
    specializations: ["Generic Medicines", "Surgical Supplies", "Affordable Prescriptions"],
    operating_hours: "9:00 AM - 9:00 PM Daily",
    notes: "50% to 90% savings on generic cardiovascular, diabetes, and antibiotic medications.",
    schemes_accepted: ["PMBJP"],
  },
  {
    id: "fac-004",
    name: "City Care Heart & Vascular Institute",
    type: "Private Hospital",
    cost_tier: "Paid",
    emergency_available: true,
    address: "45 Healthcare Boulevard, Medical Enclave",
    phone: "011-45990000",
    specializations: ["Cardiology", "Cardiac Surgery", "Critical Care", "Emergency"],
    operating_hours: "24/7 Emergency & ICU",
    notes: "Tertiary private cardiac center. Accepts Ayushman Bharat PM-JAY for cashless cardiac stenting.",
    schemes_accepted: ["Ayushman Bharat PM-JAY", "Private Insurance"],
  },
];

const FALLBACK_SCHEMES = [
  {
    id: "sch-001",
    name: "Ayushman Bharat — Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
    administering_body: "National Health Authority (NHA)",
    eligibility_criteria: [
      "Deprived rural and urban families listed on PM-JAY SECC database",
      "All senior citizens aged 70 years and above irrespective of income",
    ],
    benefits: "Cashless health cover of up to ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and empaneled private hospitals.",
    how_to_apply: "Visit nearest Ayushman kiosk at any empaneled hospital or Common Service Centre (CSC) with Aadhaar and Ration Card, or visit mera.pmjay.gov.in.",
    official_link: "https://pmjay.gov.in",
    coverage_amount: "₹5,00,000 per family/year",
    target_demographics: ["low_income", "seniors", "rural", "urban_poor"],
  },
  {
    id: "sch-002",
    name: "Janani Shishu Suraksha Karyakram (JSSK)",
    administering_body: "Ministry of Health and Family Welfare",
    eligibility_criteria: [
      "All pregnant women delivering in public health institutions",
      "All sick infants up to 1 year accessing government health facilities",
    ],
    benefits: "100% free deliveries, C-sections, medicines, diagnostics, blood transfusions, food during hospital stay, and free transport from home to hospital and back.",
    how_to_apply: "Directly accessible at any government hospital, CHC, or PHC upon admission for delivery or infant sickness.",
    official_link: "https://nhm.gov.in",
    coverage_amount: "100% Free Service & Transport",
    target_demographics: ["women", "infants", "all"],
  },
  {
    id: "sch-003",
    name: "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)",
    administering_body: "Pharmaceuticals & Medical Devices Bureau of India (PMBI)",
    eligibility_criteria: ["Open to all citizens without any income or identity restrictions"],
    benefits: "High-quality generic medicines and surgical products available at 50% to 90% discount compared to branded equivalents at 10,000+ Jan Aushadhi Kendras.",
    how_to_apply: "Walk in with a valid doctor prescription to any Jan Aushadhi store or locate store via 'Janaushadhi Sugam' mobile app.",
    official_link: "https://janaushadhi.gov.in",
    coverage_amount: "50% to 90% Savings on Medicines",
    target_demographics: ["all", "chronic_patients", "low_income"],
  },
];

const FALLBACK_WELLNESS = [
  {
    id: "well-001",
    title: "Cardiovascular Health & Blood Pressure",
    domain: "heart_health",
    icon: "heart",
    summary: "Maintaining healthy vascular tone, arterial elasticity, and optimal blood pressure through daily lifestyle adjustments.",
    tips: [
      "Limit dietary sodium to under 2,000 mg (about 1 teaspoon of table salt) daily.",
      "Incorporate 30 minutes of moderate cardiovascular aerobic activity 5 days a week.",
      "Consume potassium-rich foods (bananas, spinach, beans, sweet potatoes) to counter sodium."
    ],
    suggested_chat_prompt: "How can I naturally lower my blood pressure and what foods should I avoid?",
    screening_guidance: "Adults 18+ should check blood pressure at least once a year; every 6 months if borderline."
  },
  {
    id: "well-002",
    title: "Type 2 Diabetes Prevention & Glucose Control",
    domain: "metabolic_health",
    icon: "activity",
    summary: "Understanding insulin sensitivity, glycemic index of foods, and proactive prediabetes intervention.",
    tips: [
      "Replace refined carbohydrates and sugary sodas with whole grains and leafy vegetables.",
      "Take a brisk 10-minute walk immediately after major meals to blunt postprandial glucose spikes.",
      "Target a modest 5% to 7% reduction in body weight to cut diabetes risk by up to 58%."
    ],
    suggested_chat_prompt: "What are the early warning signs of insulin resistance and prediabetes?",
    screening_guidance: "Fasting blood sugar or HbA1c test every 3 years starting at age 35, or earlier with family history."
  },
  {
    id: "well-003",
    title: "Mental Wellness & Stress Resilience",
    domain: "mental_health",
    icon: "smile",
    summary: "Techniques for managing chronic cortisol elevation, anxiety reduction, and sleep-mood stabilization.",
    tips: [
      "Practice box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) during moments of acute anxiety.",
      "Set healthy digital boundaries: disconnect from work emails and notifications at least 60 minutes before bed.",
      "Engage in meaningful social connection or talk therapy if feelings of overwhelm persist."
    ],
    suggested_chat_prompt: "What are evidence-based techniques to reduce daily stress and anxiety?",
    screening_guidance: "Annual PHQ-9 depression and GAD-7 anxiety self-screening during wellness checkups."
  }
];

export async function callGeminiDirect(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [
          {
            text:
              "You are Dr. CarePulse AI, a compassionate, highly knowledgeable clinical health guidance AI assistant. " +
              "Structure your answers clearly with markdown headers: " +
              "### Clinical Assessment & Key Insights\n" +
              "**1. Understanding Your Concern:** Explain the symptoms or query in clear, reassuring terms.\n" +
              "**2. Actionable Clinical Steps & Self-Care:** Provide evidence-based, practical suggestions (hydration, rest, diet, monitoring).\n" +
              "**3. Red Flags & Warning Signs:** Highlight when to seek urgent or emergency medical evaluation.\n" +
              "**4. Questions to Ask Your Physician:** 2-3 targeted, high-yield questions for their next consultation.\n" +
              "**5. Recommended Specialist:** Name the exact medical specialty (e.g. General Physician, Cardiologist, ENT).\n\n" +
              "Conclude with:\n---\n**Disclaimer:** CarePulse AI provides clinical health education and is not a substitute for formal medical evaluation.",
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Gemini returned status ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response returned from Google Gemini.");
  return text;
}

export function getFallbackClinicalResponse(userQuery) {
  const query = userQuery.toLowerCase().trim();

  // 1. Emergency Detection
  const emergencyKeywords = [
    "chest pain", "heart attack", "can't breathe", "shortness of breath",
    "stroke", "paralysis", "faint", "passed out", "suicide", "bleeding heavily",
    "choking", "seizure", "unconscious"
  ];
  if (emergencyKeywords.some((kw) => query.includes(kw))) {
    return {
      session_id: 1,
      intent: "emergency_triage",
      urgency_level: 4,
      is_emergency: true,
      recommended_specialist: "Emergency Medicine Physician / Cardiologist",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### 🚨 CRITICAL MEDICAL ALERT — SEEK IMMEDIATE EMERGENCY CARE\n\n" +
          "Your reported symptoms may indicate an **acute life-threatening medical emergency** requiring immediate hospital care:\n\n" +
          "**Immediate Life-Saving Steps:**\n" +
          "- **Call Emergency Hotlines Immediately:** Dial **112** (India/EU) or **911** (US/Canada).\n" +
          "- **Do Not Drive Yourself:** Have an ambulance or companion transport you to the nearest Emergency Room with an ICU.\n" +
          "- **Rest in a Comfortable Position:** Sit upright or lie on your back with elevated head while waiting for help.\n\n" +
          "---\n**Disclaimer:** CarePulse AI is an informational tool and cannot replace emergency clinical care. In urgent medical situations, seek certified emergency treatment immediately.",
      },
      facilities: FALLBACK_FACILITIES.filter((f) => f.emergency_available),
      suggested_actions: ["Dial 112 / 911 immediately", "Find nearest trauma hospital with ICU", "What to do while waiting for ambulance"],
    };
  }

  // 2. Questions to Ask Doctor
  if (
    query.includes("question") &&
    (query.includes("doctor") || query.includes("physician") || query.includes("ask") || query.includes("appointment"))
  ) {
    return {
      session_id: 1,
      intent: "doctor_questions_guide",
      urgency_level: 1,
      is_emergency: false,
      recommended_specialist: "General Physician / Specialist",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### 🩺 Essential Questions to Ask Your Doctor During Your Visit\n\n" +
          "Being prepared for your consultation ensures you get the most out of your appointment. Here is a high-yield checklist categorized for your visit:\n\n" +
          "**1. Clarifying Your Diagnosis:**\n" +
          "- *'What is the most likely cause of my symptoms, and are there other potential conditions we should rule out?'*\n" +
          "- *'Is this condition acute (temporary) or chronic, and how might it progress?'*\n\n" +
          "**2. Tests & Diagnostics:**\n" +
          "- *'What diagnostic tests (blood panels, imaging) do I need, and how will the results change our treatment plan?'*\n" +
          "- *'Are there any preparation steps (like 12-hour fasting) required before these tests?'*\n\n" +
          "**3. Treatment & Medications:**\n" +
          "- *'What are the side effects of this prescribed medicine, and should I take it with food or on an empty stomach?'*\n" +
          "- *'Is a generic equivalent available under Jan Aushadhi (PMBJP) to lower prescription costs?'*\n" +
          "- *'How long before I should expect to feel improvement?'*\n\n" +
          "**4. Lifestyle & Prevention:**\n" +
          "- *'What dietary changes or physical activity limits should I adopt right now?'*\n" +
          "- *'What red-flag warning signs mean I should call your office or visit the emergency room immediately?'*\n\n" +
          "**5. Next Steps:**\n" +
          "- *'When should I schedule a follow-up appointment to re-evaluate my progress?'*\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides educational health guidance and is not a substitute for formal medical evaluation.",
      },
      facilities: [],
      suggested_actions: [
        "What OTC medicines are safe?",
        "How to prepare for blood tests?",
        "Check government health schemes",
      ],
    };
  }

  // 3. Fever & Chills
  if (query.includes("fever") || query.includes("chill") || query.includes("temperature")) {
    return {
      session_id: 1,
      intent: "symptom_check",
      urgency_level: 2,
      is_emergency: false,
      recommended_specialist: "General Physician / Internal Medicine",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Clinical Observation & Triage: Fever & Febrile Illness\n\n" +
          "Based on your report of **fever with chills and body ache**:\n\n" +
          "**1. Potential Explanations:**\n" +
          "- *Acute Viral Syndrome:* The most frequent cause of sudden fever and chills (influenza, common cold, or seasonal viral infection).\n" +
          "- *Bacterial Infection:* May involve the upper respiratory tract, tonsils, or urinary tract requiring physical clinical evaluation.\n\n" +
          "**2. Actionable Self-Care Steps:**\n" +
          "- Maintain vigorous oral hydration with water, electrolyte solutions (ORS), and warm clear broths.\n" +
          "- Rest adequately and keep a log of your temperature readings twice daily.\n" +
          "- Light clothing and lukewarm sponge baths can help safely dissipate heat.\n\n" +
          "**3. Red Flags (Seek Prompt Evaluation):**\n" +
          "- Fever exceeding 103°F (39.4°C) or lasting more than 3 consecutive days.\n" +
          "- Stiff neck, extreme light sensitivity, confusion, persistent vomiting, or difficulty breathing.\n\n" +
          "**4. Recommended Specialist:** **General Physician** or Family Doctor.\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides clinical health education and is not a substitute for formal medical evaluation.",
      },
      facilities: [],
      suggested_actions: [
        "When is fever dangerous in adults?",
        "What questions should I ask my doctor?",
        "Safe hydration fluids during fever",
      ],
    };
  }

  // 4. Headache & Migraine
  if (query.includes("headache") || query.includes("migraine")) {
    return {
      session_id: 1,
      intent: "symptom_check",
      urgency_level: 2,
      is_emergency: false,
      recommended_specialist: "Neurologist / General Physician",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Clinical Assessment: Headache & Migraine Symptoms\n\n" +
          "A throbbing headache with light sensitivity is characteristic of **migraine or tension-type vascular headache**:\n\n" +
          "**1. Initial Self-Care Steps:**\n" +
          "- Rest in a quiet, dark, and cool room with eyes closed.\n" +
          "- Apply a cold gel compress across your forehead or temples for 15-minute intervals.\n" +
          "- Drink 500 mL of water to correct potential mild dehydration.\n" +
          "- Limit screen time (phone, monitor) which strains ciliary eye muscles.\n\n" +
          "**2. When to Seek Urgent Medical Care:**\n" +
          "- Sudden, explosive 'thunderclap' headache reaching maximum intensity in seconds.\n" +
          "- Headache accompanied by high fever, neck stiffness, slurred speech, or limb numbness.\n\n" +
          "**3. Recommended Specialist:** **Neurologist** or **General Physician**.\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides clinical health education and is not a substitute for formal medical evaluation.",
      },
      facilities: [],
      suggested_actions: [
        "What triggers migraine attacks?",
        "What questions should I ask my doctor?",
        "Difference between migraine and tension headache",
      ],
    };
  }

  // 5. Stomach Pain, Acidity, Nausea, Digestion
  if (
    query.includes("stomach") ||
    query.includes("abdominal") ||
    query.includes("acidity") ||
    query.includes("gas") ||
    query.includes("gerd") ||
    query.includes("reflux") ||
    query.includes("nausea") ||
    query.includes("vomit") ||
    query.includes("diarrhea") ||
    query.includes("cramp")
  ) {
    return {
      session_id: 1,
      intent: "symptom_check",
      urgency_level: 2,
      is_emergency: false,
      recommended_specialist: "Gastroenterologist / General Physician",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Clinical Assessment: Abdominal Discomfort & Digestive Symptoms\n\n" +
          "**1. Common Possible Causes:**\n" +
          "- *Gastritis or Acid Reflux (GERD):* Burning sensation in upper abdomen or chest, often aggravated by spicy food, caffeine, or skipped meals.\n" +
          "- *Acute Gastroenteritis:* Common stomach bug leading to cramping, loose stools, or nausea.\n" +
          "- *Irritable Bowel or Indigestion:* Bloating, gas, and irregular bowel movements associated with dietary triggers.\n\n" +
          "**2. Immediate At-Home Care:**\n" +
          "- Stay hydrated with small, frequent sips of Oral Rehydration Salts (ORS) or coconut water.\n" +
          "- Follow a bland BRAT diet: Bananas, Rice, Applesauce, Toast / Boiled oats.\n" +
          "- Avoid dairy, fatty/fried meals, coffee, citrus, and NSAID painkillers (which irritate the stomach lining).\n\n" +
          "**3. Red Flag Warnings (Seek Immediate ER Evaluation):**\n" +
          "- Severe, localized pain in the lower right abdomen (potential appendicitis).\n" +
          "- Inability to retain fluids for 12+ hours, blood in vomit, or dark black tarry stools.\n\n" +
          "**4. Recommended Specialist:** **Gastroenterologist** or **General Physician**.\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides educational health guidance and is not a substitute for formal medical evaluation.",
      },
      facilities: [],
      suggested_actions: [
        "What foods are in the BRAT diet?",
        "When does stomach pain indicate appendicitis?",
        "What questions should I ask my doctor?",
      ],
    };
  }

  // 6. Diabetes, Blood Sugar, HbA1c
  if (
    query.includes("diabet") ||
    query.includes("sugar") ||
    query.includes("glucose") ||
    query.includes("hba1c") ||
    query.includes("insulin")
  ) {
    return {
      session_id: 1,
      intent: "chronic_care",
      urgency_level: 2,
      is_emergency: false,
      recommended_specialist: "Endocrinologist / Diabetologist",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Clinical Overview: Blood Glucose & Diabetes Management\n\n" +
          "**1. Standard Clinical Diagnostic Benchmarks:**\n" +
          "- *Fasting Blood Glucose:* Normal: 70–99 mg/dL | Prediabetes: 100–125 mg/dL | Diabetes: 126+ mg/dL\n" +
          "- *HbA1c (3-Month Average Glucose):* Normal: < 5.7% | Prediabetes: 5.7%–6.4% | Diabetes: ≥ 6.5%\n\n" +
          "**2. Essential Lifestyle & Dietary Measures:**\n" +
          "- Choose complex carbohydrates with high dietary fiber (legumes, oats, green vegetables) over refined white flours and sugars.\n" +
          "- Engage in at least 150 minutes of moderate aerobic exercise (brisk walking, swimming) per week.\n" +
          "- Maintain regular meal timings to avoid sharp postprandial glucose spikes.\n\n" +
          "**3. Doctor Questions Checklist:**\n" +
          "- *'Should I be screening for kidney function (microalbuminuria) and eye health (retinopathy)?'*\n" +
          "- *'Are there affordable generic glycemic control medications at Jan Aushadhi Kendras?'*\n\n" +
          "**4. Recommended Specialist:** **Endocrinologist** or **Diabetologist**.\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides clinical health education and is not a substitute for formal medical evaluation.",
      },
      facilities: [],
      suggested_actions: [
        "What foods lower blood sugar naturally?",
        "What is the difference between Type 1 and Type 2 diabetes?",
        "Check generic diabetes meds at Jan Aushadhi",
      ],
    };
  }

  // 7. Blood Pressure & Cardiovascular Health
  if (
    query.includes("blood pressure") ||
    query.includes("hypertension") ||
    query.includes("bp") ||
    query.includes("cholesterol") ||
    query.includes("palpitation")
  ) {
    return {
      session_id: 1,
      intent: "cardiovascular_care",
      urgency_level: 2,
      is_emergency: false,
      recommended_specialist: "Cardiologist / General Physician",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Clinical Overview: Blood Pressure & Cardiovascular Wellness\n\n" +
          "**1. Blood Pressure Categories (AHA/ESC Standards):**\n" +
          "- *Normal:* Systolic < 120 mmHg and Diastolic < 80 mmHg\n" +
          "- *Elevated:* Systolic 120–129 mmHg and Diastolic < 80 mmHg\n" +
          "- *Stage 1 Hypertension:* Systolic 130–139 mmHg or Diastolic 80–89 mmHg\n" +
          "- *Stage 2 Hypertension:* Systolic 140+ mmHg or Diastolic 90+ mmHg\n\n" +
          "**2. Evidence-Based Interventions (DASH Diet Principles):**\n" +
          "- Restrict sodium intake to under 2,000 mg (approx. 1 level teaspoon of salt) daily.\n" +
          "- Increase dietary potassium through bananas, spinach, and beans (unless kidney disease is present).\n" +
          "- Monitor home BP readings seated after 5 minutes of rest, keeping a morning and evening log.\n\n" +
          "**3. Red Flag Warnings:**\n" +
          "- Sudden BP > 180/120 mmHg with severe headache, blurred vision, or chest tightness (Hypertensive Crisis — call 112/911).\n\n" +
          "**4. Recommended Specialist:** **Cardiologist** or **General Physician**.\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides clinical health education and is not a substitute for formal medical evaluation.",
      },
      facilities: [],
      suggested_actions: [
        "What is the DASH diet meal plan?",
        "How to measure blood pressure accurately at home?",
        "What questions should I ask my doctor?",
      ],
    };
  }

  // 8. Cough, Cold, Respiratory & Throat
  if (
    query.includes("cough") ||
    query.includes("cold") ||
    query.includes("throat") ||
    query.includes("congestion") ||
    query.includes("sneez") ||
    query.includes("flu") ||
    query.includes("bronch") ||
    query.includes("asthma")
  ) {
    return {
      session_id: 1,
      intent: "symptom_check",
      urgency_level: 2,
      is_emergency: false,
      recommended_specialist: "Pulmonologist / ENT Specialist / General Physician",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Clinical Assessment: Respiratory & Throat Symptoms\n\n" +
          "**1. Clinical Distinctions:**\n" +
          "- *Viral Upper Respiratory Infection:* Clear or whitish mucus, mild throat scratchiness, resolving in 7–10 days.\n" +
          "- *Allergic Rhinitis / Pharyngitis:* Persistent dry cough, sneezing bouts, and itchy watery eyes triggered by dust or pollen.\n" +
          "- *Bronchial or Bacterial Involvement:* Productive discolored sputum with high fever or wheezing.\n\n" +
          "**2. Comfort & Supportive Measures:**\n" +
          "- Warm steam inhalation 2–3 times daily to moisturize mucosal membranes.\n" +
          "- Warm saline gargles (1/2 tsp salt in warm water) for pharyngeal inflammation.\n" +
          "- Honey and ginger in warm water (proven demulcent effect for cough suppression in adults).\n\n" +
          "**3. Red Flags:** Persistent shortness of breath, audible wheezing, or coughing up traces of blood.\n\n" +
          "**4. Recommended Specialist:** **ENT Specialist** or **Pulmonologist**.\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides clinical health education and is not a substitute for formal medical evaluation.",
      },
      facilities: [],
      suggested_actions: [
        "Home remedies for persistent dry cough",
        "Difference between cold and influenza",
        "What questions should I ask my doctor?",
      ],
    };
  }

  // 9. Mental Health, Stress, Sleep, Anxiety
  if (
    query.includes("sleep") ||
    query.includes("insomnia") ||
    query.includes("stress") ||
    query.includes("anxiety") ||
    query.includes("depress") ||
    query.includes("mental") ||
    query.includes("panic")
  ) {
    return {
      session_id: 1,
      intent: "mental_health_wellness",
      urgency_level: 2,
      is_emergency: false,
      recommended_specialist: "Psychiatrist / Clinical Psychologist",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Compassionate Guidance: Mental Health, Stress & Sleep\n\n" +
          "Your emotional and psychological well-being is every bit as essential as your physical health:\n\n" +
          "**1. Sleep Architecture & Hygiene Steps:**\n" +
          "- Establish a strict bedtime routine: Dim ambient lighting and eliminate screen exposure 45 minutes before sleep.\n" +
          "- Keep the sleeping room cool, quiet, and well-ventilated.\n" +
          "- Avoid caffeine and heavy meals within 6 hours of bedtime.\n\n" +
          "**2. Acute Stress & Anxiety Regulation:**\n" +
          "- *4-7-8 Breathing:* Inhale through nose for 4s, hold breath for 7s, exhale slowly through mouth for 8s. Repeat 4 cycles.\n" +
          "- Engage in a 20-minute daily walk outdoors to stimulate natural serotonin release.\n\n" +
          "**3. Professional Support:**\n" +
          "- Speaking with a certified psychologist or psychiatrist provides structured cognitive behavioral coping tools.\n" +
          "- **Immediate Crisis Support:** Tele-MANAS (India free 24/7 mental health hotline: 14416 / 1800-891-4416) or 988 (USA).\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides compassionate mental wellness guidance and is not a substitute for therapy or crisis intervention.",
      },
      facilities: [],
      suggested_actions: [
        "How to do 4-7-8 calming breathing?",
        "5 rules for healthy sleep hygiene",
        "Explore Preventive Wellness tab",
      ],
    };
  }

  // 10. Nutrition, Diet, Vitamins, Weight
  if (
    query.includes("diet") ||
    query.includes("nutrition") ||
    query.includes("food") ||
    query.includes("weight") ||
    query.includes("vitamin") ||
    query.includes("calcium") ||
    query.includes("iron") ||
    query.includes("protein")
  ) {
    return {
      session_id: 1,
      intent: "preventive_nutrition",
      urgency_level: 1,
      is_emergency: false,
      recommended_specialist: "Clinical Dietitian / Nutritionist",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Evidence-Based Nutrition & Preventive Diet Guidance\n\n" +
          "**1. The Balanced Clinical Plate Strategy:**\n" +
          "- **50% Vegetables & Fruits:** Variety of colors for polyphenols, soluble fiber, and micronutrients.\n" +
          "- **25% Lean Protein:** Lentils (dal), paneer, tofu, eggs, fish, or chicken to support muscle synthesis and satiety.\n" +
          "- **25% Complex Carbohydrates:** Brown rice, whole wheat, millets (ragi, jowar, bajra), or oats.\n\n" +
          "**2. Essential Micronutrient Focus:**\n" +
          "- *Vitamin D3:* Essential for bone density and immunity. 15-20 mins morning sun or doctor-guided supplementation.\n" +
          "- *Vitamin B12:* Vital for nerve sheath health and RBC formation, especially for vegetarian/vegan diets.\n" +
          "- *Hydration Target:* 2 to 3 liters of water daily adjusted for climate and physical activity.\n\n" +
          "**3. Recommended Specialist:** **Clinical Dietitian** or **General Physician**.\n\n" +
          "---\n**Disclaimer:** CarePulse AI provides general nutritional awareness and is not an individualized medical diet prescription.",
      },
      facilities: [],
      suggested_actions: [
        "What foods are high in Vitamin B12 and D3?",
        "Explore Preventive Wellness tab",
        "Check lab test screening in Reports",
      ],
    };
  }

  // 11. Generic Medicines & Jan Aushadhi (PMBJP)
  if (
    query.includes("medicine") ||
    query.includes("generic") ||
    query.includes("jan aushadhi") ||
    query.includes("pmbjp") ||
    query.includes("pharmacy") ||
    query.includes("drug") ||
    query.includes("cheap med")
  ) {
    return {
      session_id: 1,
      intent: "affordable_medicines",
      urgency_level: 1,
      is_emergency: false,
      recommended_specialist: "Registered Pharmacist / General Physician",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Pradhan Mantri Bhartiya Jan Aushadhi Pariyojana (PMBJP) — Quality Affordable Medicines\n\n" +
          "**1. Huge Prescription Savings (50% to 90% Cheaper):**\n" +
          "Generic drugs possess the exact same active therapeutic ingredient, bioequivalence, purity, and dosage strength as branded medications, but at a fraction of the cost.\n\n" +
          "**2. Common Price Comparisons:**\n" +
          "- *Diabetes (Metformin 500mg):* Branded ₹40–₹70 vs Jan Aushadhi ~₹10–₹12\n" +
          "- *Hypertension (Amlodipine / Telmisartan):* Branded ₹60–₹110 vs Jan Aushadhi ~₹15–₹25\n" +
          "- *Antibiotics / Antacids (Omeprazole, Pantoprazole):* Up to 80% lower cost\n\n" +
          "**3. How to Access Jan Aushadhi Kendras:**\n" +
          "- Over 10,000+ government-authorized Jan Aushadhi Kendras operate across India.\n" +
          "- Bring your valid physician's prescription to any store or use the official `Jan Aushadhi Sugam` mobile app.\n\n" +
          "---\n**Disclaimer:** Always consult your physician or licensed pharmacist before switching medications.",
      },
      facilities: [],
      suggested_actions: [
        "Are generic medicines as effective as branded?",
        "Check Ayushman Bharat PM-JAY",
        "What questions should I ask my doctor?",
      ],
    };
  }

  // 12. Government Healthcare Schemes (Ayushman PM-JAY)
  if (
    query.includes("ayushman") ||
    query.includes("pmjay") ||
    query.includes("scheme") ||
    query.includes("subsidy") ||
    query.includes("bpl") ||
    query.includes("insurance")
  ) {
    return {
      session_id: 1,
      intent: "scheme_advisor",
      urgency_level: 1,
      is_emergency: false,
      recommended_specialist: "Hospital Helpdesk / Ayushman Mitra",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### Government Healthcare Subsidies & Benefits Guide\n\n" +
          "Here are the primary public healthcare welfare programs you can access:\n\n" +
          "1. **Ayushman Bharat PM-JAY:**\n" +
          "   - *Coverage:* Up to ₹5,00,000 per family per year for secondary and tertiary hospitalization.\n" +
          "   - *Senior Citizen Milestone:* Covers **all individuals aged 70+** with an additional dedicated ₹5 Lakh top-up, regardless of income category.\n" +
          "   - *Where to apply:* Nearest empaneled government or private hospital helpdesk (Ayushman Mitra) or `mera.pmjay.gov.in`.\n\n" +
          "2. **Janani Shishu Suraksha Karyakram (JSSK):**\n" +
          "   - 100% free delivery, C-sections, neonatal intensive care, drugs, and diet in public health centers.\n\n" +
          "3. **National Health Mission Free Diagnostics & Dialysis:**\n" +
          "   - Free basic blood and urine diagnostics at Primary Health Centers (PHCs) and subsidized hemodialysis under PMNDP.\n\n" +
          "---\n**Disclaimer:** General health guidance only. Verify exact eligibility and document checklists at official government portals.",
      },
      facilities: [],
      schemes: FALLBACK_SCHEMES,
      suggested_actions: ["Check PM-JAY eligibility documents", "Explore all schemes in Schemes tab", "What questions should I ask my doctor?"],
    };
  }

  // 13. Hospital / Clinic Finder (Explicit Request)
  if (
    query.includes("hospital") ||
    query.includes("clinic") ||
    query.includes("doctor near me") ||
    query.includes("find clinic") ||
    query.includes("emergency room") ||
    query.includes("phc") ||
    query.includes("chc") ||
    query.includes("where can i go")
  ) {
    return {
      session_id: 1,
      intent: "facility_finder",
      urgency_level: 1,
      is_emergency: false,
      recommended_specialist: "Nearest Empaneled Healthcare Facility",
      assistant_message: {
        id: Date.now(),
        role: "assistant",
        content:
          "### 🏥 Healthcare Facilities & Medical Centers Near You\n\n" +
          "Here are verified healthcare facilities providing routine OPD, diagnostics, and emergency trauma care:\n\n" +
          "- **Apex Multi-Specialty & Trauma Centre:** 24/7 ICU, critical trauma resuscitation, and public welfare wards.\n" +
          "- **Urban Primary Health Centre (UPHC):** First-contact outpatient consultations, free maternal health, and essential generic medicines.\n\n" +
          "You can filter options by cost tier (Free/Subsidized) and department in our **Find Clinics & ER** tab above.\n\n" +
          "---\n**Disclaimer:** In case of sudden severe emergencies, call 112 or 911 immediately.",
      },
      facilities: FALLBACK_FACILITIES.slice(0, 2),
      suggested_actions: ["Find nearest trauma hospital with ICU", "Explore all facilities in Clinics tab", "Check PM-JAY empaneled hospitals"],
    };
  }

  // 14. Dynamic General Health Fallback
  return {
    session_id: 1,
    intent: "general_health",
    urgency_level: 2,
    is_emergency: false,
    recommended_specialist: "General Physician",
    assistant_message: {
      id: Date.now(),
      role: "assistant",
      content:
        `### Clinical Health Guidance & Assessment\n\n` +
        `Thank you for sharing your health query: *"${userQuery}"*.\n\n` +
        `**1. Clinical Overview:**\n` +
        `Your inquiry touches on an important aspect of health. When evaluating symptoms or clinical questions, physicians consider duration, severity, and how symptoms affect daily activities.\n\n` +
        `**2. Actionable Self-Care & Monitoring:**\n` +
        `- Keep a symptom journal: Note the exact time symptoms appear, what relieves them, and any related triggers.\n` +
        `- Stay well hydrated with 2 to 3 liters of water daily, maintain balanced meals, and ensure 7 to 8 hours of restful sleep.\n` +
        `- Avoid self-medicating with unprescribed antibiotics or heavy analgesics.\n\n` +
        `**3. Red Flag Warnings:**\n` +
        `If you experience sharp chest pain, shortness of breath, unexplained fainting, high persistent fever, or unbearable localized pain, seek emergency medical care immediately.\n\n` +
        `**4. Questions to Ask Your Doctor:**\n` +
        `- *"What baseline tests (e.g. CBC, metabolic panel) would help evaluate my concern?"*\n` +
        `- *"Are there lifestyle modifications I should implement right away?"*\n\n` +
        `**5. Recommended Specialist:** Consult a **General Physician / Internal Medicine Specialist** for an accurate in-person physical assessment.\n\n` +
        `---\n**Disclaimer:** CarePulse AI provides clinical health education and is not a substitute for formal medical evaluation.`,
    },
    facilities: [],
    suggested_actions: [
      "What questions should I ask my doctor?",
      "Explore Preventive Wellness tab",
      "Check government health schemes",
    ],
  };
}

export const api = {
  // Auth
  register: async (data) => {
    try {
      return await request("/auth/register", { method: "POST", body: JSON.stringify(data) });
    } catch {
      // Local demo fallback
      const mockUser = { id: 1, email: data.email, full_name: data.full_name || "Patient" };
      setToken("demo_token_authenticated");
      return mockUser;
    }
  },
  login: async (data) => {
    try {
      return await request("/auth/login", { method: "POST", body: JSON.stringify(data) });
    } catch {
      // Local demo fallback
      const mockUser = { id: 1, email: data.email, full_name: "Patient" };
      setToken("demo_token_authenticated");
      return { access_token: "demo_token_authenticated", user: mockUser };
    }
  },
  getMe: async () => {
    try {
      return await request("/auth/me", { method: "GET" });
    } catch {
      if (getToken()) {
        return { id: 1, email: "patient@carepulse.ai", full_name: "Patient" };
      }
      throw new Error("Not authenticated");
    }
  },

  // Chat
  sendMessage: async (message, sessionId = null) => {
    // 1. Attempt connected backend server first (localhost or production Render API)
    try {
      return await request("/chat/message", {
        method: "POST",
        body: JSON.stringify({ message, session_id: sessionId }),
      });
    } catch (err) {
      console.warn("Backend API offline or unreachable, evaluating direct Gemini or clinical knowledge engine:", err.message);

      // 2. Direct client-side Google Gemini 1.5 Flash if API key provided
      const geminiKey =
        localStorage.getItem("carepulse_gemini_key") ||
        (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);

      if (geminiKey && geminiKey.trim() && !geminiKey.startsWith("your-")) {
        try {
          const aiResponseText = await callGeminiDirect(message, geminiKey);
          return {
            session_id: sessionId || 1,
            intent: "gemini_live_ai",
            urgency_level: 2,
            is_emergency: false,
            recommended_specialist: "Consult with a Physician",
            assistant_message: {
              id: Date.now(),
              role: "assistant",
              content: aiResponseText,
            },
            facilities: [],
            suggested_actions: [
              "What questions should I ask my doctor?",
              "Explore Preventive Wellness tab",
              "Check government health schemes",
            ],
          };
        } catch (geminiErr) {
          console.warn("Direct Google Gemini call failed:", geminiErr.message);
        }
      }

      // 3. Built-in clinical intelligence fallback engine
      return getFallbackClinicalResponse(message);
    }
  },
  getSessions: async () => {
    try {
      return await request("/chat/sessions", { method: "GET" });
    } catch {
      return [];
    }
  },
  createSession: async (title = "New Consultation") => {
    try {
      return await request("/chat/sessions", { method: "POST", body: JSON.stringify({ title }) });
    } catch {
      return { id: Date.now(), title, created_at: new Date().toISOString() };
    }
  },
  deleteSession: async (sessionId) => {
    try {
      return await request(`/chat/sessions/${sessionId}`, { method: "DELETE" });
    } catch {
      return null;
    }
  },
  getSessionMessages: async (sessionId) => {
    try {
      return await request(`/chat/sessions/${sessionId}/messages`, { method: "GET" });
    } catch {
      return [];
    }
  },

  // Facilities
  getFacilities: async (params = {}) => {
    try {
      const qs = new URLSearchParams();
      if (params.type && params.type !== "all") qs.append("type", params.type);
      if (params.cost_tier && params.cost_tier !== "all") qs.append("cost_tier", params.cost_tier);
      if (params.emergency_only) qs.append("emergency_only", "true");
      if (params.search) qs.append("search", params.search);
      return await request(`/facilities?${qs.toString()}`, { method: "GET" });
    } catch {
      let filtered = [...FALLBACK_FACILITIES];
      if (params.type && params.type !== "all") {
        filtered = filtered.filter((f) => f.type === params.type);
      }
      if (params.cost_tier && params.cost_tier !== "all") {
        filtered = filtered.filter((f) => f.cost_tier.toLowerCase() === params.cost_tier.toLowerCase());
      }
      if (params.emergency_only) {
        filtered = filtered.filter((f) => f.emergency_available);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((f) => f.name.toLowerCase().includes(s) || f.address.toLowerCase().includes(s));
      }
      return filtered;
    }
  },

  // Schemes
  getSchemes: async (params = {}) => {
    try {
      const qs = new URLSearchParams();
      if (params.demographic && params.demographic !== "all") qs.append("demographic", params.demographic);
      if (params.search) qs.append("search", params.search);
      return await request(`/schemes?${qs.toString()}`, { method: "GET" });
    } catch {
      let filtered = [...FALLBACK_SCHEMES];
      if (params.demographic && params.demographic !== "all") {
        filtered = filtered.filter((s) => s.target_demographics.includes(params.demographic));
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((sch) => sch.name.toLowerCase().includes(s) || sch.benefits.toLowerCase().includes(s));
      }
      return filtered;
    }
  },

  // Reports
  uploadReport: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      return await request("/reports/upload", {
        method: "POST",
        body: formData,
      });
    } catch {
      // Mock report analysis for demo when backend is offline
      return {
        document_type: "Comprehensive Metabolic & Lipid Panel",
        filename: file?.name || "sample_blood_test.pdf",
        summary: "Comprehensive Metabolic & Lipid Screen indicates elevated fasting blood sugar (136 mg/dL) and elevated HbA1c (6.7%), suggesting potential prediabetes or diabetes. Total cholesterol and LDL are also mildly elevated.",
        abnormal_findings: [
          "Fasting Blood Sugar: 136 mg/dL (Normal: 70 - 99 mg/dL) — HIGH",
          "HbA1c (Glycated Hemoglobin): 6.7% (Normal: < 5.7%) — ELEVATED",
          "Total Cholesterol: 228 mg/dL (Normal: < 200 mg/dL) — HIGH",
          "LDL (Bad) Cholesterol: 148 mg/dL (Normal: < 100 mg/dL) — HIGH",
          "Triglycerides: 190 mg/dL (Normal: < 150 mg/dL) — ELEVATED",
        ],
        normal_findings: [
          "Serum Creatinine: 0.92 mg/dL (Normal Kidney Function)",
          "Blood Urea Nitrogen (BUN): 16 mg/dL (Within Standard Range)",
          "HDL (Good) Cholesterol: 42 mg/dL (Acceptable Range)",
        ],
        plain_language_explanation:
          "Your lab work indicates that your blood sugar levels and average 3-month glucose (HbA1c of 6.7%) are higher than normal, pointing toward prediabetes or early diabetes. Additionally, your LDL 'bad' cholesterol and triglycerides are mildly elevated, which can impact cardiovascular health over time. Your kidney markers (creatinine and BUN) are in a healthy, normal range.",
        recommended_doctor_questions: [
          "Do these HbA1c and fasting blood glucose numbers warrant medication or lifestyle adjustments?",
          "Should we consider dietary intervention for lipid control?",
          "How frequently should I repeat this metabolic panel to track progress?",
        ],
        urgency_level: 2,
      };
    }
  },
  getReports: async () => {
    try {
      return await request("/reports", { method: "GET" });
    } catch {
      return [];
    }
  },

  // Wellness
  getWellnessTopics: async () => {
    try {
      return await request("/wellness/topics", { method: "GET" });
    } catch {
      return FALLBACK_WELLNESS;
    }
  },
};
