import React, { useEffect, useState } from "react";

export function showToast({ type = "info", message }) {
  const detail = { id: String(Date.now() + Math.random()), type, message };
  window.dispatchEvent(new CustomEvent("app:toast", { detail }));
}

export default function ToastManager() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail;
      setToasts((list) => [...list, t]);
      setTimeout(() => {
        setToasts((list) => list.filter((x) => x.id !== t.id));
      }, 3000);
    };
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
