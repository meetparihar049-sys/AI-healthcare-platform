import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function FacilityPage({ onAskAboutFacility }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [costFilter, setCostFilter] = useState("all");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchFacilities();
  }, [typeFilter, costFilter, emergencyOnly, searchQuery]);

  async function fetchFacilities() {
    setLoading(true);
    try {
      const data = await api.getFacilities({
        type: typeFilter,
        cost_tier: costFilter,
        emergency_only: emergencyOnly,
        search: searchQuery,
      });
      setFacilities(data);
    } catch (err) {
      console.error("Failed to load facilities:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="badge badge-routine" style={{ marginBottom: "0.5rem" }}>
            📍 Verified Healthcare Network
          </span>
          <h2 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--cs-heading)" }}>
            Find Nearby Clinics, Hospitals & Pharmacies
          </h2>
          <p style={{ color: "var(--cs-body)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Explore verified government civil hospitals, free primary health centers (PHCs), multi-specialty centers, and 24/7 pharmacies.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="🔍 Search by name, specialty (e.g. Cardiology), or locality..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Facility Types</option>
          <option value="Government Hospital">Government Hospital</option>
          <option value="Private Hospital">Private Hospital</option>
          <option value="PHC">Primary Health Centre (PHC)</option>
          <option value="CHC">Community Health Centre (CHC)</option>
          <option value="Clinic">Specialty Clinic</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Telehealth">Telehealth / Virtual</option>
        </select>

        <select
          className="filter-select"
          value={costFilter}
          onChange={(e) => setCostFilter(e.target.value)}
        >
          <option value="all">All Cost Tiers</option>
          <option value="Free">100% Free / Subsidized</option>
          <option value="Low">Low Cost</option>
          <option value="Moderate">Moderate Cost</option>
          <option value="High">Tertiary / Private</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={emergencyOnly}
            onChange={(e) => setEmergencyOnly(e.target.checked)}
          />
          🚨 24/7 Emergency Care Only
        </label>
      </div>

      {/* Facility Cards Grid */}
      {loading ? (
        <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading verified facilities...</p>
      ) : facilities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#475569" }}>No healthcare facilities match your current filters.</p>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.5rem" }}>Try loosening your search term or cost tier filters.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {facilities.map((f) => (
            <div key={f.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{f.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{f.type}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                  {f.emergency_available && (
                    <span className="badge badge-emergency">🚨 24/7 Emergency</span>
                  )}
                  <span className={`badge ${f.cost_tier === "Free" ? "badge-free" : "badge-cost"}`}>
                    {f.cost_tier === "Free" ? "Free / Subsidized" : `${f.cost_tier} Cost`}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <p style={{ marginBottom: "0.5rem" }}>
                  <strong>📍 Address:</strong> {f.address}
                </p>
                <p style={{ marginBottom: "0.5rem" }}>
                  <strong>🕒 Hours:</strong> {f.operating_hours}
                </p>
                <p style={{ marginBottom: "0.5rem" }}>
                  <strong>📞 Phone:</strong> <a href={`tel:${f.phone}`} style={{ color: "var(--primary)", fontWeight: 600 }}>{f.phone}</a>
                </p>
                {f.notes && (
                  <p style={{ fontSize: "0.8rem", color: "#475569", background: "#f8fafc", padding: "0.4rem", borderRadius: "6px", marginBottom: "0.5rem" }}>
                    ℹ️ {f.notes}
                  </p>
                )}
                <div>
                  <strong style={{ fontSize: "0.75rem", color: "#64748b" }}>Specializations:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.25rem" }}>
                    {f.specializations.map((spec, i) => (
                      <span key={i} style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <a href={`tel:${f.phone}`} className="btn-outline" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>
                  📞 Call Facility
                </a>
                <button
                  className="btn-primary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                  onClick={() => onAskAboutFacility(f.name)}
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
