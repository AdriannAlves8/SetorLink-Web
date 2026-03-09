import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { statuses, statusClass, normalizeStatus } from "../utils/constants.js";

export default function Evaluate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [openError, setOpenError] = useState(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await api.getDocumentById(id);
      setDoc(d);
    })();
  }, [id]);

  const openFile = () => {
    try {
      setOpenError(null);
      const url = api.getFileViewUrl(doc.fileData);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Erro ao abrir arquivo:", err);
      setOpenError(err.message || "Falha ao abrir arquivo");
    }
  };

  const approve = async () => {
    // Bloqueia tentativa de reavaliação via UI
    if (doc && normalizeStatus(doc.status) !== statuses.PENDENTE) { setError("Este documento já foi avaliado."); return; }
    setLoading(true);
    setError(null);
    try {
      const d = await api.evaluateDocument(id, statuses.APROVADO, user.sector);
      setDoc(d);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const reject = async () => {
    // Bloqueia tentativa de reavaliação via UI
    if (doc && normalizeStatus(doc.status) !== statuses.PENDENTE) { setError("Este documento já foi avaliado."); return; }
    if (!reason.trim()) { setError("Informe o motivo da reprovação."); return; }
    setLoading(true);
    setError(null);
    try {
      const d = await api.evaluateDocument(id, statuses.REPROVADO, user.sector, reason);
      setDoc(d);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!doc) return <div style={{ padding: 24 }}>Carregando...</div>;
  return (
    <>
      <div className="content-header">
        <div className="page-title">Avaliar Documento</div>
      </div>
      <div className="grid">
        <div className="card col-8">
          <div className="card-header">
            <div className="card-title">{doc.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`status ${statusClass(doc.status)}`}>{normalizeStatus(doc.status)}</span>
              {doc.fileData ? (
                <>
                  <button className="btn primary" onClick={openFile}>Abrir</button>
                  <button className="btn" onClick={() => setPreview(p => !p)}>{preview ? "Ocultar prévia" : "Prévia"}</button>
                </>
              ) : <span className="chip">Sem arquivo</span>}
            </div>
          </div>
          {doc.fileData && preview ? (
            <iframe
              title="preview"
              src={(() => { try { return api.getFileViewUrl(doc.fileData); } catch { return ""; } })()}
              style={{ width: "100%", height: 360, border: "1px solid var(--border)", borderRadius: 12 }}
            />
          ) : (
            <div className="empty">Selecione Abrir para nova aba ou Prévia compacta</div>
          )}
          {openError && <div className="chip" style={{ color: "var(--red)", marginTop: 8 }}>{openError}</div>}
        </div>
        <div className="card col-4">
          <div className="card-header">
            <div className="card-title">Informações</div>
          </div>
          <div className="stack">
            <div className="chip">Remetente: {doc.senderSector}</div>
            <div className="chip">Destino: {doc.targetSector}</div>
            <div className="chip">Data: {new Date(doc.date).toLocaleString()}</div>
            <div className="stack">
              <div style={{ fontWeight: 700 }}>Descrição</div>
              <div>{doc.description || "-"}</div>
            </div>
            {normalizeStatus(doc.status) === statuses.REPROVADO && doc.reason && (
              <div className="stack">
                <div style={{ fontWeight: 700 }}>Motivo da reprovação</div>
                <div>{doc.reason}</div>
              </div>
            )}
            {normalizeStatus(doc.status) === statuses.PENDENTE ? (
              <>
                <div className="stack">
                  <div style={{ fontWeight: 700 }}>Motivo da reprovação</div>
                  <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo" />
                </div>
                <div className="summary-actions">
                  <button className="btn success" disabled={loading} onClick={approve}>Aprovar</button>
                  <button className="btn danger" disabled={loading} onClick={reject}>Reprovar</button>
                </div>
              </>
            ) : (
              <div className="chip">Este documento já foi avaliado.</div>
            )}
            {error && <div className="chip" style={{ color: "var(--red)" }}>{error}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
