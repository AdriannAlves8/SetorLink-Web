import React, { useState } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLES, ROLE_INFO, ALL_ROLES } from "../utils/acl.js";
import { ShieldIcon } from "../components/Icons.jsx";
import { NavLink } from "react-router-dom";
import * as api from "../services/api.js";

const ROLE_ACCENT = {
  [ROLES.SUPORTE]: { bg: "rgba(124, 58, 237, 0.12)", color: "#6d28d9", border: "rgba(124, 58, 237, 0.25)" },
  [ROLES.GESTOR]: { bg: "rgba(37, 99, 235, 0.12)", color: "var(--primary)", border: "rgba(37, 99, 235, 0.25)" },
  [ROLES.OPERADOR]: { bg: "rgba(22, 163, 74, 0.12)", color: "#15803d", border: "rgba(22, 163, 74, 0.25)" }
};

export default function PermissionManager() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(ROLES.GESTOR);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);

  const info = ROLE_INFO[selectedRole];
  const accent = ROLE_ACCENT[selectedRole];

  const handleSyncDefaults = async () => {
    if (!window.confirm(
      "Isso vai aplicar as permissões padrão de cada perfil (Suporte, Gestor, Operador) no banco. Continuar?"
    )) {
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      await api.adminSyncRoleDefaults();
      setMessage({ type: "success", text: "Perfis sincronizados com sucesso." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao sincronizar." });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Header title="Perfis e permissões" user={user} />

      <div className="page-shell">
        <section className="permissions-intro card">
          <div className="permissions-intro__icon">
            <ShieldIcon size={26} />
          </div>
          <div className="permissions-intro__text">
            <h2 className="permissions-intro__title">Três perfis fixos</h2>
            <p>
              Cada usuário recebe um perfil: <strong>Suporte</strong>, <strong>Gestor</strong> ou{" "}
              <strong>Operador</strong>. Para alterar o acesso, edite o perfil em{" "}
              <NavLink to="/admin/usuarios">Gerenciar Usuários</NavLink>.
            </p>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={handleSyncDefaults}
            disabled={syncing}
          >
            {syncing ? "Sincronizando…" : "Sincronizar com o banco"}
          </button>
        </section>

        {message && (
          <div className={`permissions-alert permissions-alert--${message.type}`} role="status">
            {message.text}
          </div>
        )}

        <div className="permissions-layout">
          <aside className="permissions-roles card">
            <h3 className="permissions-roles__title">Escolha um perfil</h3>
            <div className="permissions-roles__list">
              {ALL_ROLES.map((roleId) => {
                const r = ROLE_INFO[roleId];
                const active = selectedRole === roleId;
                const a = ROLE_ACCENT[roleId];
                return (
                  <button
                    key={roleId}
                    type="button"
                    className={`permissions-role-btn${active ? " permissions-role-btn--active" : ""}`}
                    onClick={() => setSelectedRole(roleId)}
                    style={active ? { borderColor: a.border, background: a.bg } : undefined}
                  >
                    <span
                      className="permissions-role-btn__badge"
                      style={{ background: a.bg, color: a.color }}
                    >
                      {r.nome}
                    </span>
                    <span className="permissions-role-btn__desc">{r.descricao}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="permissions-detail card">
            <header
              className="permissions-detail__header"
              style={{ borderColor: accent.border, background: accent.bg }}
            >
              <h3 className="permissions-detail__title">{info.nome}</h3>
              <p className="permissions-detail__subtitle">{info.descricao}</p>
            </header>

            <div className="permissions-detail__body">
              <h4 className="permissions-detail__label">Este perfil pode</h4>
              <ul className="permissions-capabilities">
                {info.capacidades.map((cap) => (
                  <li key={cap}>
                    <span className="permissions-capabilities__check" aria-hidden>✓</span>
                    {cap}
                  </li>
                ))}
              </ul>

              <div className="permissions-tip">
                <strong>Como usar:</strong> não é necessário marcar permissões manualmente.
                Ao criar ou editar um usuário, selecione o perfil adequado.
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
