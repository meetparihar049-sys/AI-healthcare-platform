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
}) {
  const tabs = [
    { id: "chat", label: "Home & AI Chat", icon: "💬" },
    { id: "facilities", label: "Find Clinics & ER", icon: "🏥" },
    { id: "schemes", label: "Govt Health Schemes", icon: "📋" },
    { id: "reports", label: "Understand Lab Report", icon: "📄" },
    { id: "wellness", label: "Preventive Wellness", icon: "🌿" },
  ];

  return (
    <header className="cs_site_header">
      {/* ProHealth Top Contact & Emergency Bar */}
      <div className="cs_topbar">
        <div className="cs_topbar_inner">
          <div className="cs_topbar_left">
            <span className="cs_topbar_item">
              <span className="cs_topbar_icon">📞</span>
              <strong>Hotline:</strong>
              <a href="tel:1234567890">123-456-7890</a>
            </span>
            <span className="cs_topbar_sep">|</span>
            <span className="cs_topbar_item">
              <span className="cs_topbar_icon">🚑</span>
              <strong>Ambulance:</strong>
              <a href="tel:112" style={{ color: "#ef4444", fontWeight: 700 }}>112 / 911</a>
            </span>
            <span className="cs_topbar_sep">|</span>
            <span className="cs_topbar_item cs_topbar_hide_mobile">
              <span className="cs_topbar_icon">📍</span>
              <span>123 Anywhere St., Any City</span>
            </span>
          </div>

          <div className="cs_topbar_right">
            <span className="cs_topbar_status">
              <span className="cs_status_dot"></span>
              <span>24/7 AI Triage Online</span>
            </span>

            <button
              className="cs_theme_toggle"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Switch to CarePulse Daylight Mode" : "Switch to Night Care Mode"}
            >
              <span>{theme === "dark" ? "☀️ Daylight" : "🌙 Night Care"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="cs_main_header">
        <div className="cs_header_inner">
          {/* CarePulse AI Brand Logo */}
          <div className="cs_brand" onClick={() => setActiveTab("chat")} title="CarePulse AI Home">
            <div className="cs_brand_logo_icon">
              <span>⚕️</span>
            </div>
            <div className="cs_brand_text">
              <h2>Care<span>Pulse</span> AI</h2>
              <p>Smart & Compassionate Health Guide</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="cs_nav_menu" aria-label="Main Navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`cs_nav_item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="cs_nav_icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Header Action Buttons */}
          <div className="cs_header_actions">
            <button
              className="btn-emergency"
              onClick={onTriggerEmergency}
              title="Immediate emergency help & ambulance hotlines"
            >
              🚨 Emergency (112/911)
            </button>

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
              <button className="cs_btn_appointment" onClick={onOpenAuth}>
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
