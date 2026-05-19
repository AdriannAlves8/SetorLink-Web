import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import Logo from "../components/Logo.jsx";
import HelpdeskPasswordDialog from "../components/HelpdeskPasswordDialog.jsx";
import { EyeIcon, EyeOffIcon } from "../components/Icons.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [helpdeskOpen, setHelpdeskOpen] = useState(false);

  useEffect(() => {
    if (loc.pathname === "/recuperar" || new URLSearchParams(loc.search).get("recuperar")) {
      setHelpdeskOpen(true);
    }
  }, [loc.pathname, loc.search]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      try {
        const token = localStorage.getItem("setorlink.pushToken") || localStorage.getItem("fcmToken");
        if (token) await api.setUserPushToken(token);
      } catch {}
      const from = loc.state?.from ? loc.state.from : "/";
      nav(from, { replace: true });
    } catch (err) {
      setError(err.message || "Erro ao logar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const i = new Image();
    i.src = "/illustration-login.png";
    i.onload = () => setHasImage(true);
    i.onerror = () => setHasImage(false);
  }, []);

  return (
    <div className="login-full">
      <div className="login-wrapper">
        <div className="login-hero">
          <div className="hero-brand">
            <Logo size={48} src="/logo-icon.png" />
            <div className="hero-text">
              <div className="hero-title">SetorLink</div>
              <div className="hero-sub">Conectando setores da empresa de forma simples e rápida.</div>
            </div>
          </div>
          <div className="hero-illustration">
            {hasImage ? (
              <img
                src="/illustration-login.png"
                srcSet="/illustration-login.png 1x, /illustration-login@2x.png 2x, /illustration-login@3x.png 3x"
                sizes="(min-width: 768px) 480px, 92vw"
                alt="Ilustração SetorLink"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <svg viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg">
                <rect x="40" y="40" width="360" height="200" rx="18" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.12"/>
                <rect x="60" y="70" width="140" height="18" rx="9" fill="currentColor" fillOpacity="0.12"/>
                <rect x="60" y="100" width="300" height="14" rx="7" fill="currentColor" fillOpacity="0.08"/>
                <rect x="60" y="122" width="240" height="14" rx="7" fill="currentColor" fillOpacity="0.08"/>
                <rect x="60" y="144" width="280" height="14" rx="7" fill="currentColor" fillOpacity="0.08"/>
                <circle cx="440" cy="88" r="28" fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeOpacity="0.12"/>
                <rect x="420" y="120" width="40" height="12" rx="6" fill="currentColor" fillOpacity="0.12"/>
                <circle cx="180" cy="260" r="20" fill="currentColor" fillOpacity="0.12"/>
                <rect x="170" y="280" width="20" height="26" rx="6" fill="currentColor" fillOpacity="0.12"/>
                <circle cx="340" cy="248" r="18" fill="currentColor" fillOpacity="0.12"/>
                <rect x="332" y="266" width="18" height="22" rx="5" fill="currentColor" fillOpacity="0.12"/>
              </svg>
            )}
          </div>
        </div>
        <div className="login-panel">
          <div className="login-box">
            <div className="login-header">
              <div className="login-head-text">
                <div className="title">Bem-vindo(a)!</div>
                <div className="subtitle">Insira suas credenciais para continuar</div>
              </div>
            </div>
            <form className="form narrow" onSubmit={submit}>
              <div className="form-row">
                <label>E-mail</label>
                <div className="input-group">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>
                  </span>
                  <input type="email" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <label>Senha</label>
                <div className="input-group input-group--password">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
                  </span>
                  <input type={showPwd ? "text" : "password"} placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button
                    type="button"
                    className="input-password-toggle"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                    title={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPwd ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="error">
                  {error === "EMAIL_NAO_VERIFICADO" ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span>Verifique seu e-mail antes de acessar.</span>
                      <button
                        type="button"
                        className="btn small"
                        onClick={async () => {
                          try {
                            await api.resendVerification();
                            alert("E-mail de verificação reenviado.");
                          } catch {
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
                disabled={loading || !email.trim() || !password.trim()}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
              <div className="forgot">
                <button type="button" className="link-btn" onClick={() => setHelpdeskOpen(true)}>
                  Esqueceu sua senha?
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <HelpdeskPasswordDialog open={helpdeskOpen} onClose={() => setHelpdeskOpen(false)} />
    </div>
  );
}
