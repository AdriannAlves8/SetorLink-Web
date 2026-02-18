import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import StatusFilter from "../components/StatusFilter.jsx";

export default function Received() {
  const { user, can } = useAuth();
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("Todos");

  useEffect(() => {
    (async () => {
      const list = await api.getReceived(user.sector);
      setDocs(list);
    })();
  }, [user.sector]);

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
      <div className="card col-12">
        <table className="table">
          <thead>
            <tr>
              <th>Título</th><th>Remetente</th><th>Data</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.senderSector}</td>
                <td>{new Date(d.date).toLocaleString()}</td>
                <td>
                  <span className={`status ${d.status === statuses.APROVADO ? "aprovado" : d.status === statuses.REPROVADO ? "reprovado" : "pendente"}`}>{d.status}</span>
                </td>
                <td>
                  {can("evaluate") && <NavLink className="btn" to={`/avaliar/${d.id}`}>Avaliar</NavLink>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--color-muted)" }}>Nenhum documento recebido</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
