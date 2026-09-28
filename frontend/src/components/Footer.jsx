import React from "react";

export default function Footer({ onNavigateTab, onTriggerEmergency }) {
  return (
    <footer className="cs_footer">
      <div className="cs_footer_top">
        <div className="cs_footer_grid">
          {/* Brand Col */}
          <div className="cs_footer_col">
            <div className="cs_footer_brand">
              <div className="cs_brand_icon">⚕️</div>
              <div className="cs_brand_text">
                <h3>CarePulse AI</h3>
                <p>Smart & Compassionate Health Guide</p>
              </div>
            </div>
            <p className="cs_footer_desc">
              We are committed to providing you with the best clinical, medical, and healthcare guidance to help you live healthier and happier.
            </p>
            <div className="cs_footer_contact_item">
              <span>📍</span>
              <span>123 Anywhere St., Any City 12345</span>
            </div>
            <div className="cs_footer_contact_item">
              <span>📞</span>
              <span>Hotline: 123-456-7890</span>
            </div>
            <div className="cs_footer_contact_item">
              <span>✉️</span>
              <span>support@carepulse.ai</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="cs_footer_col">
            <h4 className="cs_footer_title">Medical Services</h4>
            <ul className="cs_footer_links">
              <li>
                <button onClick={() => onNavigateTab("chat")}>💬 AI Clinical Consultation</button>
              </li>
              <li>
                <button onClick={() => onNavigateTab("facilities")}>🏥 Find Doctors & Clinics</button>
              </li>
              <li>
                <button onClick={() => onNavigateTab("schemes")}>🏛️ Govt Health Schemes (PM-JAY)</button>
              </li>
              <li>
                <button onClick={() => onNavigateTab("reports")}>📄 Diagnostic Report Analyzer</button>
              </li>
              <li>
                <button onClick={() => onNavigateTab("wellness")}>🌿 Preventive Health & Wellness</button>
              </li>
            </ul>
          </div>

          {/* Emergency & Support */}
          <div className="cs_footer_col">
            <h4 className="cs_footer_title">Emergency Hotlines</h4>
            <div className="cs_footer_emergency_box">
              <p>In life-threatening situations, contact certified medical personnel immediately:</p>
              <div className="cs_emergency_pills">
                <a href="tel:112" className="cs_emergency_pill">
                  🚑 112 (National ER)
                </a>
                <a href="tel:911" className="cs_emergency_pill">
                  📞 911 (US / Canada)
                </a>
                <a href="tel:14416" className="cs_emergency_pill">
                  🧠 14416 (Tele-MANAS)
                </a>
              </div>
              <button className="btn-emergency" onClick={onTriggerEmergency} style={{ marginTop: "1rem", width: "100%" }}>
                🚨 Trigger Emergency Alert
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="cs_footer_bottom">
        <div className="cs_footer_bottom_inner">
          <p>© 2026 CarePulse AI. Modern Healthcare Awareness & Access Platform. Powered by Google Gemini AI.</p>
          <div className="cs_footer_disclaimer_note">
            <span>Educational guidance platform. Does not replace professional medical diagnosis.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
