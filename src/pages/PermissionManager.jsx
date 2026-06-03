import React, { useState, useEffect, useMemo } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { PERMISSIONS, ROLES, ROLE_INFO } from "../utils/acl.js";
import { ShieldIcon } from "../components/Icons.jsx";
import { showToast } from "../components/Toast.jsx";
import * as api from "../services/api.js";

const GROUPS = [
  { id: "admin", title: "Gestão administrativa", keys: Object.values(PERMISSIONS).filter((p) => p.startsWith("admin.")) },
  { id: "orders", title: "Operações de pedidos", keys: Object.values(PERMISSIONS).filter((p) => p.startsWith("orders.")) },
  { id: "notas", title: "Notas fiscais", keys: Object.values(PERMISSIONS).filter((p) => p.startsWith("notas.")) },
  { id: "system", title: "Recursos do sistema", keys: Object.values(PERMISSIONS).filter((p) => p.startsWith("system.")) }
];

const PERMISSION_LABELS = {
  [PERMISSIONS.ADMIN_DASHBOARD]: "Painel administrativo",
  [PERMISSIONS.MANAGE_USERS]: "Gerenciar usuários",
  [PERMISSIONS.MANAGE_SECTORS]: "Gerenciar setores",
  [PERMISSIONS.MANAGE_PERMISSIONS]: "Gerenciar permissões",
  [PERMISSIONS.VIEW_LOGS]: "Logs de auditoria",
  [PERMISSIONS.CREATE_ORDER]: "Criar pedidos",
  [PERMISSIONS.VIEW_SENT]: "Ver pedidos enviados",
  [PERMISSIONS.VIEW_RECEIVED]: "Receber pedidos (fila)",
  [PERMISSIONS.ATTEND_ORDER]: "Pedidos para atender",
  [PERMISSIONS.EVALUATE_ORDER]: "Avaliar pedidos",
  [PERMISSIONS.DELETE_PENDING]: "Excluir pedidos pendentes",
  [PERMISSIONS.CREATE_NOTA]: "Emitir notas fiscais",
  [PERMISSIONS.VIEW_NOTA_SENT]: "Ver notas enviadas",
  [PERMISSIONS.VIEW_NOTA_RECEIVED]: "Avaliar notas",
  [PERMISSIONS.APPROVE_NOTA]: "Aprovar notas fiscais",
  [PERMISSIONS.NOTIFICATIONS]: "Notificações",
  [PERMISSIONS.EXPORT_EXCEL]: "Exportar Excel"
};

const TOTAL_PERMS = Object.keys(PERMISSION_LABELS).length;

const DEFAULT_ROLES = [
  { id: ROLES.SUPORTE, nome: ROLE_INFO[ROLES.SUPORTE].nome },
  { id: ROLES.GESTOR, nome: ROLE_INFO[ROLES.GESTOR].nome },
  { id: ROLES.OPERADOR, nome: ROLE_INFO[ROLES.OPERADOR].nome }
];

