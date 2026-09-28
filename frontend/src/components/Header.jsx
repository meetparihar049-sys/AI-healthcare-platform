import React from "react";

export default function Header({ activeTab, setActiveTab, user, onOpenAuth, onLogout, onTriggerEmergency }) {
  const tabs = [
    { id: "chat", label: "AI Health Chat", icon: "💬" },
    { id: "facilities", label: "Find Clinics & ER", icon: "🏥" },
    { id: "schemes", label: "Govt Health Schemes", icon: "📋" },
    { id: "reports", label: "Understand Lab Report", icon: "📄" },
    { id: "wellness", label: "Preventive Wellness", icon: "🌿" },
  ];

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-section" onClick={() => setActiveTab("chat")} title="CarePulse AI Home">
          <div className="brand-icon">
            <span className="pulse-dot"></span>
            ⚕️
          </div>
          <div className="brand-text">
            <h1>CarePulse AI</h1>
            <p>Smart & Compassionate Health Guide</p>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Main Navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="btn-emergency"
            onClick={onTriggerEmergency}
            title="Immediate emergency help & hotlines"
          >
            🚨 Emergency (112 / 911)
          </button>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", background: "#f1f5f9", padding: "0.35rem 0.75rem", borderRadius: "9999px" }}>
                👋 {user.full_name}
              </span>
              <button className="btn-auth" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn-auth" onClick={onOpenAuth}>
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
