import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function WellnessPage({ onAskTopic }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopics();
  }, []);

  async function fetchTopics() {
    setLoading(true);
    try {
      const data = await api.getWellnessTopics();
      setTopics(data);
    } catch (err) {
      console.error("Failed to load wellness topics:", err);
    } finally {
      setLoading(false);
    }
  }

  const iconMap = {
    heart: "❤️",
    activity: "📊",
    smile: "🧘",
    moon: "🌙",
    coffee: "🥗",
    shield: "🛡️",
    "check-circle": "💉",
    "user-check": "🦴",
    award: "👶",
  };

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <span className="badge badge-selfcare" style={{ marginBottom: "0.5rem" }}>
          🌿 Evidence-Based Preventive Health
        </span>
        <h2 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--cs-heading)" }}>
          Preventive Care & Lifespan Wellness
        </h2>
        <p style={{ color: "var(--cs-body)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Evidence-based guidance across cardiovascular wellness, metabolic control, mental resilience, adult immunizations, and lifespan screenings.
        </p>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading preventive health topics...</p>
      ) : (
        <div className="cards-grid">
          {topics.map((t) => (
            <div key={t.id} className="card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      background: "var(--primary-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                    }}
                  >
                    {iconMap[t.icon] || "🌱"}
                  </div>
                  <div>
                    <h3 className="card-title" style={{ fontSize: "1rem" }}>{t.title}</h3>
                    <span className="badge badge-cost" style={{ fontSize: "0.7rem" }}>
                      {(t.domain || "general").replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <p style={{ fontSize: "0.85rem", color: "#334155", marginBottom: "0.75rem" }}>
                  {t.summary}
                </p>

                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ fontSize: "0.8rem", color: "var(--secondary)" }}>Actionable Tips:</strong>
                  <ul style={{ paddingLeft: "1.2rem", fontSize: "0.8rem", marginTop: "0.25rem", color: "#475569" }}>
                    {(t.tips || t.key_points || []).map((tip, i) => (
                      <li key={i} style={{ marginBottom: "0.25rem" }}>{tip}</li>
                    ))}
                  </ul>
                </div>

                {t.screening_guidance && (
                  <div style={{ background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.775rem", color: "#64748b" }}>
                    <strong>🔍 Recommended Screening:</strong> {t.screening_guidance}
                  </div>
                )}
              </div>

              <div className="card-footer">
                <button
                  className="btn-primary"
                  style={{ width: "100%", fontSize: "0.85rem" }}
                  onClick={() => onAskTopic(t.suggested_chat_prompt)}
                >
                  Ask AI About This 💬
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
