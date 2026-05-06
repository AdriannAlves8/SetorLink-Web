import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast.jsx";

export default function Profile() {
  const { user, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name || user.sector);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [showOld, setShowOld] = useState(false);

  useEffect(() => {
    const force = localStorage.getItem("setorlink.forcePwdChange");
    if (force === "1") {
      setMsg("Por segurança, altere sua senha agora.");
      localStorage.removeItem("setorlink.forcePwdChange");
    }
  }, []);

  const onAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };
  const save = async () => {
    if (!name.trim()) { setErr("Informe um nome válido."); return; }
    setLoading(true); setMsg(null); setErr(null);
    await updateProfile({ sector: user.sector, name, avatar: avatarFile });
    setLoading(false);
    setMsg("Perfil atualizado");
    showToast({ type: "success", message: "Perfil atualizado" });
    setTimeout(() => navigate("/"), 800);
  };
  const changePassword = async () => {
    if (!oldPwd) { setErr("Informe sua senha atual."); return; }
    if (!pwd || pwd.length < 4) { setErr("Senha deve ter ao menos 4 caracteres."); return; }
    if (String(pwd || "").trim() === "12345678") { setErr("Escolha uma senha mais forte."); return; }
    if (pwd !== pwd2) { setErr("Senhas não conferem."); return; }
    setLoading(true); setMsg(null); setErr(null);
    await updatePassword({ currentPassword: oldPwd, newPassword: pwd });
    setLoading(false);
    setMsg("Senha atualizada");
    showToast({ type: "success", message: "Senha atualizada" });
    setOldPwd(""); setPwd(""); setPwd2("");
    setTimeout(() => navigate("/"), 800);
  };

  const initials = (user?.name || user?.sector || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="content-header">
        <div className="page-title">Editar Perfil</div>
        <div className="chip">{user?.sector}</div>
      </div>
      <div className="card col-12">
        <div className="card-header">
          <div className="card-title">Informações da Conta</div>
        </div>
        <div className="form">
          <div className="profile-avatar-row" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div className="avatar profile-avatar">
              {avatarPreview ? (
                <img alt="avatar" src={avatarPreview} />
              ) : (
                <span className="avatar-initials">{initials}</span>
              )}
            </div>
            <div className="stack" style={{ alignItems: "flex-start", flex: "1 1 300px" }}>
              <input type="file" onChange={onAvatar} style={{ width: "100%" }} />
              <div className="helper">Formatos: JPG/PNG • Tamanho recomendado até 2MB</div>
            </div>
          </div>
          <div className="form-row">
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div className="form-row">
            <label>E-mail</label>
            <input value={user.email || ""} readOnly style={{ width: "100%" }} />
          </div>
          <div className="form-row">
            <label>Setor</label>
            <input value={user.sector || ""} readOnly style={{ width: "100%" }} />
          </div>
          {user.empresa && (
            <div className="form-row">
              <label>Empresa</label>
              <input value={user.empresa} readOnly style={{ width: "100%" }} />
            </div>
          )}
          <button className="btn primary" disabled={loading} onClick={save}>Salvar</button>
          {err && <div className="chip" style={{ color: "var(--red)" }}>{err}</div>}
          {msg && <div className="chip" style={{ color: "var(--green)" }}>{msg}</div>}
        </div>
      </div>
      <div className="card col-12" style={{ marginTop: 16 }}>
        <div className="form">
        <div className="card-header">
          <div className="card-title">Segurança</div>
        </div>
          <div className="form-row">
            <label>Senha atual</label>
            <div className="input-group" style={{ position: "relative" }}>
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type={showOld ? "text" : "password"} value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="Digite sua senha atual" style={{ width: "100%" }} />
              <button type="button" className="icon-btn" onClick={() => setShowOld(s => !s)} aria-label={showOld ? "Ocultar senha" : "Mostrar senha"} title={showOld ? "Ocultar senha" : "Mostrar senha"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                {showOld ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 3 16 1 12c.86-1.6 2-3.05 3.34-4.24M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L17.9 17.9" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-row">
            <label>Nova senha</label>
            <div className="input-group" style={{ position: "relative" }}>
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="12" r="3"/><path d="M10 12h10l-2 2 2 2-2 2"/></svg>
              </span>
              <input type={show1 ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Digite a nova senha" style={{ width: "100%" }} />
              <button type="button" className="icon-btn" onClick={() => setShow1(s => !s)} aria-label={show1 ? "Ocultar senha" : "Mostrar senha"} title={show1 ? "Ocultar senha" : "Mostrar senha"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                {show1 ? (
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
              <input type={show2 ? "text" : "password"} value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Confirme a nova senha" style={{ width: "100%" }} />
              <button type="button" className="icon-btn" onClick={() => setShow2(s => !s)} aria-label={show2 ? "Ocultar senha" : "Mostrar senha"} title={show2 ? "Ocultar senha" : "Mostrar senha"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                {show2 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 3 16 1 12c.86-1.6 2-3.05 3.34-4.24M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L17.9 17.9" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <button className="btn warning" disabled={loading} onClick={changePassword}>Alterar senha</button>
        </div>
      </div>
    </>
  );
}
