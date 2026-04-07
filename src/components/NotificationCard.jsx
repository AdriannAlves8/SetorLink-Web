import React from "react";
import { statusClass, statusLabel } from "../utils/constants.js";

export default function NotificationCard({ title, documentTitle, date, status, onDelete }) {
  const cls = statusClass(status);
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
        <div className="stack" style={{ alignItems: "flex-end", gap: 8 }}>
          <span className={`status ${cls}`}>{statusLabel(status)}</span>
          <button className="btn danger small" onClick={onDelete}>Excluir</button>
        </div>
      </div>
    </div>
  );
}
