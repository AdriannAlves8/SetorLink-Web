import React, { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { PERMISSIONS, ROLES } from "../utils/acl.js";
import { ShieldIcon } from "../components/Icons.jsx";
import * as api from "../services/api.js";

export default function PermissionManager() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(ROLES.OPERADOR);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbPermissions, setDbPermissions] = useState([]);

  // Agrupar permissões por categoria para facilitar a visualização
  const groupedPermissions = {
    "Gestão Administrativa": Object.values(PERMISSIONS).filter(p => p.startsWith("admin.")),
    "Operações de Pedidos": Object.values(PERMISSIONS).filter(p => p.startsWith("orders.")),
    "Operações de Notas Fiscais": Object.values(PERMISSIONS).filter(p => p.startsWith("notas.")),
    "Recursos do Sistema": Object.values(PERMISSIONS).filter(p => p.startsWith("system.")),
  };

  // Descrições amigáveis para as permissões
  const permissionLabels = {
    [PERMISSIONS.ADMIN_DASHBOARD]: "Acesso ao Painel Admin",
    [PERMISSIONS.MANAGE_USERS]: "Gerenciar Usuários",
    [PERMISSIONS.MANAGE_SECTORS]: "Gerenciar Setores",
    [PERMISSIONS.MANAGE_PERMISSIONS]: "Gerenciar Permissões",
    [PERMISSIONS.VIEW_LOGS]: "Ver Logs de Auditoria",
    [PERMISSIONS.CREATE_ORDER]: "Criar Pedidos",
    [PERMISSIONS.VIEW_SENT]: "Ver Pedidos Enviados",
    [PERMISSIONS.VIEW_RECEIVED]: "Receber Pedidos (Fila)",
    [PERMISSIONS.EVALUATE_ORDER]: "Avaliar/Aprovar Pedidos",
    [PERMISSIONS.ATTEND_ORDER]: "Atender Pedidos",
    [PERMISSIONS.CREATE_NOTA]: "Emitir Notas Fiscais",
    [PERMISSIONS.VIEW_NOTA_SENT]: "Ver Notas Enviadas",
    [PERMISSIONS.VIEW_NOTA_RECEIVED]: "Receber/Avaliar Notas",
    [PERMISSIONS.APPROVE_NOTA]: "Aprovar Notas Fiscais",
    [PERMISSIONS.NOTIFICATIONS]: "Receber Notificações",
    [PERMISSIONS.EXPORT_EXCEL]: "Exportar Dados (Excel)"
  };

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

      // Mapeia os documentos de role_permissoes para pegar as chaves das permissões permitidas
      const allowedKeys = rolePerms
        .filter(rp => rp.permitido)
        .map(rp => {
          const perm = allPerms.find(p => (p.id || p.$id) === rp.permissao_id);
          return perm?.chave;
        })
        .filter(Boolean);

      setRolePermissions({ ...rolePermissions, [selectedRole]: allowedKeys });
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [selectedRole]);

  useEffect(() => {
    // Realtime
    if (api.CHANNELS.ROLE_PERMISSOES) {
      const unsubscribe = api.subscribe(api.CHANNELS.ROLE_PERMISSOES, (payload) => {
        if (payload.events.some(e => e.includes(".documents."))) {
          fetchPermissions();
        }
      });
      return () => unsubscribe();
    }
  }, [selectedRole]);

  const handleTogglePermission = (permission) => {
    const current = rolePermissions[selectedRole] || [];
    let updated;
    if (current.includes(permission)) {
      updated = current.filter(p => p !== permission);
    } else {
      updated = [...current, permission];
    }
    setRolePermissions({ ...rolePermissions, [selectedRole]: updated });
  };

  const handleSave = async () => {
    if (dbPermissions.length === 0) {
      alert("Erro: A coleção 'permissoes' no Appwrite está vazia. Você precisa cadastrar as chaves no banco primeiro.");
      return;
    }

    setSaving(true);
    try {
      await api.adminUpdateRolePermissions(selectedRole, rolePermissions[selectedRole] || []);
      alert("Permissões atualizadas com sucesso!");
    } catch (err) {
      alert("Erro ao salvar permissões: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const rolesToDisplay = roles.length > 0 ? roles : [
    { id: ROLES.SUPORTE, nome: "Suporte", desc: "Gestão total de usuários e sistema" },
    { id: ROLES.GESTOR, nome: "Gestor", desc: "Criação, recebimento e avaliação completa" },
    { id: ROLES.OPERADOR, nome: "Operador", desc: "Criação e avaliações operacionais" }
  ];

  return (
    <>
      <Header title="Gerenciar Permissões" user={user} />

      <div className="dashboard-hero" style={{ padding: '1.5rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: '10px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
              <ShieldIcon size={28} />
            </div>
            <div>
              <div className="hero-title" style={{ fontSize: '1.25rem', marginBottom: 4 }}>Controle de Acesso</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Configure o que cada perfil pode acessar no sistema</p>
            </div>
          </div>
          <button 
            className="btn primary" 
            onClick={handleSave} 
            disabled={loading || saving}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 600 }}
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
        <div className="dashboard-main-grid admin-permissions-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: "2rem" }}>
          {/* Sidebar de Perfis */}
          <div className="stack profile-list">
            <div className="card" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div className="card-header" style={{ padding: '1.25rem' }}>
                <div className="card-title" style={{ fontSize: '1rem' }}>Perfis Disponíveis</div>
              </div>
              <div className="notif-list" style={{ padding: '0.5rem' }}>
                {rolesToDisplay.map(role => (
                  <div 
                    key={role.id}
                    className={`notif-item ${selectedRole === role.id ? "active" : ""}`}
                    style={{ 
                      cursor: 'pointer', 
                      padding: '1.25rem', 
                      borderRadius: '12px',
                      marginBottom: '0.5rem',
                      borderLeft: selectedRole === role.id ? '4px solid var(--primary)' : '4px solid transparent',
                      backgroundColor: selectedRole === role.id ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <div className="stack" style={{ gap: '4px' }}>
                      <span style={{ fontWeight: 600, color: selectedRole === role.id ? 'var(--primary)' : 'var(--text)' }}>{role.nome || role.id}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.4' }}>
                        {role.desc || (role.id === ROLES.SUPORTE ? "Acesso total ao sistema" : "Acesso operacional")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de Permissões */}
          <div className="card" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div className="card-header" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '1rem' }}>
                Ações Permitidas: <span className="chip primary" style={{ marginLeft: '8px', textTransform: 'uppercase' }}>{selectedRole}</span>
              </div>
            </div>
            
            <div className="stack" style={{ padding: '2rem' }}>
              {dbPermissions.length === 0 && !loading && (
                <div className="alert danger" style={{ marginBottom: '2rem', borderRadius: '12px' }}>
                  <strong>Atenção:</strong> Nenhuma permissão cadastrada no Appwrite. 
                  Adicione as chaves na coleção 'permissoes' para começar.
                </div>
              )}

              {loading ? (
                <div className="empty" style={{ padding: '4rem' }}>Carregando permissões...</div>
              ) : (
                Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ 
                      fontSize: '0.9rem', 
                      textTransform: 'uppercase', 
                      letterSpacing: '1px',
                      marginBottom: '1.25rem', 
                      color: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px' 
                    }}>
                      <span style={{ width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }}></span>
                      {category}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {perms.map(permission => {
                        const isChecked = rolePermissions[selectedRole]?.includes(permission);
                        return (
                          <label 
                            key={permission} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '14px', 
                              padding: '1rem', 
                              background: isChecked ? 'rgba(var(--primary-rgb), 0.03)' : 'var(--bg-alt)', 
                              borderRadius: '12px',
                              cursor: 'pointer',
                              border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                          >
                            <div style={{ 
                              width: '22px', 
                              height: '22px', 
                              borderRadius: '6px', 
                              border: '2px solid',
                              borderColor: isChecked ? 'var(--primary)' : '#cbd5e1',
                              background: isChecked ? 'var(--primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              transition: 'all 0.2s'
                            }}>
                              {isChecked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                              <input 
                                type="checkbox" 
                                checked={isChecked || false} 
                                onChange={() => handleTogglePermission(permission)}
                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                              />
                            </div>
                            <div className="stack" style={{ gap: '2px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: isChecked ? 600 : 500, color: isChecked ? 'var(--text)' : 'var(--muted)' }}>
                                {permissionLabels[permission] || permission}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.8 }}>
                                {permission}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              <div className="alert info" style={{ 
                marginTop: '1rem', 
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'rgba(var(--primary-rgb), 0.05)', 
                color: 'var(--primary)', 
                border: 'none',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '1.2rem' }}>💡</div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                  <strong>Nota:</strong> As alterações aqui refletem instantaneamente para todos os usuários que possuem este perfil.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
