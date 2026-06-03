import React from "react";
import { statuses } from "../utils/constants.js";

/** Opções de filtro para quem ENVIA (Meus Pedidos / Minhas Notas) */
const SENT_OPTIONS = [
  { label: "Todos", value: "Todos" },
  { label: "Pendentes", value: statuses.PENDENTE },
  { label: "Em Atendimento", value: statuses.EM_ATENDIMENTO },
  { label: "Encaminhados", value: statuses.ENCAMINHADO },
  { label: "Aprovados", value: statuses.APROVADO },
  { label: "Finalizados", value: statuses.FINALIZADO },
  { label: "Recusados", value: statuses.RECUSADO }
];

/** Opções de filtro para quem RECEBE/AVALIA (Fila de Peças / Recebidos) */
const ATTEND_OPTIONS = [
  { label: "Todos", value: "Todos" },
  { label: "Pendentes", value: statuses.PENDENTE },
  { label: "Em Atendimento", value: statuses.EM_ATENDIMENTO },
  { label: "Encaminhados", value: statuses.ENCAMINHADO },
  { label: "Aprovados", value: statuses.APROVADO },
  { label: "Finalizados", value: statuses.FINALIZADO },
  { label: "Recusados", value: statuses.RECUSADO }
];

const VARIANTS = {
  sent: SENT_OPTIONS,
  attend: ATTEND_OPTIONS,
  legacy: SENT_OPTIONS
};

export function matchesStatusFilter(status, filter, variant = "legacy") {
  if (filter === "Todos") return true;
  return status === filter;
}

export default function StatusFilter({ value, onChange, variant = "sent" }) {
  const options = VARIANTS[variant] || SENT_OPTIONS;

  return (
    <div className="status-filter-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`filter-chip ${active ? "active" : ""}`}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: active ? 'var(--primary)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
