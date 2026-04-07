import React from "react";
import { NavLink } from "react-router-dom";
import { HomeIcon, SentIcon, ReceivedIcon, ComposeIcon, BellIcon, UserIcon, KeyIcon, LogoutIcon, UserPlusIcon, FileTextIcon } from "./Icons.jsx";
import Logo from "./Logo.jsx";

export default function Sidebar({ items, onLogout }) {
  const iconFor = (name) => {
    switch (name) {
      case "home": return <HomeIcon />;
      case "sent": return <SentIcon />;
      case "received": return <ReceivedIcon />;
      case "compose": return <ComposeIcon />;
      case "user-plus": return <UserPlusIcon />;
      case "bell": return <BellIcon />;
      case "user": return <UserIcon />;
      case "key": return <KeyIcon />;
      case "logout": return <LogoutIcon />;
      case "file-text": return <FileTextIcon />;
      default: return <HomeIcon />;
    }
  };
  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo size={36} src="/logo-icon.png" />
        <div>
          <div className="title">SetorLink</div>
        </div>
      </div>
      <nav className="nav">
        {items.map((item) =>
          item.to ? (
            <NavLink key={item.label} to={item.to} end={item.end} aria-label={item.label}>
              <span className="nav-ico-svg">{iconFor(item.icon)}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ) : (
            <button key={item.label} className="btn" style={{ justifyContent: "flex-start" }} aria-label={item.label}>
              <span className="nav-ico-svg">{iconFor(item.icon)}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          )
        )}
        <button className="btn logout" onClick={onLogout} aria-label="Sair">
          <span className="nav-ico-svg"><LogoutIcon /></span>
          <span className="nav-label">Sair</span>
        </button>
      </nav>
    </aside>
  );
}
