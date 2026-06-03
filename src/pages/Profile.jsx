import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast.jsx";
import Header from "../components/Header.jsx";
import HelpdeskPasswordDialog, {
  HELPDESK_URL,
} from "../components/HelpdeskPasswordDialog.jsx";
import { EyeIcon, EyeOffIcon } from "../components/Icons.jsx";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(
    user?.name || user?.setor || user?.sector || ""
  );

  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar || null
  );

  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [helpdeskOpen, setHelpdeskOpen] = useState(false);

  useEffect(() => {
    setName(user?.name || user?.setor || user?.sector || "");
    setAvatarPreview(user?.avatar || null);
  }, [user]);

  const onAvatar = (e) => {
    const f = e.target.files?.[0];

    if (!f) return;

    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!name.trim()) {
      setErr("Informe um nome válido.");
      return;
    }

    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      await updateProfile({
        sector: user.setor || user.sector,
        name,
        avatar: avatarFile,
      });

      setMsg("Perfil atualizado");

      showToast({
        type: "success",
        message: "Perfil atualizado",
      });

      setTimeout(() => navigate("/"), 800);
    } catch (e) {
      setErr(e.message || "Erro ao salvar perfil");
    } finally {
      setLoading(false);
    }
  };

  const initials = (
    user?.name ||
    user?.setor ||
    user?.sector ||
    "U"
  )
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const displayPassword = user?.senhaTemporaria
    ? String(user.senhaTemporaria)
    : "••••••••••••";

  return (
    <>
      <Header title="Meu perfil" user={user} />

      <div className="page-shell profile-page">
        <div className="profile-grid">

          {/* CONTA */}
          <div className="card profile-card profile-card--account">
            <div className="card-header">
              <div className="card-title">
                Informações da conta
              </div>
            </div>

            <div className="form profile-form">

              <div className="profile-avatar-row">
                <div className="avatar profile-avatar">
                  {avatarPreview ? (
                    <img alt="Avatar" src={avatarPreview} />
                  ) : (
                    <span className="avatar-initials">
                      {initials}
                    </span>
                  )}
                </div>

                <div className="profile-avatar-upload">
                  <label className="profile-avatar-btn">
                    Alterar foto

                    <input
                      type="file"
                      accept="image/*"
                      onChange={onAvatar}
                      className="profile-file-input"
                    />
                  </label>

                  <p className="helper">
                    JPG ou PNG, até 2 MB
                  </p>
                </div>
              </div>

              <div className="profile-fields-grid">

                <div className="form-row">
                  <label>Nome</label>

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>E-mail</label>

                  <input
                    value={user?.email || ""}
                    readOnly
                    className="input-readonly"
                  />
                </div>

                <div className="form-row">
                  <label>Setor</label>

                  <input
                    value={user?.setor || user?.sector || ""}
                    readOnly
                    className="input-readonly"
                  />
                </div>

                {user?.empresa && (
                  <div className="form-row">
                    <label>Empresa</label>

                    <input
                      value={user.empresa}
                      readOnly
                      className="input-readonly"
                    />
                  </div>
                )}

              </div>

              <div className="profile-form-footer">

                <button
                  type="button"
                  className="btn primary"
                  disabled={loading}
                  onClick={save}
                >
                  {loading ? "Salvando…" : "Salvar alterações"}
                </button>

                {err && (
                  <p className="form-feedback form-feedback--error">
                    {err}
                  </p>
                )}

                {msg && (
                  <p className="form-feedback form-feedback--success">
                    {msg}
                  </p>
                )}

              </div>
            </div>
          </div>

          {/* SEGURANÇA */}
          <div className="card profile-card profile-card--security">

            <div className="card-header">
              <div className="card-title">
                Segurança
              </div>
            </div>

            <div className="form profile-form">

              <p className="profile-security-hint">
                A senha é definida e alterada somente pelo suporte.
                Para solicitar uma nova senha, abra um chamado no
                Helpdesk.
              </p>

              <div className="form-row">
                <label>Senha atual</label>

                <div className="input-group input-group--password input-group--secure">

                  <input
                    type={showPwd ? "text" : "password"}
                    value={displayPassword}
                    readOnly
                    className="input-readonly input-secure"
                    autoComplete="off"
                  />

                  <button
                    type="button"
                    className="input-password-toggle"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={
                      showPwd
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                    title={
                      showPwd
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                  >
                    {showPwd ? (
                      <EyeOffIcon size={20} />
                    ) : (
                      <EyeIcon size={20} />
                    )}
                  </button>

                </div>

                {!user?.senhaTemporaria && (
                  <p className="helper">
                    Por segurança, a senha não é exibida em texto.
                    Use a senha fornecida pelo suporte ao entrar.
                  </p>
                )}
              </div>

              <div className="profile-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setHelpdeskOpen(true)}
                >
                  Solicitar alteração de senha
                </button>

                <a
                  href={HELPDESK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn primary"
                >
                  Abrir Helpdesk GS
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>

      <HelpdeskPasswordDialog
        open={helpdeskOpen}
        onClose={() => setHelpdeskOpen(false)}
      />
    </>
  );
}