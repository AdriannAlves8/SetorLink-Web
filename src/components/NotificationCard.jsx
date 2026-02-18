import React from "react";
import { statuses } from "../utils/constants.js";

export default function NotificationCard({ title, documentTitle, date, status, reason, onDelete }) {
  const cls = status === statuses.APROVADO ? "aprovado" : status === statuses.REPROVADO ? "reprovado" : "pendente";
  return (
    <div className="doc-card">
      <div className="doc-meta">
        <div className="doc-title">{title}</div>
        <div className="doc-sub">Documento: {documentTitle} • {new Date(date).toLocaleString()}</div>
        {status === statuses.REPROVADO && reason && (
          <div className="doc-sub">Motivo: {reason}</div>
        )}
      </div>
      <div className="doc-actions">
        <span className={`status ${cls}`}>{status}</span>
        <button className="btn danger" onClick={onDelete}>Excluir</button>
      </div>
    </div>
  );
}
