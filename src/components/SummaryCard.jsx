import React from "react";
import { NavLink } from "react-router-dom";

export default function SummaryCard({ color, title, value, buttonText, buttonTo }) {
  const cls =
    color === "orange" ? "summary-icon orange" :
    color === "green" ? "summary-icon green" :
    color === "red" ? "summary-icon red" : "summary-icon";
  return (
    <div className="card col-4 summary-card">
      <div className="summary-head">
        <div className={cls} />
        <div className="summary-title">{title}</div>
      </div>
      <div className="summary-value">{value}</div>
      {buttonText && buttonTo && (
        <div className="summary-actions">
          <NavLink className="btn" to={buttonTo}>{buttonText}</NavLink>
        </div>
      )}
    </div>
  );
}
