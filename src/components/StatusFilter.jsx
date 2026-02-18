import React from "react";
import { statuses } from "../utils/constants.js";

const OPTIONS = ["Todos", statuses.PENDENTE, statuses.APROVADO, statuses.REPROVADO];

export default function StatusFilter({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {OPTIONS.map(opt => {
        const active = value === opt;
        return (
          <button
            key={opt}
            className="btn"
            style={{
              background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
              borderColor: active ? "var(--color-border)" : "transparent"
            }}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
