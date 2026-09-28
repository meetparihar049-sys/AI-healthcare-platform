import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

export default function ChatPage({ user, initialQuery, onClearInitialQuery }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const samplePrompts = [
    "I have had a throbbing migraine and light sensitivity for 2 days",
    "What are early warning signs of prediabetes?",
    "Find free government hospitals near me",
    "Am I eligible for Ayushman Bharat PM-JAY?",
  ];

  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
      setCurrentSessionId(null);
      // Guest initial welcome
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "### Welcome to CarePulse AI Health Navigator 👋\n\n" +
              "You can ask health questions, describe symptoms, find clinics, or check government healthcare schemes.\n\n" +
              "**How can I assist your health journey today?**",
            intent_tag: "general_health",
            urgency_level: 1,
            suggested_actions: samplePrompts,
          },
        ]);
      }
    }
  }, [user]);

  // Handle external query from Wellness page
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

    // Optimistically add user message
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
        content: `⚠️ **Error communicating with health AI:** ${err.message}`,
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
      return <span className="badge badge-urgent">⚠️ Urgent Level 3 (See Doctor Today)</span>;
    }
    if (urgency === 2) {
      return <span className="badge badge-routine">ℹ️ Level 2 (Routine Evaluation)</span>;
    }
    return <span className="badge badge-selfcare">✅ Level 1 (Self-Care & Monitor)</span>;
  }

  // Format simple markdown into paragraphs and lists
  function formatMarkdown(content) {
    return content.split("\n\n").map((block, idx) => {
      if (block.startsWith("### ")) {
        return <h3 key={idx} style={{ margin: "0.5rem 0", color: "#0f172a" }}>{block.replace("### ", "")}</h3>;
      }
      if (block.startsWith("- ") || block.startsWith("* ")) {
        const items = block.split("\n").map((line, i) => (
          <li key={i} style={{ marginLeft: "1.25rem", marginBottom: "0.25rem" }}>
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
    <div className="chat-container">
      {/* Sessions Sidebar */}
      <aside className="chat-sidebar">
        <button className="btn-primary" onClick={handleCreateNewSession} style={{ width: "100%" }}>
          + New Consultation
        </button>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700, margin: "0.75rem 0" }}>
            Consultation History
          </h2>
          {sessions.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              {user ? "No past consultations yet." : "Sign in to save consultation history."}
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSession(s.id)}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  marginBottom: "0.35rem",
                  cursor: "pointer",
                  background: currentSessionId === s.id ? "var(--primary-light)" : "transparent",
                  color: currentSessionId === s.id ? "var(--primary)" : "#334155",
                  fontWeight: currentSessionId === s.id ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
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

      {/* Main Chat Area */}
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
                      padding: "0.75rem 1rem",
                      background: "#fee2e2",
                      borderRadius: "8px",
                      border: "1px solid #f87171",
                    }}
                  >
                    <p style={{ fontWeight: 700, color: "#991b1b", marginBottom: "0.5rem" }}>
                      Direct Emergency Hotlines:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      <a href="tel:112" className="btn-emergency" style={{ textDecoration: "none" }}>
                        📞 Call 112 (India / EU)
                      </a>
                      <a href="tel:911" className="btn-emergency" style={{ textDecoration: "none" }}>
                        📞 Call 911 (US / Canada)
                      </a>
                      <a href="tel:14416" className="btn-outline" style={{ textDecoration: "none", color: "#991b1b" }}>
                        📞 Tele-MANAS Crisis (14416)
                      </a>
                    </div>
                  </div>
                )}

                {/* Attached Facilities Preview */}
                {m.facilities && m.facilities.length > 0 && (
                  <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem" }}>
                      🏥 Matching Facilities:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {m.facilities.map((fac) => (
                        <div
                          key={fac.id}
                          style={{
                            padding: "0.5rem",
                            background: "white",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.8rem",
                          }}
                        >
                          <strong>{fac.name}</strong> ({fac.type} • {fac.cost_tier})
                          <br />
                          📍 {fac.address} | 📞 <a href={`tel:${fac.phone}`}>{fac.phone}</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Follow-up Actions */}
                {m.suggested_actions && m.suggested_actions.length > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
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
              <div className="bubble-content" style={{ color: "#64748b" }}>
                Analyzing health query and checking clinical safety protocols...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <div className="input-row">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a health question, describe symptoms, or ask about hospitals/schemes..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
            />
            <button className="btn-primary" onClick={() => handleSend()} disabled={loading || !inputValue.trim()}>
              Send 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
