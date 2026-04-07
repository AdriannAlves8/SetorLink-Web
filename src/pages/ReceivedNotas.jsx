import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, statusClass, statusLabel, normalizeStatus } from "../utils/constants.js";
import { NavLink } from "react-router-dom";

export default function ReceivedNotas() {
  const { user } = useAuth();
  const [notas, setNotas] = useState([]);
  const [typeFilter, setTypeFilter] = useState("received"); // "received" ou "sent"
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getNotasFiscais(user.sector, typeFilter);
      setNotas(res.items);
    } catch (err) {
      console.error("Erro ao carregar notas fiscais:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.sector) load();
  }, [user.sector, typeFilter]);

  const openFile = (fileId) => {
    try {
      const url = api.getFileViewUrl(fileId);
      window.open(url, "_blank");
    } catch (err) {
      alert("Erro ao abrir arquivo");
    }
  };

  return (
    <div className="content">
      <div className="content-header">
        <div className="page-title">Notas Fiscais</div>
        <div className="chip">{user.sector}</div>
      </div>

      {user?.sector === "Peças" && (
        <div className="type-filter-group">
          <button 
            className={`type-btn ${typeFilter === "received" ? "active" : ""}`} 
            onClick={() => setTypeFilter("received")}
          >
            Recebidas
          </button>
          <button 
            className={`type-btn ${typeFilter === "sent" ? "active" : ""}`} 
            onClick={() => setTypeFilter("sent")}
          >
            Enviadas
          </button>
        </div>
      )}

      <div className="card col-12 stack">
        <div className="card-header">
          <div className="card-title">
            {typeFilter === "received" ? "Notas para avaliação" : "Minhas notas enviadas"}
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome da Nota</th>
                <th>{typeFilter === "received" ? "Remetente" : "Destino"}</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5}>Carregando...</td></tr>}
              {!loading && notas.map(n => (
                <tr key={n.id}>
                  <td>{n.title.replace("[NOTA FISCAL] ", "")}</td>
                  <td>{typeFilter === "received" ? n.senderSector : n.targetSector}</td>
                  <td>{new Date(n.date).toLocaleString()}</td>
                  <td>
                    <span className={`status ${statusClass(n.status)}`}>{statusLabel(n.status)}</span>
                  </td>
                  <td>
                    <button className="btn primary small" onClick={() => openFile(n.fileData)}>Ver PDF</button>
                    {typeFilter === "received" && normalizeStatus(n.status) === statuses.PENDENTE ? (
                      <NavLink className="btn success small" to={`/avaliar-nota/${n.id}`} style={{ marginLeft: 8 }}>Avaliar Nota</NavLink>
                    ) : (
                      <NavLink className="btn small" to={`/documento/${n.id}`} style={{ marginLeft: 8 }}>Detalhes</NavLink>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && notas.length === 0 && (
                <tr><td colSpan={5} style={{ color: "var(--color-muted)" }}>Nenhuma nota encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
