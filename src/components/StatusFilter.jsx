import React from "react";
import { statuses } from "../utils/constants.js";

const SENT_OPTIONS = [
  { label: "Todos", value: "Todos" },
  { label: "Em andamento", value: "EM_ANDAMENTO" },
  { label: "Aprovado (compra)", value: statuses.APROVADO },
  { label: "Finalizado", value: statuses.FINALIZADO },
  { label: "Recusado", value: statuses.RECUSADO }
];

const ATTEND_OPTIONS = [
  { label: "Todos", value: "Todos" },
  { label: "Em análise", value: "EM_ANALISE" },
  { label: "Encaminhado", value: statuses.ENCAMINHADO },
  { label: "Aprovado", value: statuses.APROVADO },
  { label: "Finalizado", value: statuses.FINALIZADO },
  { label: "Recusado", value: statuses.RECUSADO }
];

/** @deprecated use variant="sent" — mantém compatibilidade */
const LEGACY_OPTIONS = [
  { label: "Todos", value: "Todos" },
  { label: "Em análise", value: "ANALISE" },
  { label: "Aprovado (Compra)", value: statuses.APROVADO },
  { label: "Finalizado", value: statuses.FINALIZADO },
  { label: "Rejeitado", value: statuses.RECUSADO }
];

const VARIANTS = {
  sent: SENT_OPTIONS,
  attend: ATTEND_OPTIONS,
  legacy: LEGACY_OPTIONS
};

export function matchesStatusFilter(status, filter, variant = "legacy") {
  const st = status;
  if (filter === "Todos") return true;

  if (variant === "attend" || variant === "legacy") {
    if (filter === "EM_ANALISE" || filter === "ANALISE") {
      return st === statuses.PENDENTE || st === statuses.EM_ATENDIMENTO;
    }
  }

  if (variant === "sent" && filter === "EM_ANDAMENTO") {
    return (
      st === statuses.PENDENTE ||
      st === statuses.EM_ATENDIMENTO ||
      st === statuses.ENCAMINHADO ||
      st === statuses.APROVADO
    );
  }

  return st === filter;
}

export default function StatusFilter({ value, onChange, variant = "legacy" }) {
  const options = VARIANTS[variant] || LEGACY_OPTIONS;

  return (
    <div className="status-filter-container" role="group" aria-label="Filtrar por status">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`filter-chip ${active ? "active" : ""}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
