import React from "react";

export default function Header({ activeTab, setActiveTab, user, onOpenAuth, onLogout, onTriggerEmergency }) {
  const tabs = [
    { id: "chat", label: "💬 AI Health Chat", icon: "💬" },
    { id: "facilities", label: "🏥 Facility Directory", icon: "🏥" },
    { id: "schemes", label: "📋 Health Schemes", icon: "📋" },
    { id: "reports", label: "📄 Report Explainer", icon: "📄" },
    { id: "wellness", label: "🌿 Preventive Health", icon: "🌿" },
  ];

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-section" onClick={() => setActiveTab("chat")}>
          <div className="brand-icon">⚕️</div>
          <div className="brand-text">
            <h1>CarePulse AI</h1>
            <p>Healthcare Awareness & Access Platform</p>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Main Navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                👤 {user.full_name}
              </span>
              <button className="btn-auth" onClick={onLogout}>
                Logout
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
