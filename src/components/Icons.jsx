import React from "react";

const svgProps = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const HomeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M3 10.5l9-7 9 7" />
    <path d="M5 9v11h14V9" />
    <path d="M10 20v-6h4v6" />
  </svg>
);
export const SentIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M3 11l18-8-8 18-3-7-7-3z" />
  </svg>
);
export const ReceivedIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M8 9l4 4 4-4" />
  </svg>
);
export const ComposeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5l4 4L8 20l-4 .5.5-4 12-13" />
  </svg>
);
export const BellIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2z" />
    <path d="M6 16v-5a6 6 0 1112 0v5l2 2H4l2-2z" />
  </svg>
);
export const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <circle cx="12" cy="7" r="4" />
    <path d="M4 21v-2a8 8 0 0116 0v2" />
  </svg>
);
export const KeyIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <circle cx="7" cy="12" r="3" />
    <path d="M10 12h10l-2 2 2 2-2 2" />
  </svg>
);
export const LogoutIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
