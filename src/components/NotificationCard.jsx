import React from "react";
import { statuses } from "../utils/constants.js";

export default function NotificationCard({ title, documentTitle, date, status, onDelete }) {
  const cls = status === statuses.APROVADO ? "aprovado" : status === statuses.REPROVADO ? "reprovado" : "pendente";
  return (
    <div className="notification-card">
      <div className="notification-content">
        <div className="notification-title">{title}</div>
        <div className="notification-meta">
          <span className="notification-doc">Documento: {documentTitle}</span>
          <span className="notification-date">{new Date(date).toLocaleString()}</span>
        </div>
      </div>
      <div className="notification-actions">
        <span className={`status ${cls}`}>{status}</span>
        <button className="btn danger small" onClick={onDelete}>Excluir</button>
      </div>
    </div>
  );
}
