import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

export default function ChatPage({ user, initialQuery, onClearInitialQuery, onNavigateTab }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning ☀️";
    if (hour < 17) return "Good afternoon 🌤️";
    return "Good evening 🌙";
  };

  const patientMoodPills = [
    { label: "😊 Feeling Healthy (Wellness Tips)", prompt: "What are 5 essential daily preventive wellness habits for optimal energy and immunity?" },
    { label: "🤒 High Fever & Chills", prompt: "I have a fever of 101°F with chills and body ache since yesterday. What should I do?" },
    { label: "🤕 Throbbing Headache", prompt: "I have had a throbbing migraine and light sensitivity for 2 days. What can help?" },
    { label: "🤢 Stomach Pain & Acidity", prompt: "I am having sharp stomach cramps and burning acidity after meals." },
    { label: "🫀 Chest Tightness / Palpitations", prompt: "I feel tightness in my chest and a racing heartbeat. What are warning signs?" },
    { label: "💊 Cheap Generic Meds (PMBJP)", prompt: "Where can I get affordable generic medicines under Jan Aushadhi and how much can I save?" },
    { label: "📜 Ayushman PM-JAY Scheme", prompt: "What are the exact eligibility criteria, coverage benefits, and application steps for Ayushman Bharat PM-JAY?" },
    { label: "🏥 Free Govt Hospitals Near Me", prompt: "Find free or government hospitals near me that provide emergency and general care." },
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
              "### Welcome to CarePulse AI 👋\n\n" +
              "I'm your 24/7 personal healthcare companion powered by **Google Gemini**. You can describe any symptoms you are feeling, check lab reports, find nearby verified clinics, or check eligibility for government health subsidies.\n\n" +
              "**How are you feeling right now? Tap any option above or describe your health concerns below:**",
            intent_tag: "general_health",
            urgency_level: 1,
            suggested_actions: [
              "I have a fever of 101°F with chills and body ache",
              "What are early warning signs of prediabetes?",
              "How to apply for Ayushman Bharat PM-JAY card?",
              "Find nearest government hospital with ICU",
            ],
          },
        ]);
      }
    }
  }, [user]);

  // Handle external query (from facilities/schemes tab)
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSend(initialQuery);
      onClearInitialQuery();
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
        content: `⚠️ **Clinical Notice:** ${err.message}`,
        urgency_level: 1,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  // Voice Speech Synthesis (Read Aloud)
  function handleToggleSpeech(msgId, text) {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean raw markdown for natural reading
    const cleanText = text
      .replace(/[*#`_~]/g, "")
      .replace(/https?:\/\/\S+/g, "link")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // Gentle, clear clinical pace
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  }

  // Copy advice to clipboard
  function handleCopy(msgId, text) {
    const cleanText = text.replace(/[*#`_~]/g, "");
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  }

  // Voice Input (Speech-to-Text)
  function handleToggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }

  function renderUrgencyBadge(urgency, isEmergency) {
    if (isEmergency || urgency === 4) {
      return <span className="badge badge-emergency">🚨 Emergency Level 4 (Immediate ER Required)</span>;
    }
    if (urgency === 3) {
      return <span className="badge badge-urgent">⚠️ Urgent Level 3 (Consult Doctor Today)</span>;
    }
    if (urgency === 2) {
      return <span className="badge badge-routine">ℹ️ Routine Level 2 (Evaluation in 1–3 Days)</span>;
    }
    return <span className="badge badge-selfcare">✅ Safe Level 1 (Self-Care & Monitor)</span>;
  }

  // Helper to parse inline bold **text** and italic *text*
  function parseInlineFormatting(text) {
    const parts = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index));
      }
      const raw = match[0];
      if (raw.startsWith("**") && raw.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="md-strong-pill">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if (raw.startsWith("*") && raw.endsWith("*")) {
        parts.push(<em key={match.index}>{raw.slice(1, -1)}</em>);
      } else if (raw.startsWith("`") && raw.endsWith("`")) {
        parts.push(
          <code key={match.index} style={{ background: "rgba(99,102,241,0.1)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
            {raw.slice(1, -1)}
          </code>
        );
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    return parts.length > 0 ? parts : text;
  }

  // High-End Rich Formatter for Medical Content & Schemes
  function formatMarkdown(content) {
    if (!content) return null;

    const blocks = content.split(/\n\n+/);

    return blocks.map((block, idx) => {
      const trimmed = block.trim();

      // Heading 3 or 2
      if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
        const title = trimmed.replace(/^###?\s+/, "");
        return (
          <h3 key={idx} className="md-heading">
            <span>🩺</span>
            <span>{parseInlineFormatting(title)}</span>
          </h3>
        );
      }

      // Disclaimer block
      if (trimmed.startsWith("---") || trimmed.toLowerCase().includes("**disclaimer:**")) {
        return (
          <div key={idx} className="md-disclaimer-card">
            <span style={{ fontSize: "1.1rem" }}>🛡️</span>
            <div>{parseInlineFormatting(trimmed.replace(/^---\s*/, ""))}</div>
          </div>
        );
      }

      // Numbered items: Check if it's a structured healthcare scheme or policy (e.g. 1. **Ayushman Bharat...**)
      const schemeMatch = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:\s*([\s\S]*)/);
      if (schemeMatch) {
        const [, num, schemeTitle, details] = schemeMatch;
        // Parse sub-items like - *Coverage:* ..., - *Key Highlight:* ..., - *Where to apply:* ...
        const subLines = details.split(/\s*-\s+/).filter(Boolean);

        return (
          <div key={idx} className="scheme-rich-card">
            <div className="scheme-card-header">
              <div className="scheme-card-title">
                <span>🏛️</span>
                <span>{num}. {schemeTitle}</span>
              </div>
              <span className="scheme-coverage-pill">Official Public Scheme</span>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              {subLines.map((line, subIdx) => {
                const isCoverage = line.toLowerCase().includes("*coverage:*");
                const isApply = line.toLowerCase().includes("*where to apply:*") || line.toLowerCase().includes("apply");
                return (
                  <div key={subIdx} className="scheme-detail-row">
                    <span style={{ color: isCoverage ? "#059669" : "var(--primary)", fontWeight: 700 }}>
                      {isCoverage ? "💰 " : isApply ? "📍 " : "✓ "}
                    </span>
                    <span>{parseInlineFormatting(line)}</span>
                  </div>
                );
              })}
            </div>

            {onNavigateTab && (
              <button
                className="scheme-apply-link"
                onClick={() => onNavigateTab("schemes")}
              >
                <span>Explore Full Eligibility in Schemes Tab</span>
                <span>→</span>
              </button>
            )}
          </div>
        );
      }

      // Bullet lists (- or *)
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split(/\n/).filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "));
        return (
          <ul key={idx} className="md-list">
            {items.map((line, i) => (
              <li key={i} className="md-list-item">
                <span className="md-bullet-icon">✦</span>
                <div>{parseInlineFormatting(line.replace(/^[-*]\s+/, ""))}</div>
              </li>
            ))}
          </ul>
        );
      }

      // Regular paragraph
      return (
        <p key={idx} style={{ marginBottom: "0.85rem", lineHeight: 1.65 }}>
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });
  }

  return (
    <div>
      {/* Patient Hero / Welcome Dashboard */}
      <section className="patient-hero-card" aria-label="Patient Welcome">
        <div className="hero-top-row">
          <div className="hero-greeting">
            <h2>
              <span>{getGreeting()}</span>
              <span>{user ? `, ${user.full_name.split(" ")[0]}` : ""}</span>
              <span>👋</span>
            </h2>
            <p>
              Your clinical AI health guide is ready. Tap an instant check-in symptom below, or describe any questions in private:
            </p>
          </div>

          <div className="hero-trust-badges">
            <div className="trust-badge-pill">
              <span>⚡</span>
              <span><strong>Gemini AI</strong> Active</span>
            </div>
            <div className="trust-badge-pill">
              <span>🔒</span>
              <span><strong>100%</strong> Private</span>
            </div>
            <div className="trust-badge-pill">
              <span>🏥</span>
              <span><strong>16+</strong> Verified Centers</span>
            </div>
          </div>
        </div>

        {/* Quick Symptom & Health Mood Selector */}
        <div className="mood-selector-container">
          <div className="mood-selector-label">
            <span>✨</span>
            <span>Quick Clinical Consultations & Health Topics:</span>
          </div>
          <div className="mood-cards-grid">
            {patientMoodPills.map((sym, idx) => (
              <button
                key={idx}
                className="mood-card-btn"
                onClick={() => handleSend(sym.prompt)}
                disabled={loading}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Chat Interface */}
      <div className="chat-container">
        {/* Sessions Sidebar */}
        <aside className="chat-sidebar">
          <button className="btn-primary" onClick={handleCreateNewSession} style={{ width: "100%" }}>
            <span>+</span>
            <span>New Health Consultation</span>
          </button>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="sidebar-header-row" style={{ margin: "0.5rem 0" }}>
              <span className="sidebar-title">My Consultations</span>
              <span style={{ fontSize: "0.725rem", color: "var(--text-soft)" }}>{sessions.length} Saved</span>
            </div>

            {sessions.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", lineHeight: 1.5, marginTop: "0.5rem" }}>
                {user ? "No past consultations yet. Start one anytime!" : "Sign in to save your consultations securely across devices."}
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`session-item ${currentSessionId === s.id ? "active" : ""}`}
                  onClick={() => selectSession(s.id)}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    💬 {s.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    style={{ color: "var(--text-soft)", fontSize: "0.85rem", marginLeft: "0.5rem" }}
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
          {/* Doctor Status Bar */}
          <div className="chat-header-bar">
            <div className="chat-doctor-status">
              <div className="doctor-avatar-circle">🩺</div>
              <div>
                <div className="doctor-info-title">CarePulse AI Clinical Guide</div>
                <div className="doctor-info-status">
                  <span className="pulse-dot" style={{ position: "static", display: "inline-block", width: "8px", height: "8px" }}></span>
                  <span>Active Now • Powered by Google Gemini</span>
                </div>
              </div>
            </div>

            {messages.length > 1 && (
              <button
                className="btn-outline"
                style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
                onClick={handleCreateNewSession}
              >
                Clear / New Topic
              </button>
            )}
          </div>

          {/* Messages Viewport */}
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

                  {/* Formatted Medical Guidance */}
                  <div>{formatMarkdown(m.content)}</div>

                  {/* Action Bar for AI Responses: Listen Audio, Copy */}
                  {m.role === "assistant" && (
                    <div className="message-actions-bar">
                      <button
                        className={`btn-msg-action ${speakingMsgId === m.id ? "speaking" : ""}`}
                        onClick={() => handleToggleSpeech(m.id, m.content)}
                        title="Listen to this advice read aloud"
                      >
                        <span>{speakingMsgId === m.id ? "⏹️ Stop" : "🔊 Listen"}</span>
                      </button>

                      <button
                        className="btn-msg-action"
                        onClick={() => handleCopy(m.id, m.content)}
                        title="Copy this clinical advice to clipboard"
                      >
                        <span>{copiedMsgId === m.id ? "✓ Copied" : "📋 Copy"}</span>
                      </button>

                      {onNavigateTab && (
                        <button
                          className="btn-msg-action"
                          onClick={() => onNavigateTab("facilities")}
                          title="View nearby clinics for this condition"
                        >
                          <span>🏥 Find Nearest Clinic</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Immediate Emergency Contacts */}
                  {m.is_emergency && (
                    <div
                      style={{
                        marginTop: "1.15rem",
                        padding: "1rem 1.25rem",
                        background: "#fee2e2",
                        borderRadius: "14px",
                        border: "1.5px solid #f87171",
                      }}
                    >
                      <p style={{ fontWeight: 800, color: "#991b1b", marginBottom: "0.6rem", fontSize: "0.92rem" }}>
                        🚨 Immediate 24/7 Emergency Contacts:
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
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
                    <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.85rem" }}>
                      <p style={{ fontSize: "0.825rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        🏥 Nearby Verified Facilities:
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {m.facilities.map((fac) => (
                          <div
                            key={fac.id}
                            style={{
                              padding: "0.75rem 1rem",
                              background: "var(--bg-surface)",
                              borderRadius: "10px",
                              border: "1px solid var(--border)",
                              fontSize: "0.85rem",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <strong>{fac.name}</strong> ({fac.type} • {fac.cost_tier})
                              <br />
                              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>📍 {fac.address}</span>
                            </div>
                            <a href={`tel:${fac.phone}`} className="btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}>
                              📞 {fac.phone}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Suggested Action Chips */}
                  {m.suggested_actions && m.suggested_actions.length > 0 && (
                    <div style={{ marginTop: "0.95rem", display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                      {m.suggested_actions.map((action, i) => (
                        <button
                          key={i}
                          className="action-chip"
                          onClick={() => handleSend(action)}
                        >
                          <span>{action}</span>
                          <span>→</span>
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
                <div className="bubble-content" style={{ display: "flex", alignItems: "center", gap: "0.65rem", color: "var(--text-muted)" }}>
                  <span>Dr. CarePulse is analyzing with Google Gemini</span>
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

          {/* Chat Input Bar with Speech Mic */}
          <div className="chat-input-bar">
            <div className="input-row">
              <button
                type="button"
                className={`btn-mic ${isListening ? "listening" : ""}`}
                onClick={handleToggleVoiceInput}
                title={isListening ? "Listening... click to stop" : "Speak your symptoms using microphone"}
              >
                {isListening ? "🎙️" : "🎤"}
              </button>

              <input
                type="text"
                className="chat-input"
                placeholder={isListening ? "Listening to your voice... speak now" : "Describe symptoms, or ask about doctors, tests, schemes..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
              />

              <button
                className="btn-primary"
                onClick={() => handleSend()}
                disabled={loading || !inputValue.trim()}
              >
                <span>Ask AI</span>
                <span>🩺</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
