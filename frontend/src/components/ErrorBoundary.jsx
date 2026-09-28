import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CarePulse UI Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "3rem 1.5rem",
          maxWidth: "600px",
          margin: "2rem auto",
          background: "var(--bg-card, #ffffff)",
          border: "1px solid var(--border-light, #e2ebf4)",
          borderRadius: "16px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🩺</div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--cs-heading, #274760)", marginBottom: "0.5rem" }}>
            CarePulse AI Temporary Recovery
          </h3>
          <p style={{ color: "var(--cs-body, #4b657e)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            A temporary component error was intercepted. Your data and consultations are safe.
          </p>
          <button
            className="cs_btn_primary"
            onClick={this.handleReset}
            style={{ margin: "0 auto" }}
          >
            <span>Reload & Refresh CarePulse</span>
            <span className="cs_btn_icon_circle">↻</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
