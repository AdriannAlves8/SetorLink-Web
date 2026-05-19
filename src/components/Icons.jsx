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

export const ExportIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M12 5v9" />
    <path d="M8 8l4-4 4 4" />
    <path d="M5 19h14" />
  </svg>
);

export const UserPlusIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <circle cx="9" cy="7" r="4" />
    <path d="M2 21v-2a8 8 0 0114 0v2" />
    <path d="M17 8h5" />
    <path d="M19.5 5.5v5" />
  </svg>
);

export const UsersIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

export const ShieldIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const LayersIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const FileTextIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const EyeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 011.24-2.33M4.92 4.92A10.07 10.07 0 0112 4c7 0 11 8 11 8a18.45 18.45 0 01-1.24 2.33M1 1l22 22" />
    <path d="M14.12 14.12A3 3 0 119.88 9.88" />
  </svg>
);

export const ActivityIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgProps}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

