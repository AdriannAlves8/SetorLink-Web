import React from "react";
import { NavLink } from "react-router-dom";

export default function SummaryCard({ color, title, value, subtitle, buttonText, buttonTo, className = "col-3" }) {
  const cls =
    color === "orange" ? "summary-icon orange" :
    color === "green" ? "summary-icon green" :
    color === "red" ? "summary-icon red" :
    color === "blue" ? "summary-icon blue" : "summary-icon";
    
  return (
    <div className={`card ${className} summary-card-modern`}>
      <div className="summary-top">
        <div className={cls}>
          {color === "orange" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
          {color === "blue" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
          {color === "green" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          {color === "red" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>}
        </div>
        <div className="summary-title">{title}</div>
      </div>
      
      <div className="summary-body">
        <div className="summary-value">{value}</div>
        {subtitle && <div className="summary-subtitle">{subtitle}</div>}
      </div>

      {buttonText && buttonTo && (
        <NavLink className="summary-footer-link" to={buttonTo}>
          {buttonText}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </NavLink>
      )}
    </div>
  );
}
