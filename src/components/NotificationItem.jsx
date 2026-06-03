import React from "react";
import { statusClass, statusLabel } from "../utils/constants.js";
export default function NotificationItem({ title, action, status, reviewerSector, date, isNew }) {
  const label = statusLabel(status);
  const reviewer = reviewerSector || "Sistema";
  return (
    <div className="notification-row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
      <div className="notification-main" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>{action}</span>
          {isNew && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>
          {title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {`${reviewer} • ${new Date(date).toLocaleString()}`}
        </div>
      </div>
      <div className={`status ${statusClass(status)}`} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}
