import React from "react";

interface ConfidenceMeterProps {
  confidence: number; // 0 - 1
}

const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ confidence }) => {
  const percent = Math.round(confidence * 100);
  let color = "#ffd860";
  if (confidence >= 0.8) color = "#7bfdbe";
  else if (confidence >= 0.6) color = "#5acefa";
  else if (confidence >= 0.4) color = "#ffe77b";
  else color = "#ffaba0";

  return (
    <div style={{ maxWidth: 250, margin: "30px 0 22px 0" }}>
      <div style={{ fontWeight: 700, color: "#b2f1e8", fontSize: 15.3, marginBottom: 4, letterSpacing: "0.01em" }}>
        Model Confidence
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: 170,
            height: 16,
            borderRadius: 9,
            background: "#1e2433",
            overflow: "hidden",
            marginRight: 18,
            border: "1.2px solid #31467b",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: `linear-gradient(to right, ${color} 45%, #0a2329 110%)`,
              borderRadius: 9,
              transition: "width 0.32s cubic-bezier(.89,-0.02,.09,1.11)",
            }}
          />
        </div>
        <span style={{ color, fontWeight: 800, fontSize: 17 }}>{percent}%</span>
      </div>
    </div>
  );
};

export default ConfidenceMeter;
