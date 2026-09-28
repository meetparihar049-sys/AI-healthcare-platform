import React, { useState, useEffect } from "react";
import { api, getToken, setToken } from "./api";
import Header from "./components/Header";
import Footer from "./components/Footer";
import DisclaimerBanner from "./components/DisclaimerBanner";
import AuthModal from "./components/AuthModal";
import ChatPage from "./pages/ChatPage";
import FacilityPage from "./pages/FacilityPage";
import SchemePage from "./pages/SchemePage";
import ReportPage from "./pages/ReportPage";
import WellnessPage from "./pages/WellnessPage";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [initialChatQuery, setInitialChatQuery] = useState("");

  // Theme customization (ProHealth Daylight by default or Night Care)
  const [theme, setTheme] = useState(() => localStorage.getItem("carepulse_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("carepulse_theme", theme);
  }, [theme]);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api
        .getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          setToken(null);
          setUser(null);
        });
    }
  }, []);

  function handleLogout() {
    setToken(null);
    setUser(null);
  }

  function handleSwitchToChatWithQuery(query) {
    setInitialChatQuery(query);
    setActiveTab("chat");
    window.scrollTo({ top: 400, behavior: "smooth" });
  }

  function handleTriggerEmergency() {
    handleSwitchToChatWithQuery("I am experiencing a severe medical emergency right now, please help!");
  }

  function handleToggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <div className="app-container" data-theme={theme}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onTriggerEmergency={handleTriggerEmergency}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <DisclaimerBanner />

      <main className="main-content">
        <ErrorBoundary>
          {activeTab === "chat" && (
            <ChatPage
              user={user}
              initialQuery={initialChatQuery}
              onClearInitialQuery={() => setInitialChatQuery("")}
              onNavigateTab={setActiveTab}
              onTriggerEmergency={handleTriggerEmergency}
            />
          )}

          {activeTab === "facilities" && (
            <FacilityPage
              onAskAboutFacility={(facName) =>
                handleSwitchToChatWithQuery(`Tell me about ${facName} and what conditions they treat best.`)
              }
            />
          )}

          {activeTab === "schemes" && (
            <SchemePage
              onAskAboutScheme={(schemeName) =>
                handleSwitchToChatWithQuery(`What are the exact eligibility documents and application steps for ${schemeName}?`)
              }
            />
          )}

          {activeTab === "reports" && (
            <ReportPage
              onAskInChat={(query) => handleSwitchToChatWithQuery(query)}
            />
          )}

          {activeTab === "wellness" && (
            <WellnessPage
              onAskTopic={(prompt) => handleSwitchToChatWithQuery(prompt)}
            />
          )}
        </ErrorBoundary>
      </main>

      <Footer
        onNavigateTab={setActiveTab}
        onTriggerEmergency={handleTriggerEmergency}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(userData) => setUser(userData)}
      />
    </div>
  );
}
