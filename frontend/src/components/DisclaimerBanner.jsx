import React from "react";

export default function DisclaimerBanner() {
  return (
    <aside className="disclaimer-banner" role="complementary" aria-label="Medical Disclaimer">
      <span>🛡️</span>
      <span>
        <strong>Medical Notice:</strong> CarePulse AI is an educational health guidance platform. It is <strong>not</strong> a medical diagnosis or treatment tool. In life-threatening emergencies, dial <strong>112</strong> (National ERSS) or <strong>108</strong> (Ambulance) immediately.
      </span>
    </aside>
  );
}
