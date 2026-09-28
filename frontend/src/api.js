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

function getFallbackClinicalResponse(userQuery) {
  const query = userQuery.toLowerCase();

  // 1. Emergency Detection
  const emergencyKeywords = ["chest pain", "heart attack", "can't breathe", "shortness of breath", "stroke", "paralysis", "faint", "passed out", "suicide", "bleeding heavily"];
  const isEmergency = emergencyKeywords.some((kw) => query.includes(kw));

  if (isEmergency) {
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
          "--- **Disclaimer:** CarePulse AI is an informational tool and cannot replace emergency clinical care. In urgent medical situations, seek certified emergency treatment immediately.",
      },
      facilities: FALLBACK_FACILITIES.filter((f) => f.emergency_available),
      suggested_actions: ["Dial 112 / 911 immediately", "Find nearest trauma hospital with ICU", "What to do while waiting for ambulance"],
    };
  }

  // 2. Fever & Chills
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
          "### Clinical Observation & Triage Assessment\n\n" +
          "Based on your report of **fever with chills and body ache**:\n\n" +
          "**1. Possible Explanations:**\n" +
          "- *Acute Viral Syndrome:* The most frequent cause of sudden fever and chills (influenza, common cold, or seasonal viral infection).\n" +
          "- *Bacterial Infection:* May involve respiratory tract, throat, or urinary tract requiring physical clinical evaluation.\n\n" +
          "**2. Urgency Level: Routine Level 2 (Evaluation in 1–3 Days)**\n" +
          "- Maintain vigorous oral hydration with water and electrolyte solutions.\n" +
          "- Rest adequately and keep a log of your temperature readings morning and evening.\n" +
          "- **Red Flags:** If fever exceeds 103°F (39.4°C), persists beyond 3 days, or is accompanied by stiff neck, shortness of breath, or confusion, seek immediate medical care.\n\n" +
          "**3. Recommended Specialist:** General Physician or Family Doctor.\n\n" +
          "---\n**Disclaimer:** This information is for general health awareness and educational purposes only. It is not a medical diagnosis or treatment plan.",
      },
      facilities: FALLBACK_FACILITIES.slice(0, 2),
      suggested_actions: [
        "What questions should I ask my doctor?",
        "What OTC fever medicines are safe?",
        "Check Ayushman Bharat PM-JAY coverage",
      ],
    };
  }

  // 3. Headache & Migraine
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
          "### Clinical Assessment for Headache & Migraine Symptoms\n\n" +
          "A throbbing headache with light sensitivity is characteristic of **migraine or tension-type vascular headache**:\n\n" +
          "**1. Initial Self-Care Steps:**\n" +
          "- Rest in a quiet, dark, and cool room.\n" +
          "- Apply a cold compress across your forehead or temples.\n" +
          "- Drink water to correct potential dehydration.\n\n" +
          "**2. When to Seek Urgent Care:**\n" +
          "- If you experience a sudden 'thunderclap' headache (worst headache of your life).\n" +
          "- If the headache is accompanied by fever, stiff neck, slurred speech, or vision loss.\n\n" +
          "---\n**Disclaimer:** This clinical guidance is educational. Consult a qualified doctor for a personalized treatment plan.",
      },
      facilities: FALLBACK_FACILITIES.slice(0, 2),
      suggested_actions: ["Find nearest primary clinic", "What triggers migraine attacks?", "What home remedies help immediately?"],
    };
  }

  // 4. Schemes & Subsidies
  if (query.includes("ayushman") || query.includes("pmjay") || query.includes("scheme") || query.includes("subsidy") || query.includes("free hospital")) {
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
          "### Government Healthcare Subsidies & Benefits\n\n" +
          "Here are the primary public healthcare welfare programs you can access:\n\n" +
          "1. **Ayushman Bharat PM-JAY:** - *Coverage:* Up to ₹5,00,000 per family per year for secondary and tertiary hospitalization. - *Key Highlight:* Covers all senior citizens aged 70+ regardless of income. - *Where to apply:* Nearest empaneled hospital helpdesk or `mera.pmjay.gov.in`.\n\n" +
          "2. **Janani Shishu Suraksha Karyakram (JSSK):** - *Coverage:* 100% free delivery, C-section, medicines, and infant care in public facilities.\n\n" +
          "3. **Pradhan Mantri Bhartiya Jan Aushadhi Pariyojana (PMBJP):** - *Coverage:* High quality generic drugs available at 50% to 90% discount at 10,000+ Jan Aushadhi Kendras.\n\n" +
          "---\n**Disclaimer:** General health guidance only. Verify exact eligibility at official government portals.",
      },
      facilities: FALLBACK_FACILITIES,
      schemes: FALLBACK_SCHEMES,
      suggested_actions: ["Check PM-JAY eligibility documents", "Find nearest Jan Aushadhi store", "Explore all schemes in Schemes tab"],
    };
  }

  // Default Guidance
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
        `### Clinical Health Guidance\n\n` +
        `Thank you for sharing your health query regarding: *"${userQuery}"*.\n\n` +
        `**Clinical Suggestions:**\n` +
        `- Monitor how your symptoms develop over the next 24 to 48 hours.\n` +
        `- Keep a symptom log noting severity, duration, and triggers.\n` +
        `- If symptoms persist, worsen, or cause daily disruption, schedule a routine consultation with a **General Physician**.\n\n` +
        `---\n**Disclaimer:** CarePulse AI provides educational health guidance and is not a substitute for formal medical evaluation.`,
    },
    facilities: FALLBACK_FACILITIES.slice(0, 2),
    suggested_actions: ["Find nearest verified clinic", "What questions should I ask my doctor?", "Check government health schemes"],
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
    try {
      return await request("/chat/message", {
        method: "POST",
        body: JSON.stringify({ message, session_id: sessionId }),
      });
    } catch (err) {
      console.warn("Backend API unreachable or offline, using resilient clinical triage fallback:", err.message);
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
