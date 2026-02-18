import React from "react";

export default function Alert({ type = "info", message }) {
  const style = {
    info: { bg: "rgba(11,100,244,0.12)", border: "rgba(11,100,244,0.35)", color: "#0b64f4" },
    warning: { bg: "rgba(255,152,0,0.12)", border: "rgba(255,152,0,0.35)", color: "#FF9800" },
    danger: { bg: "rgba(188,0,31,0.12)", border: "rgba(188,0,31,0.35)", color: "#BC001F" }
  }[type] || {};
  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.color,
      padding: "10px 12px",
      borderRadius: 12,
      marginBottom: 12,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 10
    }}>
      <span aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M4 7V5a4 4 0 018 0v2h1a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 00-4 0v2z" fill="currentColor"/>
        </svg>
      </span>
      <span>{message}</span>
    </div>
  );
}