export default function PermissionManager() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(ROLES.OPERADOR);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbPermissions, setDbPermissions] = useState([]);

  const rolesToDisplay = roles.length > 0 ? roles : DEFAULT_ROLES;
  const activeKeys = rolePermissions[selectedRole] || [];
  const selectedMeta = rolesToDisplay.find((r) => r.id === selectedRole);
  const roleInfo = ROLE_INFO[selectedRole];

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const [allRoles, allPerms, rolePerms] = await Promise.all([
        api.adminListRoles(),
        api.adminListPermissions(),
        api.adminListRolePermissions(selectedRole)
      ]);

      setRoles(allRoles);
      setDbPermissions(allPerms);

      const allowedKeys = rolePerms
        .filter((rp) => rp.permitido)
        .map((rp) => {
          const perm = allPerms.find((p) => (p.id || p.$id) === rp.permissao_id);
          return perm?.chave;
        })
        .filter(Boolean);

      setRolePermissions((prev) => ({ ...prev, [selectedRole]: allowedKeys }));
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
      showToast({ type: "error", message: "Falha ao carregar permissões." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [selectedRole]);

  useEffect(() => {
    if (!api.CHANNELS.ROLE_PERMISSOES) return;
    const unsubscribe = api.subscribe(api.CHANNELS.ROLE_PERMISSOES, (payload) => {
      if (payload.events?.some((e) => e.includes(".documents."))) {
        fetchPermissions();
      }
    });
    return () => unsubscribe();
  }, [selectedRole]);

  const countForRole = (roleId) => (rolePermissions[roleId] || []).length;

  const handleTogglePermission = (permission) => {
    const current = rolePermissions[selectedRole] || [];
    const updated = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    setRolePermissions({ ...rolePermissions, [selectedRole]: updated });
  };

  const handleSave = async () => {
    if (dbPermissions.length === 0) {
      showToast({
        type: "error",
        message: "Cadastre as chaves na coleção 'permissoes' do Appwrite antes de salvar."
      });
      return;
    }

    setSaving(true);
    try {
      await api.adminUpdateRolePermissions(selectedRole, rolePermissions[selectedRole] || []);
      showToast({ type: "success", message: "Permissões salvas com sucesso." });
    } catch (err) {
      showToast({ type: "error", message: err.message || "Erro ao salvar permissões." });
    } finally {
      setSaving(false);
    }
  };

  const groupCounts = useMemo(() => {
    const map = {};
    GROUPS.forEach((g) => {
      map[g.id] = g.keys.filter((k) => activeKeys.includes(k)).length;
    });
    return map;
  }, [activeKeys]);

  return (
    <>
      <Header title="Gerenciar Permissões" user={user} />

      <div className="permissions-page">
        <header className="perm-head card">
          <div className="perm-head__brand">
            <div className="perm-head__icon" aria-hidden="true">
              <ShieldIcon size={22} />
            </div>
            <div>
              <h1 className="perm-head__title">Controle de acesso</h1>
              <p className="perm-head__subtitle">
                Selecione um perfil e defina o que ele pode fazer em todo o SetorLink.
              </p>
            </div>
          </div>
          <div className="perm-head__meta">
            <span className="chip">
              {activeKeys.length} / {TOTAL_PERMS} ativas
            </span>
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </header>

        <div className="perm-roles-row" role="tablist" aria-label="Perfis de acesso">
          {rolesToDisplay.map((role) => {
            const isActive = selectedRole === role.id;
            const count = countForRole(role.id);
            const info = ROLE_INFO[role.id];
            return (
              <button
                key={role.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`perm-role-card card${isActive ? " perm-role-card--active" : ""}`}
                onClick={() => setSelectedRole(role.id)}
              >
                <div className="perm-role-card__icon">
                  <ShieldIcon size={20} />
                </div>
                <div className="perm-role-card__text">
                  <span className="perm-role-card__name">{role.nome || role.id}</span>
                  <span className="perm-role-card__desc">
                    {info?.descricao || (role.id === ROLES.SUPORTE ? "Administrador" : "Operacional")}
                  </span>
                </div>
                <div className="perm-role-card__count">
                  <strong>{count}</strong>
                  <span>/{TOTAL_PERMS}</span>
                </div>
              </button>
            );
          })}
        </div>

        <section className="perm-board card">
          <div className="perm-board__head">
            <div>
              <h2 className="perm-board__title">
                Permissões do perfil{" "}
                <span className="chip primary">{selectedMeta?.nome || selectedRole}</span>
              </h2>
              {roleInfo?.descricao && (
                <p className="perm-board__desc">{roleInfo.descricao}</p>
              )}
            </div>
            <div className="perm-board__stats">
              {GROUPS.map((g) => (
                <span key={g.id} className="perm-board__stat">
                  <span className="perm-board__stat-label">{g.title.split(" ")[0]}</span>
                  <span className="perm-board__stat-value">
                    {groupCounts[g.id]}/{g.keys.length}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="perm-board__loading empty">Carregando permissões…</div>
          ) : (
            <div className="perm-categories">
              {GROUPS.map((group) => (
                <article key={group.id} className="perm-category">
                  <header className="perm-category__head">
                    <h3 className="perm-category__title">{group.title}</h3>
                    <span className="perm-category__badge">
                      {groupCounts[group.id]} de {group.keys.length}
                    </span>
                  </header>
                  <ul className="perm-items">
                    {group.keys.map((permission) => {
                      const isOn = activeKeys.includes(permission);
                      return (
                        <li key={permission}>
                          <label
                            className={`perm-item${isOn ? " perm-item--on" : ""}`}
                            title={permission}
                          >
                            <span className="perm-item__label">
                              {PERMISSION_LABELS[permission] || permission}
                            </span>
                            <input
                              type="checkbox"
                              className="perm-item__input"
                              checked={isOn}
                              onChange={() => handleTogglePermission(permission)}
                            />
                            <span className="perm-item__switch" aria-hidden="true" />
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="perm-footnote">
          <strong>Dica:</strong> alterações só entram em vigor após clicar em &quot;Salvar alterações&quot;.
          Usuários existentes podem precisar sair e entrar novamente para refletir o perfil.
        </p>
      </div>
    </>
  );
}
