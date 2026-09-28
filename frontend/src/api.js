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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const rawText = await response.text();
    let errorDetail = rawText || "An unexpected error occurred.";
    try {
      const errJson = JSON.parse(rawText);
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      // rawText is already string
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/auth/me", { method: "GET" }),

  // Chat
  sendMessage: (message, sessionId = null) =>
    request("/chat/message", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),
  getSessions: () => request("/chat/sessions", { method: "GET" }),
  createSession: (title = "New Consultation") =>
    request("/chat/sessions", { method: "POST", body: JSON.stringify({ title }) }),
  deleteSession: (sessionId) =>
    request(`/chat/sessions/${sessionId}`, { method: "DELETE" }),
  getSessionMessages: (sessionId) =>
    request(`/chat/sessions/${sessionId}/messages`, { method: "GET" }),

  // Facilities
  getFacilities: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.type && params.type !== "all") qs.append("type", params.type);
    if (params.cost_tier && params.cost_tier !== "all") qs.append("cost_tier", params.cost_tier);
    if (params.emergency_only) qs.append("emergency_only", "true");
    if (params.search) qs.append("search", params.search);
    return request(`/facilities?${qs.toString()}`, { method: "GET" });
  },

  // Schemes
  getSchemes: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.demographic && params.demographic !== "all") qs.append("demographic", params.demographic);
    if (params.search) qs.append("search", params.search);
    return request(`/schemes?${qs.toString()}`, { method: "GET" });
  },

  // Reports
  uploadReport: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/reports/upload", {
      method: "POST",
      body: formData,
    });
  },
  getReports: () => request("/reports", { method: "GET" }),

  // Wellness
  getWellnessTopics: () => request("/wellness/topics", { method: "GET" }),
};
