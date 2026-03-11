import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "../components/Logo.jsx";

export default function AcceptInvite() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const t = qs.get("token") || "";
    if (t) setToken(t);
  }, []);

  const validate = async () => {
    setError(null);
    setInvite(null);
    if (!token) { setError("Informe o token."); return; }
    setValidating(true);
    try {
      const inv = await api.validateInvite(token);
      setInvite(inv);
      setEmail(inv.email || "");
    } catch (err) {
      setError(err.message || "Convite inválido.");
    } finally {
      setValidating(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (!invite) return false;
    if (!email) return false;
    if (!name) return false;
    if (pwd.length < 8) return false;
    if (pwd !== pwd2) return false;
    return true;
  }, [invite, email, name, pwd, pwd2]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!canSubmit) {
      if (!invite) setError("Valide o token antes de criar a conta.");
      else if (!email) setError("Informe um e-mail.");
      else if (!name) setError("Informe seu nome.");
      else if (pwd.length < 8) setError("A senha deve ter pelo menos 8 caracteres.");
      else if (pwd !== pwd2) setError("As senhas não coincidem.");
      return;
    }
    setCreating(true);
    try {
      await api.acceptInvite({ token, email, password: pwd, name });
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err.message || "Falha ao criar conta.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="login-full">
      <div className="login-wrapper">
        <div className="login-hero">
          <div className="hero-brand">
            <Logo size={48} src="/logo-icon.png" />
            <div className="hero-text">
              <div className="hero-title">SetorLink</div>
              <div className="hero-sub">Aceite o convite e crie sua conta</div>
            </div>
          </div>
        </div>
        <div className="login-panel">
          <div className="login-box">
            <div className="login-header">
              <div className="login-head-text">
                <div className="title">Aceitar Convite</div>
                <div className="subtitle">Informe o token e crie sua conta</div>
              </div>
            </div>
            <div className="form narrow">
          <div className="form-row">
            <label>Token</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                  </svg>
                </span>
                <input value={token} onChange={(e)=>setToken(e.target.value)} placeholder="Ex.: A1b2C3" />
              </div>
              <button
                type="button"
                className="btn primary inline"
                onClick={validate}
                disabled={validating}
                style={{ whiteSpace: "nowrap", padding: "10px 16px", fontWeight: 600 }}
              >
                {validating ? "Validando…" : "Validar"}
              </button>
            </div>
          </div>
          {invite && (
            <div className="chip" style={{ marginTop: 8 }}>
              {invite.empresa} • {invite.setor}
            </div>
          )}
          <div className="divider" />
          <div className="form-row">
            <label>Nome</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/></svg>
              </span>
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Seu nome" />
            </div>
          </div>
          <div className="form-row">
            <label>E-mail</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>
              </span>
              <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@empresa.com" />
            </div>
          </div>
          <div className="form-row">
            <label>Senha</label>
            <div className="input-group" style={{ position: "relative" }}>
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type={showPwd1 ? "text" : "password"} value={pwd} onChange={(e)=>setPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPwd1(s => !s)}
                aria-label={showPwd1 ? "Ocultar senha" : "Mostrar senha"}
                title={showPwd1 ? "Ocultar senha" : "Mostrar senha"}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}
              >
                {showPwd1 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 3 16 1 12c.86-1.6 2-3.05 3.34-4.24M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L17.9 17.9" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-row">
            <label>Confirmar senha</label>
            <div className="input-group" style={{ position: "relative" }}>
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type={showPwd2 ? "text" : "password"} value={pwd2} onChange={(e)=>setPwd2(e.target.value)} placeholder="Repita a senha" />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPwd2(s => !s)}
                aria-label={showPwd2 ? "Ocultar senha" : "Mostrar senha"}
                title={showPwd2 ? "Ocultar senha" : "Mostrar senha"}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}
              >
                {showPwd2 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 3 16 1 12c.86-1.6 2-3.05 3.34-4.24M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L17.9 17.9" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          {message && <div className="chip" style={{ color: "var(--green)" }}>{message}</div>}
          <button className="btn primary" onClick={submit} disabled={creating || !canSubmit}>
            {creating ? "Criando..." : "Criar conta"}
          </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
