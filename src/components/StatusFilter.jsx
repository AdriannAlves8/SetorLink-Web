import React from "react";
import { statuses, statusLabel } from "../utils/constants.js";

const OPTIONS = [
  { label: "Todos", value: "Todos" },
  { label: "Em análise", value: "ANALISE" },
  { label: "Aprovado (Compra)", value: statuses.APROVADO },
  { label: "Finalizado", value: statuses.FINALIZADO },
  { label: "Rejeitado", value: statuses.RECUSADO }
];

export default function StatusFilter({ value, onChange }) {
  return (
    <div className="status-filter-container">
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            className={`filter-chip ${active ? "active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
