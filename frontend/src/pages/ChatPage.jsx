import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

export default function ChatPage({ user, initialQuery, onClearInitialQuery, onNavigateTab, onTriggerEmergency }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(localStorage.getItem("carepulse_gemini_key") || "");
  const [hasCustomKey, setHasCustomKey] = useState(!!localStorage.getItem("carepulse_gemini_key"));
  const messagesEndRef = useRef(null);
  const chatSectionRef = useRef(null);

  function handleSaveKey() {
    const trimmed = geminiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem("carepulse_gemini_key", trimmed);
      setHasCustomKey(true);
    } else {
      localStorage.removeItem("carepulse_gemini_key");
      setHasCustomKey(false);
    }
    setShowKeyModal(false);
  }

  function handleClearKey() {
    localStorage.removeItem("carepulse_gemini_key");
    setGeminiKeyInput("");
    setHasCustomKey(false);
    setShowKeyModal(false);
  }

  const patientMoodPills = [
    { label: "😊 Feeling Healthy (Wellness Advice)", prompt: "What are 5 essential daily preventive wellness habits for optimal health and immunity?" },
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
              "### Welcome to CarePulse AI Medical Center 👋\n\n" +
              "I'm your 24/7 personal healthcare companion powered by **Google Gemini**. You can describe any symptoms you are experiencing, check diagnostic lab reports, find nearby verified clinics, or check eligibility for government health subsidies.\n\n" +
              "**How are you feeling right now? Tap an option below or describe your health concerns:**",
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

  // Handle external query
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSend(initialQuery);
      onClearInitialQuery();
      scrollToChat();
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Clean up speech synthesis
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function scrollToChat() {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

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
    scrollToChat();

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

  // Text-to-speech audio reader
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
    const cleanText = text
      .replace(/[*#`_~]/g, "")
      .replace(/https?:\/\/\S+/g, "link")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  }

  // Copy advice
  function handleCopy(msgId, text) {
    const cleanText = text.replace(/[*#`_~]/g, "");
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  }

  // Speech-to-text voice mic
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
      return <span className="badge badge-emergency">🚨 Emergency Level 4 (Seek ER Immediately)</span>;
    }
    if (urgency === 3) {
      return <span className="badge badge-urgent">⚠️ Urgent Level 3 (Consult Doctor Today)</span>;
    }
    if (urgency === 2) {
      return <span className="badge badge-routine">ℹ️ Routine Level 2 (Evaluation in 1–3 Days)</span>;
    }
    return <span className="badge badge-selfcare">✅ Safe Level 1 (Self-Care & Monitor)</span>;
  }

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
          <code key={match.index} style={{ background: "rgba(48,123,196,0.1)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
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

  function formatMarkdown(content) {
    if (!content) return null;

    const blocks = content.split(/\n\n+/);

    return blocks.map((block, idx) => {
      const trimmed = block.trim();

      // Heading
      if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
        const title = trimmed.replace(/^###?\s+/, "");
        return (
          <h3 key={idx} className="md-heading">
            <span>🩺</span>
            <span>{parseInlineFormatting(title)}</span>
          </h3>
        );
      }

      // Disclaimer
      if (trimmed.startsWith("---") || trimmed.toLowerCase().includes("**disclaimer:**")) {
        return (
          <div key={idx} className="md-disclaimer-card">
            <span style={{ fontSize: "1.2rem" }}>🛡️</span>
            <div>{parseInlineFormatting(trimmed.replace(/^---\s*/, ""))}</div>
          </div>
        );
      }

      // Numbered items: Public Schemes
      const schemeMatch = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:\s*([\s\S]*)/);
      if (schemeMatch) {
        const [, num, schemeTitle, details] = schemeMatch;
        const subLines = details.split(/\s*-\s+/).filter(Boolean);

        return (
          <div key={idx} className="scheme-rich-card">
            <div className="scheme-card-header">
              <div className="scheme-card-title">
                <span>🏛️</span>
                <span>{num}. {schemeTitle}</span>
              </div>
              <span className="scheme-coverage-pill">Empaneled Scheme</span>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              {subLines.map((line, subIdx) => {
                const isCoverage = line.toLowerCase().includes("*coverage:*");
                const isApply = line.toLowerCase().includes("*where to apply:*") || line.toLowerCase().includes("apply");
                return (
                  <div key={subIdx} className="scheme-detail-row">
                    <span style={{ color: isCoverage ? "#059669" : "#307bc4", fontWeight: 700 }}>
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
                <span>View Full Eligibility & Documents in Schemes Tab</span>
                <span>→</span>
              </button>
            )}
          </div>
        );
      }

      // Bullet lists
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

      return (
        <p key={idx} style={{ marginBottom: "0.85rem", lineHeight: 1.65 }}>
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });
  }

  return (
    <div className="prohealth-page-wrapper">
      {/* =========================================================================
          PROHEALTH HERO BANNER SECTION (ThemeForest ProHealth Layout)
          ========================================================================= */}
      <section className="cs_hero cs_style_1" aria-label="ProHealth Hero">
        <div className="cs_hero_container">
          {/* Left Column: Hero Text & Actions */}
          <div className="cs_hero_text_col">
            <div className="cs_hero_badge">
              <span className="cs_hero_badge_icon">🩺</span>
              <span>All Medical Solutions In One Smart Platform</span>
            </div>

            <h1 className="cs_hero_title">
              Your Most Trusted <br />
              <span>Health Partner</span> For Life.
            </h1>

            <p className="cs_hero_subtitle">
              We are committed to providing you with the best medical, clinical, and healthcare guidance to help you live healthier and happier.
            </p>

            <div className="cs_hero_actions">
              <button className="cs_btn_primary" onClick={scrollToChat}>
                <span>Start AI Consultation</span>
                <span className="cs_btn_icon_circle">→</span>
              </button>

              <button className="cs_btn_secondary" onClick={() => onNavigateTab("facilities")}>
                <span>Find Doctors & Clinics 🏥</span>
              </button>
            </div>

            {/* Quick Hero Statistics */}
            <div className="cs_hero_stats_bar">
              <div className="cs_hero_stat">
                <div className="cs_stat_number">150+</div>
                <div className="cs_stat_label">Verified Clinics</div>
              </div>
              <div className="cs_stat_divider"></div>
              <div className="cs_hero_stat">
                <div className="cs_stat_number">24/7</div>
                <div className="cs_stat_label">AI Clinical Triage</div>
              </div>
              <div className="cs_stat_divider"></div>
              <div className="cs_hero_stat">
                <div className="cs_stat_number">100%</div>
                <div className="cs_stat_label">Free & Confidential</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Doctor Image with Floating Badges */}
          <div className="cs_hero_img_col">
            <div className="cs_hero_img_wrapper">
              <img
                src="/prohealth-hero.jpg"
                alt="CarePulse AI Certified Medical Specialists"
                className="cs_hero_main_img"
              />

              {/* Floating Badge 1: 24/7 Clinical Support */}
              <div className="cs_floating_badge cs_badge_top_left">
                <div className="cs_badge_icon_pulse">❤️</div>
                <div>
                  <div className="cs_badge_title">24/7 Clinical Support</div>
                  <div className="cs_badge_sub">Emergency Ready • Active</div>
                </div>
              </div>

              {/* Floating Badge 2: 99% Satisfaction */}
              <div className="cs_floating_badge cs_badge_bottom_right">
                <div className="cs_badge_stars">⭐⭐⭐⭐⭐</div>
                <div className="cs_badge_title">99% Patient Satisfaction</div>
                <div className="cs_badge_sub">Trusted by thousands</div>
              </div>

              {/* Floating Badge 3: Google Gemini Engine */}
              <div className="cs_floating_badge cs_badge_bottom_left">
                <div className="cs_gemini_logo">⚡</div>
                <div>
                  <div className="cs_badge_title">Google Gemini AI</div>
                  <div className="cs_badge_sub">Sub-second clinical triage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PROHEALTH 4-COLUMN FEATURE SERVICE BOXES
          ========================================================================= */}
      <section className="cs_features_section" aria-label="Healthcare Services">
        <div className="cs_section_header_center">
          <span className="cs_section_subtitle">HEALTHCARE EXCELLENCE</span>
          <h2 className="cs_section_title">Providing Best Medical Services</h2>
        </div>

        <div className="cs_features_grid">
          {/* Box 1: Emergency Care */}
          <div className="cs_feature_card" onClick={onTriggerEmergency}>
            <div className="cs_feature_icon cs_icon_red">🚨</div>
            <h3 className="cs_feature_title">24/7 Emergency Care</h3>
            <p className="cs_feature_desc">
              Instant clinical risk triage, acute chest pain & stroke screening, and direct national ambulance routing.
            </p>
            <div className="cs_feature_link">
              <span>Immediate ER Hotline (112/911)</span>
              <span>→</span>
            </div>
          </div>

          {/* Box 2: Qualified Doctors */}
          <div className="cs_feature_card" onClick={() => onNavigateTab("facilities")}>
            <div className="cs_feature_icon cs_icon_blue">👨‍⚕️</div>
            <h3 className="cs_feature_title">Qualified Specialists</h3>
            <p className="cs_feature_desc">
              Search verified multi-specialty hospitals, trauma centers, and affordable clinics near your neighborhood.
            </p>
            <div className="cs_feature_link">
              <span>Find Nearest Facility</span>
              <span>→</span>
            </div>
          </div>

          {/* Box 3: Public Health Schemes */}
          <div className="cs_feature_card" onClick={() => onNavigateTab("schemes")}>
            <div className="cs_feature_icon cs_icon_teal">🏛️</div>
            <h3 className="cs_feature_title">Govt Health Subsidies</h3>
            <p className="cs_feature_desc">
              Check eligibility for Ayushman Bharat PM-JAY (₹5 Lakh free treatment), JSSK maternal care, and senior waivers.
            </p>
            <div className="cs_feature_link">
              <span>Check Eligibility</span>
              <span>→</span>
            </div>
          </div>

          {/* Box 4: Affordable Generic Meds */}
          <div
            className="cs_feature_card"
            onClick={() => handleSend("Where can I find affordable generic medicines under Jan Aushadhi (PMBJP)?")}
          >
            <div className="cs_feature_icon cs_icon_green">💊</div>
            <h3 className="cs_feature_title">Affordable Medicines</h3>
            <p className="cs_feature_desc">
              Access quality generic medicines at 50% to 90% discount at 10,000+ Jan Aushadhi Kendras.
            </p>
            <div className="cs_feature_link">
              <span>Find Jan Aushadhi Stores</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PATIENT SYMPTOM / MOOD CHECK-IN BAR
          ========================================================================= */}
      <section className="cs_symptom_selector_section">
        <div className="cs_symptom_card">
          <div className="cs_symptom_header">
            <div className="cs_symptom_title_group">
              <h3>✨ Instant Clinical Guidance</h3>
              <p>Choose a common condition below to start immediate AI triage, or type below:</p>
            </div>
          </div>

          <div className="cs_symptom_pills_grid">
            {patientMoodPills.map((sym, idx) => (
              <button
                key={idx}
                className="cs_symptom_pill_btn"
                onClick={() => handleSend(sym.prompt)}
                disabled={loading}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          PROHEALTH CLINICAL AI CONSULTATION CONSOLE
          ========================================================================= */}
      <section className="cs_chat_section" ref={chatSectionRef} aria-label="AI Consultation">
        <div className="cs_chat_container">
          {/* Sessions Sidebar */}
          <aside className="cs_chat_sidebar">
            <button className="cs_btn_primary" onClick={handleCreateNewSession} style={{ width: "100%", justifyContent: "center" }}>
              <span>+</span>
              <span>New Consultation</span>
            </button>

            <div style={{ flex: 1, overflowY: "auto", marginTop: "1rem" }}>
              <div className="cs_sidebar_title_row">
                <span className="cs_sidebar_heading">Saved Consultations</span>
                <span className="cs_sidebar_count">{sessions.length}</span>
              </div>

              {sessions.length === 0 ? (
                <p className="cs_sidebar_empty">
                  {user ? "No past consultations yet. Start one anytime!" : "Sign in to save your consultations across devices."}
                </p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`cs_session_item ${currentSessionId === s.id ? "active" : ""}`}
                    onClick={() => selectSession(s.id)}
                  >
                    <span className="cs_session_title">💬 {s.title}</span>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="cs_session_delete"
                      title="Delete consultation"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Main Chat Interface */}
          <div className="cs_chat_main">
            {/* Top Doctor Bar */}
            <div className="cs_chat_header">
              <div className="cs_doctor_profile">
                <div className="cs_doctor_avatar">🩺</div>
                <div>
                  <div className="cs_doctor_name">Dr. CarePulse AI</div>
                  <div className="cs_doctor_status">
                    <span className="cs_status_dot_small" style={{ background: hasCustomKey ? "#10b981" : "#307bc4" }}></span>
                    <span>
                      {hasCustomKey ? "Active • Live Google Gemini 1.5 AI" : "Active • Clinical Knowledge Engine"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  className="cs_btn_secondary_sm"
                  onClick={() => setShowKeyModal(true)}
                  style={{
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    background: hasCustomKey ? "rgba(16, 185, 129, 0.12)" : "rgba(39, 71, 96, 0.08)",
                    borderColor: hasCustomKey ? "#10b981" : "var(--cs-border)",
                    color: hasCustomKey ? "#047857" : "var(--cs-heading)",
                    fontWeight: 600,
                  }}
                  title="Configure Google Gemini API Key"
                >
                  <span>{hasCustomKey ? "⚡ Live Gemini Active" : "🔑 Connect Gemini Key"}</span>
                </button>

                {messages.length > 1 && (
                  <button className="cs_btn_secondary_sm" onClick={handleCreateNewSession}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Messages Viewport */}
            <div className="cs_messages_viewport">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`cs_bubble_row ${m.role === "user" ? "user" : "ai"} ${m.is_emergency ? "emergency" : ""}`}
                >
                  <div className={`cs_bubble_avatar ${m.role === "user" ? "user" : "ai"}`}>
                    {m.role === "user" ? "👤" : m.is_emergency ? "🚨" : "⚕️"}
                  </div>

                  <div className="cs_bubble_content">
                    {m.role === "assistant" && (
                      <div className="cs_bubble_meta">
                        {renderUrgencyBadge(m.urgency_level, m.is_emergency)}
                        {m.recommended_specialist && (
                          <span className="badge badge-cost">
                            👨‍⚕️ Specialist: {m.recommended_specialist}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Medical Markdown Content */}
                    <div className="cs_markdown_body">{formatMarkdown(m.content)}</div>

                    {/* Message Actions */}
                    {m.role === "assistant" && (
                      <div className="cs_msg_actions_bar">
                        <button
                          className={`cs_btn_msg_action ${speakingMsgId === m.id ? "speaking" : ""}`}
                          onClick={() => handleToggleSpeech(m.id, m.content)}
                          title="Listen to this medical guidance read aloud"
                        >
                          <span>{speakingMsgId === m.id ? "⏹️ Stop" : "🔊 Listen"}</span>
                        </button>

                        <button
                          className="cs_btn_msg_action"
                          onClick={() => handleCopy(m.id, m.content)}
                          title="Copy this guidance to clipboard"
                        >
                          <span>{copiedMsgId === m.id ? "✓ Copied" : "📋 Copy"}</span>
                        </button>

                        {onNavigateTab && (
                          <button
                            className="cs_btn_msg_action"
                            onClick={() => onNavigateTab("facilities")}
                            title="Find nearby clinics for this condition"
                          >
                            <span>🏥 Find Clinic</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Emergency Hotlines */}
                    {m.is_emergency && (
                      <div className="cs_emergency_banner_box">
                        <p className="cs_emergency_headline">
                          🚨 Immediate Emergency Hotlines (24/7):
                        </p>
                        <div className="cs_emergency_hotline_pills">
                          <a href="tel:112" className="btn-emergency" style={{ textDecoration: "none" }}>
                            📞 Dial 112 (National ER)
                          </a>
                          <a href="tel:911" className="btn-emergency" style={{ textDecoration: "none" }}>
                            📞 Dial 911 (US / Canada)
                          </a>
                          <a href="tel:14416" className="cs_btn_outline_dark" style={{ textDecoration: "none" }}>
                            📞 Tele-MANAS Crisis (14416)
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Attached Facilities - only shown when specifically seeking a facility or in an emergency */}
                    {m.facilities && m.facilities.length > 0 && (m.is_emergency || m.intent_tag === "facility_finder" || m.intent_tag === "emergency_triage" || m.urgency_level >= 4) && (
                      <div className="cs_facilities_attached_box">
                        <p className="cs_facilities_attached_title">
                          🏥 Nearby Emergency / Recommended Facilities:
                        </p>
                        <div className="cs_facilities_attached_list">
                          {m.facilities.map((fac) => (
                            <div key={fac.id} className="cs_facility_attached_item">
                              <div>
                                <strong>{fac.name}</strong> ({fac.type} • {fac.cost_tier})
                                <br />
                                <span className="cs_facility_addr">📍 {fac.address}</span>
                              </div>
                              <a href={`tel:${fac.phone}`} className="cs_btn_call">
                                📞 {fac.phone}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Chips */}
                    {m.suggested_actions && m.suggested_actions.length > 0 && (
                      <div className="cs_action_chips_row">
                        {m.suggested_actions.map((action, i) => (
                          <button
                            key={i}
                            className="cs_action_chip"
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
                <div className="cs_bubble_row ai">
                  <div className="cs_bubble_avatar ai">⚕️</div>
                  <div className="cs_bubble_content cs_loading_bubble">
                    <span>Dr. CarePulse is analyzing your health inquiry with Google Gemini</span>
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
            <div className="cs_chat_input_bar">
              <div className="cs_chat_input_row">
                <button
                  type="button"
                  className={`cs_btn_mic ${isListening ? "listening" : ""}`}
                  onClick={handleToggleVoiceInput}
                  title={isListening ? "Listening... click to stop" : "Speak symptoms via microphone"}
                >
                  {isListening ? "🎙️" : "🎤"}
                </button>

                <input
                  type="text"
                  className="cs_chat_input"
                  placeholder={isListening ? "Listening to your voice... speak now" : "Describe your symptoms, or ask about doctors, tests, schemes..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={loading}
                />

                <button
                  className="cs_btn_primary cs_btn_send"
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
      </section>

      {/* Google Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowKeyModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.6rem" }}>🤖</span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--cs-heading)" }}>
                  Google Gemini AI Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "0.2rem",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--cs-body)", lineHeight: 1.6, marginBottom: "1rem" }}>
              Connect your Google Gemini API key to activate live generative medical AI directly in your browser on Vercel without needing an external backend. Without a key, CarePulse AI uses its comprehensive built-in clinical knowledge base.
            </p>

            <div
              style={{
                background: hasCustomKey ? "rgba(16, 185, 129, 0.08)" : "rgba(48, 123, 196, 0.08)",
                border: `1px solid ${hasCustomKey ? "#a7f3d0" : "#bae6fd"}`,
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.82rem",
                color: hasCustomKey ? "#065f46" : "#0369a1",
                fontWeight: 500,
              }}
            >
              <span>{hasCustomKey ? "🟢" : "ℹ️"}</span>
              <span>
                {hasCustomKey
                  ? "Live Google Gemini AI is ACTIVE! Questions are processed directly via Google Generative AI."
                  : "Currently running with Built-in Clinical Intelligence. Add a Gemini key below for live AI."}
              </span>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cs-heading)", marginBottom: "0.4rem" }}>
                Google Gemini API Key (starts with <code>AIzaSy...</code>):
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.9rem",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ marginTop: "0.6rem", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                💡 Don't have a key?{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#307bc4", fontWeight: 600, textDecoration: "underline" }}
                >
                  Get a 100% Free Gemini API Key from Google AI Studio ↗
                </a>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              {hasCustomKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderRadius: "8px",
                    border: "1px solid #ef4444",
                    background: "rgba(239, 68, 68, 0.08)",
                    color: "#dc2626",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{
                  padding: "0.6rem 1.1rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveKey}
                style={{
                  padding: "0.6rem 1.3rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#307bc4",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
