import React, { useEffect, useState } from "react";
import * as api from "../services/api.js";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";

export default function VerifyEmail() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("Processando verificação...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    let userId = url.searchParams.get("userId") || url.searchParams.get("user") || "";
    let secret = url.searchParams.get("secret") || "";
    if (!userId || !secret) {
      const wrapped = url.searchParams.get("link");
      if (wrapped) {
        try {
          const inner = new URL(wrapped);
          userId = inner.searchParams.get("userId") || inner.searchParams.get("user") || userId;
          secret = inner.searchParams.get("secret") || secret;
        } catch {}
      }
    }
    if (!userId || !secret) {
      setMsg("Link inválido.");
      setDone(true);
      return;
    }
    (async () => {
      try {
        await api.updateEmailVerification(userId, secret);
        setMsg("E-mail verificado com sucesso. Redirecionando ao login...");
      } catch (err) {
        setMsg(err.message || "Falha na verificação.");
      } finally {
        setDone(true);
        setTimeout(() => nav("/login"), 2000);
      }
    })();
  }, [nav]);

  return (
    <div className="login-full">
      <div className="login-wrapper">
        <div className="login-hero">
          <div className="hero-brand">
            <Logo size={48} src="/logo-icon.png" />
            <div className="hero-text">
              <div className="hero-title">SetorLink</div>
              <div className="hero-sub">Verificação de e-mail</div>
            </div>
          </div>
        </div>
        <div className="login-panel">
          <div className="login-box">
            <div className="login-header">
              <div className="login-head-text">
                <div className="title">Verificação</div>
                <div className="subtitle">{done ? "Processo concluído" : "Aguarde um momento"}</div>
              </div>
            </div>
            <div className="form narrow">
              <div className="chip" style={{ width: "100%", textAlign: "center", padding: "1rem" }}>{msg}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
