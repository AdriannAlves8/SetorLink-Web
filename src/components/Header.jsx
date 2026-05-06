import React from "react";

export default function Header({ title, user, onToggleSidebar }) {
  const avatar = user?.avatar;
  const initials = (user?.name || user?.sector || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="topbar">
      <div className="left">
        <div className="top-title">{title}</div>
      </div>
      <div className="right">
        <div className="avatar">
          {avatar ? (
            <img src={avatar} alt="" onError={(e) => (e.target.style.display = "none")} />
          ) : (
            <span className="avatar-initials">{initials}</span>
          )}
        </div>
        <div className="user-name">{user?.name || user?.sector}</div>
      </div>
    </div>
  );
}
