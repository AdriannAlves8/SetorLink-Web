import React from "react";
import { statuses, statusLabel } from "../utils/constants.js";

const OPTIONS = [
  "Todos",
  statuses.PENDENTE,
  statuses.EM_ATENDIMENTO,
  statuses.FINALIZADO,
  statuses.REJEITADO
];

export default function StatusFilter({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
      {OPTIONS.map(opt => {
        const active = value === opt;
        const label = opt === "Todos" ? "Todos" : statusLabel(opt);
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
            {label}
          </button>
        );
      })}
    </div>
  );
}
