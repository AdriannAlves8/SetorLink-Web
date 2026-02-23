import React from "react";

export default function Header({ title, user, onToggleSidebar }) {
  const avatar = user?.avatar;
  const initials = (user?.name || user?.sector || "U").slice(0, 2).toUpperCase();
  return (
    <div className="topbar">
      <div className="left">
        <div className="top-title">{title}</div>
      </div>
      <div className="right">
        <div className="avatar">
          {avatar ? <img src={avatar} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="user-name">{user?.name || user?.sector}</div>
        <div className="chev">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
