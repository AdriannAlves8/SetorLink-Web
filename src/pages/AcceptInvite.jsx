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
    <div className="login" style={{ paddingTop: 40 }}>
      <div className="login-box">
        <div className="login-header">
          <Logo size={36} src="/logo.png" />
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
                className="btn primary"
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
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
          </div>
          <div className="form-row">
            <label>Confirmar senha</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type="password" value={pwd2} onChange={(e)=>setPwd2(e.target.value)} placeholder="Repita a senha" />
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
  );
}
