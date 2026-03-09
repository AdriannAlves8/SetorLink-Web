import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

function renameToJpg(name) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}.jpg`;
}
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 512;
      const maxH = 512;
      let w = img.width;
      let h = img.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const qualities = [0.8, 0.7, 0.6, 0.5];
      const tryQuality = (i) => {
        if (i >= qualities.length) {
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Falha ao comprimir"));
            resolve(new File([blob], renameToJpg(file.name), { type: "image/jpeg" }));
          }, "image/jpeg", qualities[qualities.length - 1]);
          return;
        }
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Falha ao comprimir"));
          if (blob.size <= 2 * 1024 * 1024) {
            resolve(new File([blob], renameToJpg(file.name), { type: "image/jpeg" }));
          } else {
            tryQuality(i + 1);
          }
        }, "image/jpeg", qualities[i]);
      };
      tryQuality(0);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

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

  const onAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    compressImage(f).then((cf) => {
      setAvatarFile(cf);
      const url = URL.createObjectURL(cf);
      setAvatarPreview(url);
    }).catch(() => {
      setAvatarFile(f);
      const url = URL.createObjectURL(f);
      setAvatarPreview(url);
    });
  };
  const save = async () => {
    if (!name.trim()) { setErr("Informe um nome válido."); return; }
    setLoading(true); setMsg(null); setErr(null);
    await updateProfile({ sector: user.sector, name, avatar: avatarFile });
    setLoading(false);
    setMsg("Perfil atualizado");
    setTimeout(() => navigate("/"), 800);
  };
  const changePassword = async () => {
    if (!oldPwd) { setErr("Informe sua senha atual."); return; }
    if (!pwd || pwd.length < 4) { setErr("Senha deve ter ao menos 4 caracteres."); return; }
    if (pwd !== pwd2) { setErr("Senhas não conferem."); return; }
    setLoading(true); setMsg(null); setErr(null);
    await updatePassword({ currentPassword: oldPwd, newPassword: pwd });
    setLoading(false);
    setMsg("Senha atualizada");
    setOldPwd(""); setPwd(""); setPwd2("");
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
              {avatarPreview ? <img alt="avatar" src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--color-muted)" }}>IMG</div>}
            </div>
            <input type="file" accept="image/*" onChange={onAvatar} />
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
            <label>Senha atual</label>
            <div style={{ position: "relative" }}>
              <input type={showOld ? "text" : "password"} value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="Digite sua senha atual" />
              <button type="button" className="btn small" onClick={() => setShowOld(s => !s)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                {showOld ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
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
