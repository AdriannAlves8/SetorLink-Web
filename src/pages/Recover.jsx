import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as api from "../services/api.js";
import Logo from "../components/Logo.jsx";

export default function Recover() {
  const loc = useLocation();
  const nav = useNavigate();
  const [userId, setUserId] = useState("");
  const [secret, setSecret] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    let uid = url.searchParams.get("userId") || url.searchParams.get("user") || "";
    let sec = url.searchParams.get("secret") || "";
    if (!uid || !sec) {
      const wrapped = url.searchParams.get("link");
      if (wrapped) {
        try {
          const inner = new URL(wrapped);
          uid = inner.searchParams.get("userId") || inner.searchParams.get("user") || uid;
          sec = inner.searchParams.get("secret") || sec;
        } catch {}
      }
    }
    if (!uid || !sec) {
      const h = new URLSearchParams(String(url.hash || "").replace(/^#/, ""));
      uid = h.get("userId") || h.get("user") || uid;
      sec = h.get("secret") || sec;
      const innerLink = h.get("link");
      if ((!uid || !sec) && innerLink) {
        try {
          const inner = new URL(innerLink);
          uid = inner.searchParams.get("userId") || inner.searchParams.get("user") || uid;
          sec = inner.searchParams.get("secret") || sec;
        } catch {}
      }
    }
    setUserId(String(uid || "").trim());
    setSecret(String(sec || "").trim());
  }, [loc.search, loc.hash]);

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const requestRecovery = async (e) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      await api.requestPasswordRecovery(email);
      setMsg("Enviamos um e-mail com o link de recuperação.");
    } catch (ex) {
      setErr(ex.message || "Falha ao solicitar recuperação");
    } finally {
      setLoading(false);
    }
  };
  const applyRecovery = async (e) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      if (!userId || !secret) { setErr("Link de recuperação inválido ou expirado"); setLoading(false); return; }
      if (!pwd || pwd.length < 6) { setErr("Senha muito curta."); setLoading(false); return; }
      if (pwd === "12345678") { setErr("Escolha uma senha mais forte."); setLoading(false); return; }
      if (pwd !== pwd2) { setErr("Senhas não conferem."); setLoading(false); return; }
      await api.updatePasswordRecovery({ userId, secret, newPassword: pwd, confirmPassword: pwd2 });
      setMsg("Senha atualizada. Você já pode acessar.");
      setTimeout(() => nav("/login"), 1000);
    } catch (ex) {
      setErr(ex.message || "Falha ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  const isLinkMode = !!(userId && secret);

  return (
    <div className="login-full">
      <div className="login-wrapper">
        <div className="login-hero">
          <div className="hero-brand">
            <Logo size={48} src="/logo-icon.png" />
            <div className="hero-text">
              <div className="hero-title">SetorLink</div>
              <div className="hero-sub">Recuperação de senha</div>
            </div>
          </div>
        </div>
        <div className="login-panel">
          <div className="login-box">
            <div className="login-header">
              <div className="login-head-text">
                <div className="title">{isLinkMode ? "Definir nova senha" : "Esqueci minha senha"}</div>
                <div className="subtitle">{isLinkMode ? "Informe e confirme sua nova senha" : "Digite seu e-mail para receber o link"}</div>
              </div>
            </div>
            <form className="form narrow" onSubmit={isLinkMode ? applyRecovery : requestRecovery}>
              {isLinkMode ? (
                <>
                  <div className="form-row">
                    <label>Nova senha</label>
                    <div className="input-group" style={{ position: "relative" }}>
                      <span className="input-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
                      </span>
                      <input type={showPwd ? "text" : "password"} placeholder="Digite a nova senha" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                      <button type="button" className="icon-btn" onClick={() => setShowPwd(s => !s)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                        {showPwd ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 3 16 1 12c.86-1.6 2-3.05 3.34-4.24M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L17.9 17.9" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>Confirmar nova senha</label>
                    <div className="input-group" style={{ position: "relative" }}>
                      <span className="input-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
                      </span>
                      <input type={showPwd2 ? "text" : "password"} placeholder="Confirme a nova senha" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
                      <button type="button" className="icon-btn" onClick={() => setShowPwd2(s => !s)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                        {showPwd2 ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 3 16 1 12c.86-1.6 2-3.05 3.34-4.24M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L17.9 17.9" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="form-row">
                  <label>E-mail</label>
                  <div className="input-group">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>
                    </span>
                    <input type="email" placeholder="email@empresa.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
                  </div>
                </div>
              )}
              {err && <div className="error">{err}</div>}
              {msg && <div className="chip">{msg}</div>}
              <button className="btn primary" type="submit" disabled={loading || (isLinkMode ? (!pwd || !pwd2) : (email.trim() === ""))}>
                {isLinkMode ? (loading ? "Atualizando..." : "Atualizar senha") : (loading ? "Enviando..." : "Enviar link")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
