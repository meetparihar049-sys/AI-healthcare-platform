import React, { useState } from "react";
import { api } from "../api";

export default function ReportPage({ onAskInChat }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  async function handleUpload(selectedFile) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");
    setLoading(true);

    try {
      const res = await api.uploadReport(selectedFile);
      setAnalysis(res);
    } catch (err) {
      setError(err.message || "Failed to analyze medical report.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  // Load sample report for instant demonstration
  function handleLoadSample() {
    const sampleBlob = new Blob(
      [
        `METROPOLITAN DIAGNOSTIC LABORATORY
Patient: Sample Patient (Age: 44, Gender: M)
Test Panel: Comprehensive Metabolic & Lipid Screen

Test Name                  Result       Units     Reference Range   Status
-------------------------------------------------------------------------
Fasting Blood Sugar        136          mg/dL     70 - 99           HIGH
HbA1c (Glycated Hb)        6.7          %         < 5.7             ELEVATED
Total Cholesterol          228          mg/dL     < 200             HIGH
Triglycerides              190          mg/dL     < 150             HIGH
HDL Cholesterol            42           mg/dL     > 40              NORMAL
LDL Cholesterol            148          mg/dL     < 100             HIGH
Serum Creatinine           0.92         mg/dL     0.7 - 1.2         NORMAL
Blood Urea Nitrogen (BUN)  16           mg/dL     7 - 20            NORMAL
Total Bilirubin            0.8          mg/dL     0.2 - 1.2         NORMAL
Alanine Aminotransferase   32           U/L       7 - 56            NORMAL
White Blood Cell Count     6,800        /mcL      4,500 - 11,000    NORMAL
Hemoglobin                 14.5         g/dL      13.5 - 17.5       NORMAL
`
      ],
      { type: "text/plain" }
    );
    const sampleFile = new File([sampleBlob], "sample_metabolic_lab_report.pdf", { type: "application/pdf" });
    handleUpload(sampleFile);
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
          📄 Medical Report Explainer
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Upload blood tests, imaging reports, or diagnostic panels (PDF, PNG, JPG) to receive a clear, plain-language translation of complex medical metrics.
        </p>
      </div>

      {/* Upload Box */}
      <div
        className="dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById("report-file-input").click()}
      >
        <input
          id="report-file-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📑</div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.25rem" }}>
          Click to upload or drag & drop medical report
        </h3>
        <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Supports PDF, PNG, JPG up to 10MB
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1rem" }}>
        <button className="btn-outline" onClick={handleLoadSample} disabled={loading}>
          ✨ Test with Sample Lab Report (Blood Sugar & Lipids)
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--primary)" }}>
          <p style={{ fontWeight: 600, fontSize: "1rem" }}>Extracting text and translating medical terms...</p>
        </div>
      )}

      {error && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Analysis Results Display */}
      {analysis && !loading && (
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Header Card */}
          <div style={{ background: "white", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="badge badge-routine" style={{ marginBottom: "0.35rem" }}>
                📋 {analysis.document_type}
              </span>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                Analysis for: {analysis.filename}
              </h3>
            </div>
            <button
              className="btn-primary"
              onClick={() => onAskInChat(`Explain my ${analysis.document_type} findings in more detail`)}
            >
              Ask AI in Chat 💬
            </button>
          </div>

          {/* Abnormal vs Normal Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Abnormal / Flagged */}
            <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "1.25rem", borderRadius: "12px" }}>
              <h4 style={{ color: "#b45309", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                ⚠️ Noteworthy / Flagged Markers
              </h4>
              <ul style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", color: "#78350f" }}>
                {analysis.abnormal_findings.map((f, i) => (
                  <li key={i} style={{ marginBottom: "0.4rem" }}>{f}</li>
                ))}
              </ul>
            </div>

            {/* Normal */}
            <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", padding: "1.25rem", borderRadius: "12px" }}>
              <h4 style={{ color: "#15803d", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                ✅ Standard / Normal Markers
              </h4>
              <ul style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", color: "#14532d" }}>
                {analysis.normal_findings.map((f, i) => (
                  <li key={i} style={{ marginBottom: "0.4rem" }}>{f}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Plain Language Translation */}
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
              💡 Plain-Language Health Translation
            </h4>
            <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#334155", whiteSpace: "pre-wrap" }}>
              {analysis.plain_language_explanation}
            </div>
          </div>

          {/* Doctor Questions Checklist */}
          <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
              🩺 Questions to Ask Your Physician:
            </h4>
            <ul style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", color: "#475569" }}>
              {analysis.recommended_doctor_questions.map((q, i) => (
                <li key={i} style={{ marginBottom: "0.4rem" }}>
                  "{q}"
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
