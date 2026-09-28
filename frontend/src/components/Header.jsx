import React from "react";

export default function Header({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onLogout,
  onTriggerEmergency,
  theme,
  onToggleTheme,
  accent,
  onSelectAccent,
}) {
  const tabs = [
    { id: "chat", label: "AI Health Chat", icon: "💬" },
    { id: "facilities", label: "Find Clinics & ER", icon: "🏥" },
    { id: "schemes", label: "Govt Health Schemes", icon: "📋" },
    { id: "reports", label: "Understand Lab Report", icon: "📄" },
    { id: "wellness", label: "Preventive Wellness", icon: "🌿" },
  ];

  const accents = [
    { id: "violet", name: "Modern Violet", class: "violet", emoji: "🔮" },
    { id: "emerald", name: "Healing Mint", class: "emerald", emoji: "🌿" },
    { id: "coral", name: "Warm Sunset", class: "coral", emoji: "🌸" },
    { id: "ocean", name: "Arctic Ocean", class: "ocean", emoji: "🌊" },
  ];

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Brand */}
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

        {/* Navigation Tabs */}
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

        {/* Controls: Theme, Accent, Emergency & Profile */}
        <div className="header-actions">
          {/* Theme & Accent Palette Selector */}
          <div className="theme-accent-bar" title="Customize theme & accent color">
            <button
              className="theme-toggle-btn"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Switch to Daylight Calm Mode" : "Switch to Relaxing Night Care Mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {accents.map((acc) => (
              <span
                key={acc.id}
                className={`accent-pill ${acc.class} ${accent === acc.id ? "active" : ""}`}
                onClick={() => onSelectAccent(acc.id)}
                title={`Accent: ${acc.name}`}
              />
            ))}
          </div>

          {/* Emergency Hotline Button */}
          <button
            className="btn-emergency"
            onClick={onTriggerEmergency}
            title="Immediate emergency help & hotlines"
          >
            🚨 Emergency (112/911)
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className="user-chip">
                <span>👋</span>
                <span>{user.full_name || "Patient"}</span>
              </div>
              <button className="btn-auth" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn-auth" onClick={onOpenAuth}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
