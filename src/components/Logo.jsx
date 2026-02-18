import React from "react";

export default function Logo({ size = 36 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-label="SetorLink" style={{ borderRadius: 10 }}>
      <rect x="0" y="0" width="100" height="100" rx="20" fill="var(--primary)" />
      <g fill="#FFFFFF">
        <path d="M50 22c-11 0-20 9-20 20v12c0 3-2 6-5 8l-2 2h54l-2-2c-3-2-5-5-5-8V42c0-11-9-20-20-20zm0 56c6 0 11-5 11-11H39c0 6 5 11 11 11z" />
      </g>
    </svg>
  );
}
