import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { acl } from "../utils/acl.js";
import { statuses } from "../utils/constants.js";
import StatusFilter from "../components/StatusFilter.jsx";
import { useNavigate } from "react-router-dom";
import { toCSV, downloadCSV } from "../utils/csv.js";

export default function Sent({ compose = false }) {
  const { user, allowedDestinations, can } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const canExport = user.sector === "RH" || user.sector === "Peças";

  async function load() {
    const hidden = acl[user.sector]?.hidden_sent_from || [];
    const list = await api.getSent(user.sector, hidden);
    setDocs(list);
  }
  useEffect(() => { load(); }, [user.sector]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };
  const send = async (e) => {
    e.preventDefault();
    setError(null);
    if (!can("send")) return;
    if (!title || !target || !file) { setError("Preencha título, destino e arquivo"); return; }
    setLoading(true);
    const fileData = await toBase64(file);
    try {
      await api.sendDocument({ title, description, fileData, senderSector: user.sector, targetSector: target });
      setTitle(""); setDescription(""); setFile(null); setTarget("");
      await load();
      navigate("/");
    } catch (err) {
      setError(err.message || "Falha ao enviar");
    } finally {
      setLoading(false);
    }
  };
  const remove = async (id) => {
    try {
      await api.deleteDocumentIfPending(id);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="page-title">{compose ? "Enviar Documento" : "Enviados"}</div>
        <div className="chip">{user.sector}</div>
      </div>
      {compose && can("send") && (
        <form className="form" onSubmit={send}>
          <div className="form-row">
            <label>Arquivo</label>
            <input type="file" onChange={onFile} />
          </div>
          <div className="form-row">
            <label>Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do documento" />
          </div>
          <div className="form-row">
            <label>Descrição</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" />
          </div>
          <div className="form-row">
            <label>Destino</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Selecione</option>
              {allowedDestinations().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {error && <div style={{ color: "var(--red)" }}>{error}</div>}
          <button className="btn primary" disabled={loading}>{loading ? "Enviando..." : "Enviar"}</button>
          <div className="divider" />
        </form>
      )}

      {!compose && (
        <>
        <StatusFilter value={filter} onChange={setFilter} />
        {canExport && (
          <div className="actions" style={{ marginBottom: 8 }}>
            <button
              className="btn"
              onClick={() => {
                const evaluated = docs.filter(d => d.status !== statuses.PENDENTE);
                const headers = ["Nome do documento", "Setor destino", "Status", "Setor que avaliou", "Data de envio", "Data de avaliação"];
                const rows = evaluated.map(d => ({
                  "Nome do documento": d.title,
                  "Setor destino": d.targetSector,
                  "Status": d.status,
                  "Setor que avaliou": d.reviewerSector || "",
                  "Data de envio": new Date(d.date).toLocaleString(),
                  "Data de avaliação": d.evaluatedAt ? new Date(d.evaluatedAt).toLocaleString() : ""
                }));
                const csv = toCSV({ headers, rows });
                downloadCSV(`documentos_avaliados_${user.sector}.csv`, csv);
              }}
            >
              Exportar Documentos Avaliados
            </button>
          </div>
        )}
        <div className="card col-12">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th><th>Destino</th><th>Data</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {docs.filter(d => filter === "Todos" ? true : d.status === filter).map(d => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{d.targetSector}</td>
                  <td>{new Date(d.date).toLocaleString()}</td>
                  <td>
                    <span className={`status ${d.status === statuses.APROVADO ? "aprovado" : d.status === statuses.REPROVADO ? "reprovado" : "pendente"}`}>{d.status}</span>
                  </td>
                  <td>
                    {d.status === statuses.PENDENTE && can("delete_if_pending") && (
                      <button className="btn danger" onClick={() => remove(d.id)}>Excluir</button>
                    )}
                  </td>
                </tr>
              ))}
              {docs.filter(d => filter === "Todos" ? true : d.status === filter).length === 0 && (
                <tr><td colSpan={5} style={{ color: "var(--color-muted)" }}>Nenhum documento enviado</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
    </>
  );
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
