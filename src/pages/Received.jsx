import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus, statusLabel } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import StatusFilter from "../components/StatusFilter.jsx";

export default function Received() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("recebidos"); // "recebidos" ou "meus"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  async function load() {
    setLoadingList(true);
    try {
      let res;
      if (typeFilter === "recebidos") {
        res = await api.getReceived(user.sector, { page, pageSize });
      } else {
        res = await api.getSent(user.uid, user.sector, { page, pageSize });
      }
      setDocs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.sector, page, pageSize, typeFilter]);

  useEffect(() => {
    const unsub = api.subscribeToProposals(() => {
      load();
    });
    return () => { try { unsub(); } catch {} };
  }, [user.sector, page, pageSize, typeFilter]);

  const filtered = docs.filter(d => {
    if (filter === "Todos") return true;
    if (filter === "ANALISE") {
      const st = normalizeStatus(d.status);
      return st === statuses.PENDENTE || st === statuses.ENCAMINHADO;
    }
    return normalizeStatus(d.status) === filter;
  });

  return (
    <>
      <div className="content-header">
        <div className="page-title">Pedidos</div>
        <div className="chip">{user.sector}</div>
      </div>

      <div className="type-filter-group">
        <button 
          className={`type-btn ${typeFilter === "recebidos" ? "active" : ""}`} 
          onClick={() => { setTypeFilter("recebidos"); setPage(1); }}
        >
          Recebidos
        </button>
        <button 
          className={`type-btn ${typeFilter === "meus" ? "active" : ""}`} 
          onClick={() => { setTypeFilter("meus"); setPage(1); }}
        >
          Meus Pedidos
        </button>
      </div>

      <StatusFilter value={filter} onChange={setFilter} />

      <div className="card col-12 stack">
        <div className="card-header">
          <div className="card-title">
            {typeFilter === "recebidos" ? "Pedidos para atender" : "Meus pedidos enviados"}
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Remetente</th>
                <th>Destino</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingList && Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td><div className="skeleton" style={{ width: 160 }} /></td>
                  <td><div className="skeleton" style={{ width: 100 }} /></td>
                  <td><div className="skeleton" style={{ width: 100 }} /></td>
                  <td><div className="skeleton" style={{ width: 140 }} /></td>
                  <td><div className="skeleton" style={{ width: 80 }} /></td>
                  <td><div className="skeleton" style={{ width: 100 }} /></td>
                </tr>
              ))}
              {!loadingList && filtered.map(d => {
                const st = normalizeStatus(d.status);
                const isPecas = user.sector === "Peças";
                const isTarget = d.targetSector === user.sector;
                const podeAtender = (isPecas && (st === statuses.PENDENTE || st === statuses.APROVADO_SETOR || st === statuses.EM_ATENDIMENTO))
                                 || (isTarget && st === statuses.ENCAMINHADO);
                
                return (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{d.senderSector}</td>
                  <td>{d.targetSector || "Peças"}</td>
                  <td>{new Date(d.date).toLocaleString()}</td>
                  <td>
                    <span className={`status ${statusClass(d.status)}`}>{statusLabel(d.status)}</span>
                  </td>
                  <td>
                    {podeAtender ? (
                      <NavLink className="btn" to={`/avaliar/${d.id}`}>Atender</NavLink>
                    ) : (
                      <NavLink className="btn" to={`/documento/${d.id}`}>Detalhes</NavLink>
                    )}
                  </td>
                </tr>
              );})}
              {!loadingList && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ color: "var(--color-muted)" }}>Nenhum pedido encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap" }}>
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
