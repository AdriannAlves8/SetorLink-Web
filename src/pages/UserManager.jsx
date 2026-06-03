import React, { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { UserPlusIcon, EyeIcon, EyeOffIcon } from "../components/Icons.jsx";
import { PageShell, PageToolbar } from "../components/PageShell.jsx";
import { ROLES, ROLE_INFO, ALL_ROLES } from "../utils/acl.js";

export default function UserManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Dados dinâmicos para o suporte
  const [availableSectors, setAvailableSectors] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [dynamicRolePermissions, setDynamicRolePermissions] = useState({});

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, sectorsRes, rolesRes] = await Promise.all([
        api.adminListUsers(),
        api.adminListSectors(),
        api.adminListRoles()
      ]);
      setUsers(usersRes);
      setAvailableSectors(sectorsRes);
      setAvailableRoles(rolesRes);
    } catch (err) {
      console.error("Erro ao carregar dados do gerenciador:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lógica de Paginação
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handleEdit = (u) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (u) => {
    try {
      const newStatus = !u.ativo;
      await api.adminUpdateUser(u.id, { 
        ...u, 
        ativo: newStatus,
        name: u.name || u.nome,
        sector: u.setor || u.sector
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o usuário ${u.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await api.adminDeleteUser(u.id, u.uid);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <Header title="Gerenciar Usuários" user={user} />

      <PageShell>
        <PageToolbar title="Usuários do Sistema">
          <button className="btn primary" onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>
            <UserPlusIcon style={{ marginRight: 8 }} />
            Novo Usuário
          </button>
        </PageToolbar>

      <div className="card page-panel">
        <div className="data-table-wrap">
          <table className="table data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Setor</th>
                <th>Perfil</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="empty">Carregando usuários...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="empty">Nenhum usuário cadastrado.</td></tr>
              ) : currentUsers.length === 0 ? (
                <tr><td colSpan="5" className="empty">Nenhum usuário nesta página.</td></tr>
              ) : currentUsers.map(u => (
                <tr key={u.uid}>
                  <td data-label="Usuário">
                    <div className="stack">
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{u.email}</span>
                    </div>
                  </td>
                  <td data-label="Setor">{u.setor || u.sector || "—"}</td>
                  <td data-label="Perfil"><span className="chip">{ROLE_INFO[u.role_id || u.role]?.nome || u.role_id || u.role || "—"}</span></td>
                  <td data-label="Status">
                    <span className={`status ${u.ativo ? "success" : "danger"}`}>
                      {u.ativo ? "Ativo" : "Bloqueado"}
                    </span>
                  </td>
                  <td data-label="Ações" style={{ textAlign: 'right' }}>
                    <div className="actions" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button className="btn small" onClick={() => handleEdit(u)}>Editar</button>
                      <button 
                        className={`btn small ${u.ativo ? "danger" : "success"}`}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.ativo ? "Bloquear" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginação */}
        {!loading && totalPages > 1 && (
          <div style={{ 
            padding: '1.5rem', 
            borderTop: '1px solid #f0f0f0', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '1rem' 
          }}>
            <button 
              className="btn small" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              Anterior
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
            <button 
              className="btn small" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Próxima
            </button>
          </div>
        )}
      </div>
      </PageShell>

      {isModalOpen && (
        <UserModal 
          user={editingUser} 
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchData}
          onDelete={handleDelete}
          availableSectors={availableSectors}
          availableRoles={availableRoles}
          dynamicPermissions={dynamicRolePermissions}
        />
      )}
    </>
  );
}

function UserModal({ user, onClose, onSave, onDelete, availableSectors, availableRoles, dynamicPermissions }) {
  const [form, setForm] = useState(user ? {
    uid: user.uid,
    name: user.name || user.nome,
    email: user.email,
    sector: user.setor || user.sector,
    setor_id: user.setor_id,
    role_id: user.role_id,
    role: user.role_id, // Usando role_id como base para a role
    ativo: user.ativo,
    password: ""
  } : {
    name: "",
    email: "",
    sector: "",
    setor_id: null,
    role_id: null,
    role: ROLES.OPERADOR,
    ativo: true,
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prepara o payload final
      const payload = {
        ...form,
        // Garante que role_id seja preenchido mesmo que venha do fallback manual
        role_id: form.role_id || form.role
      };

      if (user?.id) {
        await api.adminUpdateUser(user.id, payload);
      } else {
        await api.adminCreateUser(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete && user) {
      await onDelete(user);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal user-form-modal" onClick={(e) => e.stopPropagation()}>
        <header className="user-form-modal__header">
          <h2 className="user-form-modal__title">{user ? "Editar usuário" : "Novo usuário"}</h2>
          <p className="user-form-modal__subtitle">
            {user ? "Atualize os dados de acesso do colaborador." : "Preencha os dados para criar uma nova conta."}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="user-form-modal__form">
          <div className="user-form-modal__fields">
            <div className="field">
              <label className="label">Nome completo</label>
              <input 
                className="input" 
                required 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="field">
              <label className="label">E-mail Corporativo</label>
              <input 
                className="input" 
                type="email" 
                required 
                disabled={!!user}
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="usuario@empresa.com.br"
              />
            </div>

            <div className="field">
              <label className="label">{user ? "Nova senha" : "Senha de acesso"}</label>
              <div className="input-password-wrap">
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  required={!user}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={user ? "Deixe em branco para manter" : "Mínimo 8 caracteres"}
                />
                <button
                  type="button"
                  className="input-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            <div className="user-form-modal__row">
              <div className="field">
                <label className="label">Setor</label>
                <select 
                  className="input" 
                  value={form.sector} 
                  onChange={e => {
                    const newSector = e.target.value;
                    setForm({
                      ...form, 
                      sector: newSector,
                      setor_id: availableSectors.find(s => s.nome === newSector)?.$id || availableSectors.find(s => s.nome === newSector)?.id || null
                    });
                  }}
                  required
                >
                  <option value="">Selecionar...</option>
                  {availableSectors.filter(s => s.nome !== "Suporte").map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>

              <div className="field">
                <label className="label">Perfil de acesso</label>
                <select 
                  className="input" 
                  value={form.role_id || ""} 
                  onChange={e => setForm({ ...form, role_id: e.target.value, role: e.target.value })}
                  required
                >
                  <option value="">Selecione um perfil</option>
                  {(
                    availableRoles.some((r) => ALL_ROLES.includes(r.id))
                      ? availableRoles.filter((r) => ALL_ROLES.includes(r.id))
                      : ALL_ROLES.map((id) => ({ id, nome: ROLE_INFO[id].nome }))
                  ).map((r) => (
                    <option key={r.id} value={r.id}>{r.nome || ROLE_INFO[r.id]?.nome || r.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.role_id && ROLE_INFO[form.role_id] && (
              <div className="user-form-role-preview">
                <span className="user-form-role-preview__badge">{ROLE_INFO[form.role_id].nome}</span>
                <p>{ROLE_INFO[form.role_id].descricao}</p>
              </div>
            )}
          </div>

          <footer className="user-form-modal__footer">
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Salvando…" : (user ? "Salvar alterações" : "Criar usuário")}
            </button>
          </footer>

          {user && (
            <div className="user-form-modal__danger">
              <button type="button" className="btn danger user-form-modal__danger-btn" onClick={handleDelete}>
                Excluir conta permanentemente
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
