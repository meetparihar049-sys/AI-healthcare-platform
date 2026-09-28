import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function SchemePage({ onAskAboutScheme }) {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demographicFilter, setDemographicFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSchemes();
  }, [demographicFilter, searchQuery]);

  async function fetchSchemes() {
    setLoading(true);
    try {
      const data = await api.getSchemes({
        demographic: demographicFilter,
        search: searchQuery,
      });
      setSchemes(data);
    } catch (err) {
      console.error("Failed to load schemes:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
          📋 Government Healthcare Schemes & Subsidies
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Find public health insurance, free maternal care, generic medicine subsidies, and free specialized treatments available for you and your family.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="🔍 Search scheme name, benefits, or conditions (e.g. dialysis, pregnancy, elderly)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="filter-select"
          value={demographicFilter}
          onChange={(e) => setDemographicFilter(e.target.value)}
        >
          <option value="all">All Beneficiary Groups</option>
          <option value="low_income">Low-Income / BPL Families</option>
          <option value="seniors">Senior Citizens (60+ / 70+)</option>
          <option value="women">Women & Maternal Care</option>
          <option value="children">Children & Infants</option>
          <option value="chronic_disease">Chronic Illness (Dialysis, TB, etc.)</option>
        </select>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading healthcare schemes...</p>
      ) : schemes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#475569" }}>No schemes matched your criteria.</p>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.5rem" }}>Try clearing search keywords or selecting "All Beneficiary Groups".</p>
        </div>
      ) : (
        <div className="cards-grid">
          {schemes.map((s) => (
            <div key={s.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ fontSize: "1rem" }}>{s.name}</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    🏛️ {s.administering_body}
                  </p>
                </div>
                {s.coverage_amount && (
                  <span className="badge badge-routine" style={{ whiteSpace: "nowrap" }}>
                    💰 {s.coverage_amount}
                  </span>
                )}
              </div>

              <div className="card-body">
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ fontSize: "0.8rem", color: "var(--primary)" }}>Key Benefits:</strong>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>{s.benefits}</p>
                </div>

                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ fontSize: "0.8rem", color: "#475569" }}>Who is Eligible:</strong>
                  <ul style={{ paddingLeft: "1.2rem", fontSize: "0.8rem", marginTop: "0.25rem", color: "#334155" }}>
                    {s.eligibility_criteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong style={{ fontSize: "0.8rem", color: "#475569" }}>How to Apply:</strong>
                  <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.2rem" }}>{s.how_to_apply}</p>
                </div>
              </div>

              <div className="card-footer">
                <a
                  href={s.official_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                >
                  Official Portal ↗
                </a>
                <button
                  className="btn-primary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                  onClick={() => onAskAboutScheme(s.name)}
                >
                  Check Eligibility in Chat 💬
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
