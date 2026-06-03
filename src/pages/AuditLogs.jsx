import React, { useEffect, useState, useMemo, useCallback } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ActivityIcon } from "../components/Icons.jsx";
import * as api from "../services/api.js";

// Otimização: Componente de linha memoizado para tabelas grandes
const LogRow = React.memo(({ log }) => (
  <tr key={log.id}>
    <td data-label="Data/Hora" className="audit-cell-time">{log.time}</td>
    <td data-label="Setor">{log.sector || "—"}</td>
    <td data-label="Ação">
      <span className="chip primary" title={log.action}>
        {log.actionLabel}
      </span>
    </td>
    <td data-label="Detalhes" className="audit-cell-details">{log.details}</td>
    <td data-label="Responsável">{log.user}</td>
  </tr>
));

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(50); // Virtualização simples: carrega mais ao rolar

  const fetchLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await api.listAuditLogs({ limit: 300 }); // Buscamos mais, mas exibimos aos poucos
      setLogs(res);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
      setError(err.message || "Não foi possível carregar o histórico.");
      setLogs([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    if (api.CHANNELS.LOGS) {
      let timeout;
      const handleUpdate = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fetchLogs(false), 5000);
      };

      const unsubscribe = api.subscribe(api.CHANNELS.LOGS, handleUpdate);
      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    }
  }, [fetchLogs]);

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

  // "Virtualização" simples por fatiamento de array
  const visibleLogs = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayCount < filtered.length) {
        setDisplayCount(prev => prev + 50);
      }
    }
  };

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

          <div className="data-table-wrap" onScroll={handleScroll} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table className="table data-table">
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
                  <>
                    {visibleLogs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                    {displayCount < filtered.length && (
                      <tr>
                        <td colSpan={5} className="empty" style={{ padding: '1rem' }}>
                          <div className="loading-spinner small" style={{ margin: '0 auto' }} />
                          Carregando mais...
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
