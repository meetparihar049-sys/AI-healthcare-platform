import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

export default function ChatPage({ user, initialQuery, onClearInitialQuery }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickSymptoms = [
    { label: "🤕 Throbbing Headache", prompt: "I have had a throbbing migraine and light sensitivity for 2 days" },
    { label: "🤒 High Fever & Chills", prompt: "I have a fever of 101F with body chills since yesterday" },
    { label: "🤢 Stomach Pain & Nausea", prompt: "I am having sharp stomach cramps and nausea after eating" },
    { label: "🏥 Find Free Hospitals", prompt: "Find free or government hospitals near me" },
    { label: "💊 Generic Medicines (PMBJP)", prompt: "Where can I get affordable generic medicines under Jan Aushadhi?" },
    { label: "🛡️ Check Ayushman PM-JAY", prompt: "What are the eligibility criteria and benefits of Ayushman Bharat PM-JAY?" },
  ];

  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
      setCurrentSessionId(null);
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "### Hello! Welcome to CarePulse AI 👋\n\n" +
              "I'm your 24/7 personal health guide. You can describe how you're feeling, ask about unusual symptoms, find top nearby clinics, or check government healthcare subsidies.\n\n" +
              "**How are you feeling right now? Tap a topic below or type your question:**",
            intent_tag: "general_health",
            urgency_level: 1,
            suggested_actions: [
              "I have had a throbbing migraine and light sensitivity for 2 days",
              "What are early warning signs of prediabetes?",
              "Find free government hospitals near me",
              "Am I eligible for Ayushman Bharat PM-JAY?",
            ],
          },
        ]);
      }
    }
  }, [user]);

  // Handle external query
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSend(initialQuery);
      onClearInitialQuery();
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadSessions() {
    try {
      const data = await api.getSessions();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        selectSession(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }

  async function selectSession(sessionId) {
    setCurrentSessionId(sessionId);
    setLoading(true);
    try {
      const msgs = await api.getSessionMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load session messages:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNewSession() {
    if (!user) {
      setMessages([]);
      setCurrentSessionId(null);
      return;
    }
    try {
      const newSession = await api.createSession("New Consultation");
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }

  async function handleDeleteSession(sessionId, e) {
    e.stopPropagation();
    try {
      await api.deleteSession(sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);
      if (currentSessionId === sessionId) {
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }

  async function handleSend(textToSend = null) {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await api.sendMessage(text, currentSessionId);
      if (res.session_id && !currentSessionId) {
        setCurrentSessionId(res.session_id);
        if (user) loadSessions();
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: res.assistant_message.content,
        intent_tag: res.intent,
        urgency_level: res.urgency_level,
        is_emergency: res.is_emergency,
        recommended_specialist: res.recommended_specialist,
        suggested_actions: res.suggested_actions,
        facilities: res.facilities,
        schemes: res.schemes,
        disclaimer: res.disclaimer,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 2,
        role: "assistant",
        content: `⚠️ **Health AI Notice:** ${err.message}`,
        urgency_level: 1,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function renderUrgencyBadge(urgency, isEmergency) {
    if (isEmergency || urgency === 4) {
      return <span className="badge badge-emergency">🚨 Emergency Level 4 (Seek Immediate ER)</span>;
    }
    if (urgency === 3) {
      return <span className="badge badge-urgent">⚠️ Urgent Level 3 (Consult Doctor Today)</span>;
    }
    if (urgency === 2) {
      return <span className="badge badge-routine">ℹ️ Routine Level 2 (Evaluation in 1–3 Days)</span>;
    }
    return <span className="badge badge-selfcare">✅ Safe Level 1 (Self-Care & Monitor)</span>;
  }

  function formatMarkdown(content) {
    return content.split("\n\n").map((block, idx) => {
      if (block.startsWith("### ")) {
        return <h3 key={idx} style={{ margin: "0.6rem 0", color: "#0f172a", fontSize: "1.05rem" }}>{block.replace("### ", "")}</h3>;
      }
      if (block.startsWith("- ") || block.startsWith("* ")) {
        const items = block.split("\n").map((line, i) => (
          <li key={i} style={{ marginLeft: "1.25rem", marginBottom: "0.3rem" }}>
            {line.replace(/^[-*]\s+/, "")}
          </li>
        ));
        return <ul key={idx} style={{ marginBottom: "0.75rem" }}>{items}</ul>;
      }
      return (
        <p key={idx} style={{ marginBottom: "0.75rem" }}>
          {block}
        </p>
      );
    });
  }

  return (
    <div>
      {/* Patient Greeting & Quick Symptom Selector Bar */}
      <div className="patient-hero-card">
        <div className="hero-text">
          <h2>🌟 Hello! How are you feeling today?</h2>
          <p>
            Choose a common symptom or question below to start an instant, confidential clinical guidance consultation:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
            {quickSymptoms.map((sym, idx) => (
              <button
                key={idx}
                className="action-chip"
                onClick={() => handleSend(sym.prompt)}
                disabled={loading}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-pill">
            <div className="stat-num">24/7</div>
            <div className="stat-label">AI Triage</div>
          </div>
          <div className="stat-pill">
            <div className="stat-num">16+</div>
            <div className="stat-label">Verified Centers</div>
          </div>
          <div className="stat-pill">
            <div className="stat-num">100%</div>
            <div className="stat-label">Confidential</div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="chat-container">
        {/* Sessions Sidebar */}
        <aside className="chat-sidebar">
          <button className="btn-primary" onClick={handleCreateNewSession} style={{ width: "100%" }}>
            + New Consultation
          </button>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700, margin: "0.5rem 0" }}>
              My Consultations
            </h2>
            {sessions.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5 }}>
                {user ? "No past consultations yet. Start one anytime!" : "Sign in to save your consultations across devices."}
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  style={{
                    padding: "0.65rem 0.85rem",
                    borderRadius: "10px",
                    marginBottom: "0.4rem",
                    cursor: "pointer",
                    background: currentSessionId === s.id ? "var(--primary-light)" : "transparent",
                    color: currentSessionId === s.id ? "var(--primary)" : "#334155",
                    fontWeight: currentSessionId === s.id ? 700 : 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    💬 {s.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    style={{ color: "#94a3b8", fontSize: "0.85rem", marginLeft: "0.5rem" }}
                    title="Delete consultation"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Conversation Window */}
        <div className="chat-main">
          <div className="messages-viewport">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble-row ${m.role === "user" ? "user" : "ai"} ${m.is_emergency ? "emergency" : ""}`}
              >
                <div className={`bubble-avatar ${m.role === "user" ? "user" : "ai"}`}>
                  {m.role === "user" ? "👤" : m.is_emergency ? "🚨" : "⚕️"}
                </div>

                <div className="bubble-content">
                  {m.role === "assistant" && (
                    <div className="bubble-meta">
                      {renderUrgencyBadge(m.urgency_level, m.is_emergency)}
                      {m.recommended_specialist && (
                        <span className="badge badge-cost">
                          👨‍⚕️ Specialist: {m.recommended_specialist}
                        </span>
                      )}
                    </div>
                  )}

                  <div>{formatMarkdown(m.content)}</div>

                  {/* Emergency Hotline Quick Access */}
                  {m.is_emergency && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.9rem 1.15rem",
                        background: "#fee2e2",
                        borderRadius: "12px",
                        border: "1px solid #f87171",
                      }}
                    >
                      <p style={{ fontWeight: 800, color: "#991b1b", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                        Immediate Emergency Contacts:
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        <a href="tel:112" className="btn-emergency" style={{ textDecoration: "none" }}>
                          📞 Dial 112 (Ambulance / Police)
                        </a>
                        <a href="tel:911" className="btn-emergency" style={{ textDecoration: "none" }}>
                          📞 Dial 911 (US / Canada)
                        </a>
                        <a href="tel:14416" className="btn-outline" style={{ textDecoration: "none", color: "#991b1b" }}>
                          📞 Tele-MANAS Crisis (14416)
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Attached Facilities Preview */}
                  {m.facilities && m.facilities.length > 0 && (
                    <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.85rem" }}>
                      <p style={{ fontSize: "0.825rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem" }}>
                        🏥 Nearby Verified Facilities:
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {m.facilities.map((fac) => (
                          <div
                            key={fac.id}
                            style={{
                              padding: "0.6rem 0.85rem",
                              background: "white",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.825rem",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <strong>{fac.name}</strong> ({fac.type} • {fac.cost_tier})
                              <br />
                              <span style={{ color: "#64748b" }}>📍 {fac.address}</span>
                            </div>
                            <a href={`tel:${fac.phone}`} className="btn-outline" style={{ padding: "0.3rem 0.65rem", fontSize: "0.775rem" }}>
                              📞 {fac.phone}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Suggested Action Chips */}
                  {m.suggested_actions && m.suggested_actions.length > 0 && (
                    <div style={{ marginTop: "0.85rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {m.suggested_actions.map((action, i) => (
                        <button
                          key={i}
                          className="action-chip"
                          onClick={() => handleSend(action)}
                        >
                          {action} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-row ai">
                <div className="bubble-avatar ai">⚕️</div>
                <div className="bubble-content" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b" }}>
                  <span>CarePulse is reviewing your health inquiry</span>
                  <span className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-bar">
            <div className="input-row">
              <input
                type="text"
                className="chat-input"
                placeholder="Describe your symptoms, or ask about doctors, tests, hospitals..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
              />
              <button className="btn-primary" onClick={() => handleSend()} disabled={loading || !inputValue.trim()}>
                Ask AI 🩺
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
