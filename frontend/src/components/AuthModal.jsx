import React, { useState } from "react";
import { api, setToken } from "../api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [ageGroup, setAgeGroup] = useState("adult");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          email,
          password,
          full_name: fullName,
          age_group: ageGroup,
        });
        setToken(res.access_token);
        onAuthSuccess(res.user);
      } else {
        const res = await api.login({ email, password });
        setToken(res.access_token);
        onAuthSuccess(res.user);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {isRegister ? "Create CarePulse Account" : "Sign In to CarePulse"}
          </h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {isRegister && (
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                Full Name
              </label>
              <input
                type="text"
                required
                className="filter-input"
                style={{ width: "100%" }}
                placeholder="Dr. Jane Doe / Patient Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              className="filter-input"
              style={{ width: "100%" }}
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="filter-input"
              style={{ width: "100%" }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                Age Group (Optional context)
              </label>
              <select
                className="filter-select"
                style={{ width: "100%" }}
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              >
                <option value="child">Child (0–12)</option>
                <option value="adolescent">Adolescent (13–18)</option>
                <option value="adult">Adult (19–64)</option>
                <option value="senior">Senior (65+)</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem", color: "#64748b" }}>
          {isRegister ? (
            <span>
              Already have an account?{" "}
              <button
                style={{ color: "var(--primary)", fontWeight: 600 }}
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                style={{ color: "var(--primary)", fontWeight: 600 }}
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                }}
              >
                Create One
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
