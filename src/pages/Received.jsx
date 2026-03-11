import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import StatusFilter from "../components/StatusFilter.jsx";

export default function Received() {
  const { user, can } = useAuth();
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  async function load() {
    setLoadingList(true);
    try {
      const res = await api.getReceived(user.sector, { page, pageSize });
      setDocs(res.items);
      setTotal(res.total);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.sector, page, pageSize]);

  useEffect(() => {
    const unsub = api.subscribeToProposals(() => {
      load();
    });
    return () => { try { unsub(); } catch {} };
  }, [user.sector, page, pageSize]);

  const filtered = docs.filter(d => {
    if (filter === "Todos") return true;
    return d.status === filter;
  });

  return (
    <>
      <div className="content-header">
        <div className="page-title">Recebidos</div>
        <div className="chip">{user.sector}</div>
      </div>
      <StatusFilter value={filter} onChange={setFilter} />
      <div className="card col-12 stack">
        <div className="card-header">
          <div className="card-title">Documentos recebidos</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Título</th><th>Remetente</th><th>Data</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loadingList && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                <td><div className="skeleton" style={{ width: 160 }} /></td>
                <td><div className="skeleton" style={{ width: 120 }} /></td>
                <td><div className="skeleton" style={{ width: 140 }} /></td>
                <td><div className="skeleton" style={{ width: 80 }} /></td>
                <td><div className="skeleton" style={{ width: 100 }} /></td>
              </tr>
            ))}
            {!loadingList && filtered.map(d => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.senderSector}</td>
                <td>{new Date(d.date).toLocaleString()}</td>
                <td>
                  <span className={`status ${statusClass(d.status)}`}>{normalizeStatus(d.status)}</span>
                </td>
                <td>
                  {normalizeStatus(d.status) === statuses.PENDENTE ? (
                    (user.sector === "RH")
                      ? <NavLink className="btn" to={`/documento/${d.id}`}>Detalhes</NavLink>
                      : (user.sector === "Peças"
                          ? (d.targetSector === "Peças" && d.senderSector !== "Peças"
                              ? <NavLink className="btn" to={`/avaliar/${d.id}`}>Avaliar</NavLink>
                              : <NavLink className="btn" to={`/documento/${d.id}`}>Detalhes</NavLink>)
                          : (d.targetSector === user.sector
                              ? <NavLink className="btn" to={`/avaliar/${d.id}`}>Avaliar</NavLink>
                              : <NavLink className="btn" to={`/documento/${d.id}`}>Detalhes</NavLink>)
                        )
                  ) : (
                    <NavLink className="btn" to={`/documento/${d.id}`}>Detalhes</NavLink>
                  )}
                </td>
              </tr>
            ))}
            {!loadingList && filtered.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--color-muted)" }}>Nenhum documento recebido</td></tr>
            )}
          </tbody>
        </table>
        <div className="pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
            <button className="btn" onClick={() => setPage(p => (p * pageSize < total ? p + 1 : p))} disabled={page * pageSize >= total}>Próxima</button>
          </div>
          <div>
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <div>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
