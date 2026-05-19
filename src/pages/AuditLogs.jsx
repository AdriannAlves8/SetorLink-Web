import React, { useEffect, useState, useMemo } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ActivityIcon } from "../components/Icons.jsx";
import * as api from "../services/api.js";

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAuditLogs({ limit: 200 });
      setLogs(res);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
      setError(err.message || "Não foi possível carregar o histórico.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    if (api.CHANNELS.LOGS) {
      const unsubscribe = api.subscribe(api.CHANNELS.LOGS, (payload) => {
        if (payload.events?.some((e) => e.includes(".documents."))) {
          fetchLogs();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.actionLabel?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.user?.toLowerCase().includes(q) ||
        log.entity?.toLowerCase().includes(q) ||
        log.sector?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const handleClearLogs = async () => {
    if (!window.confirm("Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      setLoading(true);
      await api.adminClearAuditLogs();
      await fetchLogs();
    } catch (err) {
      alert("Erro ao limpar histórico: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Logs de Auditoria" user={user} />

      <div className="page-shell">
        <section className="audit-intro card">
          <div className="audit-intro__icon">
            <ActivityIcon size={26} />
          </div>
          <div className="audit-intro__text">
            <h2 className="audit-intro__title">Histórico de atividades</h2>
            <p>
              Histórico de ações administrativas e operacionais (pedidos, notas fiscais, usuários e setores),
              com registro por setor participante de cada evento.
            </p>
          </div>
          <button
            type="button"
            className="btn danger"
            onClick={handleClearLogs}
            disabled={loading || logs.length === 0}
          >
            Limpar histórico
          </button>
        </section>

        <div className="card audit-panel">
          <div className="audit-panel__toolbar">
            <input
              type="search"
              className="input audit-search"
              placeholder="Buscar por ação, detalhes ou responsável…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="chip">{filtered.length} registro(s)</span>
            <button type="button" className="btn small" onClick={fetchLogs} disabled={loading}>
              Atualizar
            </button>
          </div>

          {error && (
            <div className="audit-alert audit-alert--error" role="alert">
              {error}
              <button type="button" className="btn small" style={{ marginLeft: 12 }} onClick={fetchLogs}>
                Tentar novamente
              </button>
            </div>
          )}

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Setor</th>
                  <th>Ação</th>
                  <th>Detalhes</th>
                  <th>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">Carregando histórico…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      {logs.length === 0
                        ? "Nenhuma atividade registrada ainda. As ações administrativas aparecerão aqui."
                        : "Nenhum resultado para a busca."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id}>
                      <td className="audit-cell-time">{log.time}</td>
                      <td>{log.sector || "—"}</td>
                      <td>
                        <span className="chip primary" title={log.action}>
                          {log.actionLabel}
                        </span>
                      </td>
                      <td className="audit-cell-details">{log.details}</td>
                      <td>{log.user}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
