import React from "react";
import { NavLink } from "react-router-dom";
import { statusClass, normalizeStatus } from "../utils/constants.js";

export default function DocumentCard({ title, status, meta1, meta2, actionLabel, actionTo }) {
  const cls = statusClass(status);
  return (
    <div className="doc-card">
      <div className="dc-content">
        <div className="dc-title">{title}</div>
        <div className="dc-meta">
          <div className="doc-sub">{meta1}</div>
          <div className="doc-sub">{meta2}</div>
        </div>
      </div>
      <div className="dc-status">
        <span className={`status ${cls}`}>{normalizeStatus(status)}</span>
      </div>
      <div className="dc-actions">
        <NavLink className="btn primary" to={actionTo}>{actionLabel}</NavLink>
      </div>
    </div>
  );
}
