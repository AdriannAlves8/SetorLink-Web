import React, { useState } from "react";

export default function Logo({ size = 36, src }) {
  const [failed, setFailed] = useState(false);
  const s = size;
  if (src && !failed) {
    return (
      <img
        src={src}
        alt="SetorLink"
        width={s}
        height={s}
        onError={() => setFailed(true)}
        style={{ width: s, height: s, borderRadius: 12, objectFit: "contain", background: "#0b1f3b" }}
      />
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" aria-label="SetorLink" style={{ borderRadius: 12 }}>
      <rect width="64" height="64" rx="12" fill="#0b1f3b" />
      <path d="M36 4L12 36h14l-6 24 28-36H34l2-20z" fill="#FFFFFF" />
    </svg>
  );
}
