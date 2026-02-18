import React from "react";
import { NavLink } from "react-router-dom";
import { statuses } from "../utils/constants.js";

export default function DocumentCard({ title, status, meta1, meta2, actionLabel, actionTo }) {
  const cls = status === statuses.APROVADO ? "aprovado" : status === statuses.REPROVADO ? "reprovado" : "pendente";
  return (
    <div className="doc-card col-4">
      <div className="dc-header">
        <div className="dc-title">{title}</div>
        <span className={`status ${cls}`}>{status}</span>
      </div>
      <div className="dc-body">
        <div className="doc-sub">{meta1}</div>
        <div className="doc-sub">{meta2}</div>
      </div>
      <div className="dc-actions">
        <NavLink className="btn primary" to={actionTo}>{actionLabel}</NavLink>
      </div>
    </div>
  );
}
