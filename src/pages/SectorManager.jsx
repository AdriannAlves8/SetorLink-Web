import React, { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { LayersIcon } from "../components/Icons.jsx";

export default function SectorManager() {
  const { user } = useAuth();
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState(null);

  const fetchSectors = async () => {
    setLoading(true);
    try {
      const res = await api.adminListSectors({ includeInactive: true });
      setSectors(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();

    if (api.CHANNELS.SETORES) {
      const unsubscribe = api.subscribe(api.CHANNELS.SETORES, (payload) => {
        if (payload.events?.some((e) => e.includes(".documents."))) {
          fetchSectors();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const handleEdit = (s) => {
    setEditingSector(s);
    setIsModalOpen(true);
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Desativar o setor "${s.nome}"? Usuários vinculados não serão removidos.`)) return;
    try {
      await api.adminDeleteSector(s.id, s.nome);
      fetchSectors();
    } catch (err) {
      alert(err.message);
    }
  };

  const activeCount = sectors.filter((s) => s.ativo !== false).length;

  return (
    <>
      <Header title="Gerenciar Setores" user={user} />

      <div className="page-shell">
        <section className="sectors-intro card">
          <div className="sectors-intro__icon">
            <LayersIcon size={26} />
          </div>
          <div className="sectors-intro__text">
            <h2 className="sectors-intro__title">Setores da unidade</h2>
            <p>
              Cadastre os setores operacionais e o e-mail que receberá notificações.
              <strong> {activeCount}</strong> ativo(s) de <strong>{sectors.length}</strong> cadastrado(s).
            </p>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setEditingSector(null);
              setIsModalOpen(true);
            }}
          >
            + Novo setor
          </button>
        </section>

        <div className="card sectors-panel">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Setor</th>
                  <th>E-mail de notificação</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="empty">Carregando setores…</td>
                  </tr>
                ) : sectors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      Nenhum setor cadastrado. Clique em &quot;Novo setor&quot; para começar.
                    </td>
                  </tr>
                ) : (
                  sectors.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="sectors-table__name">{s.nome}</span>
                      </td>
                      <td>{s.email || <span className="sectors-table__muted">—</span>}</td>
                      <td>
                        <span className={`status ${s.ativo !== false ? "success" : "danger"}`}>
                          {s.ativo !== false ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button type="button" className="btn small" onClick={() => handleEdit(s)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <SectorModal
          sector={editingSector}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchSectors}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

function SectorModal({ sector, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(
    sector
      ? {
          nome: sector.nome,
          email: sector.email || "",
          ativo: sector.ativo !== false
        }
      : {
          nome: "",
          email: "",
          ativo: true
        }
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (sector?.id) {
        await api.adminUpdateSector(sector.id, form);
      } else {
        await api.adminCreateSector(form);
      }
      onSave();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (sector && onDelete) {
      await onDelete(sector);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal user-form-modal sector-form-modal" onClick={(e) => e.stopPropagation()}>
        <header className="user-form-modal__header sector-form-modal__header">
          <div className="sector-form-modal__icon">
            <LayersIcon size={22} />
          </div>
          <div>
            <h2 className="user-form-modal__title">{sector ? "Editar setor" : "Novo setor"}</h2>
            <p className="user-form-modal__subtitle">
              {sector
                ? "Atualize nome, e-mail de notificação e status."
                : "O e-mail receberá avisos quando houver pedidos ou notas para este setor."}
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="user-form-modal__form">
          <div className="user-form-modal__fields">
            <div className="field">
              <label className="label">Nome do setor</label>
              <input
                className="input"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Financeiro, Peças, TI…"
              />
            </div>

            <div className="field">
              <label className="label">
                E-mail de notificação <span className="label-required">*</span>
              </label>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="setor@empresa.com.br"
              />
              <p className="field-hint">Usado para alertas de pedidos e notas fiscais destinadas a este setor.</p>
            </div>

            {sector && (
              <div className="field">
                <label className="label">Status</label>
                <select
                  className="input"
                  value={form.ativo ? "true" : "false"}
                  onChange={(e) => setForm({ ...form, ativo: e.target.value === "true" })}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            )}
          </div>

          <footer className="user-form-modal__footer">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Salvando…" : sector ? "Salvar alterações" : "Criar setor"}
            </button>
          </footer>

          {sector && (
            <div className="user-form-modal__danger">
              <button
                type="button"
                className="btn danger user-form-modal__danger-btn"
                onClick={handleDeleteClick}
              >
                Desativar setor
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
