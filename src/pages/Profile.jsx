import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name || user.sector);
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const onAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(f);
  };
  const save = async () => {
    if (!name.trim()) { setErr("Informe um nome válido."); return; }
    setLoading(true); setMsg(null); setErr(null);
    await updateProfile({ sector: user.sector, name, avatar });
    setLoading(false);
    setMsg("Perfil atualizado");
    setTimeout(() => navigate("/"), 800);
  };
  const changePassword = async () => {
    // Atualiza senha e persiste no mock API
    if (!pwd || pwd.length < 4) { setErr("Senha deve ter ao menos 4 caracteres."); return; }
    if (pwd !== pwd2) { setErr("Senhas não conferem."); return; }
    setLoading(true); setMsg(null); setErr(null);
    await updatePassword(pwd);
    setLoading(false);
    setMsg("Senha atualizada");
    setPwd(""); setPwd2("");
    setTimeout(() => navigate("/"), 800);
  };

  return (
    <>
      <div className="content-header">
        <div className="page-title">Perfil</div>
      </div>
      <div className="card col-12">
        <div className="form">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
              {avatar ? <img alt="avatar" src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--color-muted)" }}>IMG</div>}
            </div>
            <input type="file" onChange={onAvatar} />
          </div>
          <div className="form-row">
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn primary" disabled={loading} onClick={save}>Salvar</button>
          {err && <div className="chip" style={{ color: "var(--red)" }}>{err}</div>}
          {msg && <div className="chip" style={{ color: "var(--green)" }}>{msg}</div>}
        </div>
      </div>
      <div className="card col-12" style={{ marginTop: 16 }}>
        <div className="form">
          <div className="form-row">
            <label>Nova senha</label>
            <div style={{ position: "relative" }}>
              <input type={show1 ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Digite a nova senha" />
              <button type="button" className="btn small" onClick={() => setShow1(s => !s)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                {show1 ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
          <div className="form-row">
            <label>Confirmar nova senha</label>
            <div style={{ position: "relative" }}>
              <input type={show2 ? "text" : "password"} value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Confirme a nova senha" />
              <button type="button" className="btn small" onClick={() => setShow2(s => !s)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                {show2 ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
          <button className="btn warning" disabled={loading} onClick={changePassword}>Alterar senha</button>
        </div>
      </div>
    </>
  );
}
