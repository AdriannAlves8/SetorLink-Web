import React from "react";
import { statuses, statusClass, normalizeStatus } from "../utils/constants.js";
export default function NotificationItem({ title, status, reviewerSector, date, isNew }) {
  const label = normalizeStatus(status);
  return (
    <div className="notification-row">
      <div className="notification-main">
        <div className="notification-title">
          {`Documento: ${title}`}
          {isNew && <span className="notif-dot" aria-hidden="true" />}
        </div>
        <div className="notification-sub">
          {`${label} por: ${reviewerSector || "-"} • ${new Date(date).toLocaleString()}`}
        </div>
      </div>
      <div className={`status ${statusClass(status)}`}>
        {label}
      </div>
    </div>
  );
}
