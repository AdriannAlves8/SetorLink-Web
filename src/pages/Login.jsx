import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { sectors } from "../utils/constants.js";
import * as api from "../services/api.js";
import Logo from "../components/Logo.jsx";

export default function Login() {
  const { login, loginEmail } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [sector, setSector] = useState(sectors[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useEmail, setUseEmail] = useState(true);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const insecure = String(password || "").trim() === "12345678";
      if (insecure) {
        localStorage.setItem("setorlink.forcePwdChange", "1");
      }
      if (useEmail) {
        await loginEmail(email, password);
      } else {
        await login(sector, password);
      }
      try {
        const token = localStorage.getItem("setorlink.pushToken") || localStorage.getItem("fcmToken");
        if (token) await api.setUserPushToken(token);
      } catch {}
      const from = (loc.state && loc.state.from) ? loc.state.from : "/";
      if (String(password || "").trim() === "12345678") {
        nav("/perfil", { replace: true });
      } else {
        nav(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Erro ao logar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-box">
        <div className="login-header">
          <Logo size={36} src="/logo.png" />
          <div className="login-head-text">
            <div className="title">SetorLink</div>
            <div className="subtitle">{useEmail ? "Acesse com seu e-mail e senha" : "Acesse com seu setor e senha"}</div>
          </div>
        </div>
        <form className="form narrow" onSubmit={submit}>
          <div className="auth-toggle">
            <button
              type="button"
              className={`seg ${useEmail ? "active" : ""}`}
              onClick={() => setUseEmail(true)}
            >
              E-mail
            </button>
            <button
              type="button"
              className={`seg ${!useEmail ? "active" : ""}`}
              onClick={() => setUseEmail(false)}
            >
              Setor
            </button>
          </div>
          {useEmail ? (
            <div className="form-row">
              <label>E-mail</label>
              <div className="input-group">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>
                </span>
                <input type="email" placeholder="email@empresa.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="form-row">
              <label>Selecione seu setor</label>
              <div className="input-group">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/></svg>
                </span>
                <select value={sector} onChange={(e) => setSector(e.target.value)}>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="form-row">
            <label>Senha</label>
            <div className="input-group" style={{ position: "relative" }}>
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type={showPwd ? "text" : "password"} placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                title={showPwd ? "Ocultar senha" : "Mostrar senha"}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}
              >
                {showPwd ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 3 16 1 12c.86-1.6 2-3.05 3.34-4.24M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L17.9 17.9" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="error">
              {error === "EMAIL_NAO_VERIFICADO" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>Verifique seu e-mail antes de acessar.</span>
                  <button
                    type="button"
                    className="btn small"
                    onClick={async () => {
                      try {
                        await api.resendVerification();
                        alert("E-mail de verificação reenviado.");
                      } catch (e) {
                        alert("Falha ao reenviar verificação.");
                      }
                    }}
                  >
                    Reenviar verificação
                  </button>
                </div>
              ) : (
                error
              )}
            </div>
          )}
          <button
            className="btn primary"
            type="submit"
            disabled={
              loading ||
              (useEmail ? (email.trim() === "" || password.trim() === "") : (String(sector || "").trim() === "" || password.trim() === ""))
            }
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
