import React from "react";
import { NavLink } from "react-router-dom";
import { HomeIcon, SentIcon, ReceivedIcon, ComposeIcon, BellIcon, UserIcon, KeyIcon, LogoutIcon } from "./Icons.jsx";

export default function Sidebar({ items, onLogout }) {
  const iconFor = (name) => {
    switch (name) {
      case "home": return <HomeIcon />;
      case "sent": return <SentIcon />;
      case "received": return <ReceivedIcon />;
      case "compose": return <ComposeIcon />;
      case "bell": return <BellIcon />;
      case "user": return <UserIcon />;
      case "key": return <KeyIcon />;
      case "logout": return <LogoutIcon />;
      default: return <HomeIcon />;
    }
  };
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo" />
        <div>
          <div className="title">SetorLink</div>
        </div>
      </div>
      <nav className="nav">
        {items.map((item) =>
          item.to ? (
            <NavLink key={item.label} to={item.to} end={item.end} title={item.label} aria-label={item.label}>
              <span className="nav-ico-svg">{iconFor(item.icon)}</span>
              <span>{item.label}</span>
            </NavLink>
          ) : (
            <button key={item.label} className="btn" style={{ justifyContent: "flex-start" }} title={item.label} aria-label={item.label}>
              <span className="nav-ico-svg">{iconFor(item.icon)}</span>
              <span>{item.label}</span>
            </button>
          )
        )}
        <button className="btn logout" onClick={onLogout} title="Sair" aria-label="Sair">
          <span className="nav-ico-svg"><LogoutIcon /></span>
          <span>Sair</span>
        </button>
      </nav>
    </aside>
  );
}
