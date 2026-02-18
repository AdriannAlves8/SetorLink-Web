import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sectors } from "../utils/constants.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sector, setSector] = useState(sectors[0]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(sector, password);
      nav("/");
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
          <div className="logo" />
          <div className="login-head-text">
            <div className="title">SetorLink</div>
            <div className="subtitle">Acesse com seu setor e senha</div>
          </div>
        </div>
        <form className="form" onSubmit={submit}>
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
          <div className="form-row">
            <label>Senha</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type="password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="helper">Padrão inicial: 123456</div>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
