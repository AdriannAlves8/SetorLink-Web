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
        <div className="page-title">Avaliação</div>
      </div>
      <div className="info-grid">
        <div className="info-card">
          <div className="info-title">Título</div>
          <div className="info-value">{doc.title}</div>
        </div>
        <div className="info-card">
          <div className="info-title">Descrição</div>
          <div className="info-value">{doc.description || "-"}</div>
        </div>
        <div className="info-card">
          <div className="info-title">Remetente</div>
          <div className="info-value">{doc.senderSector}</div>
        </div>
        <div className="info-card">
          <div className="info-title">Destino</div>
          <div className="info-value">{doc.targetSector}</div>
        </div>
        <div className="info-card">
          <div className="info-title">Status</div>
          <div className="info-value">
            <span className={`status ${statusClass(doc.status)}`}>{normalizeStatus(doc.status)}</span>
          </div>
        </div>
        {normalizeStatus(doc.status) === statuses.REPROVADO && doc.reason && (
          <div className="info-card">
            <div className="info-title">Motivo da reprovação</div>
            <div className="info-value">{doc.reason}</div>
          </div>
        )}
        <div className="info-card">
          <div className="info-title">Arquivo</div>
          <div className="info-value">
            {doc.fileData ? <button className="btn primary" onClick={openFile}>Abrir arquivo</button> : <span className="chip">Sem arquivo</span>}
            {openError && <span className="chip" style={{ color: "var(--red)", marginLeft: 8 }}>{openError}</span>}
          </div>
        </div>
        {normalizeStatus(doc.status) === statuses.PENDENTE ? (
          <>
            <div className="info-card">
              <div className="info-title">Motivo da reprovação</div>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo (obrigatório para reprovar)" />
            </div>
            <div className="info-card">
              <div className="summary-actions">
                <button className="btn success" disabled={loading} onClick={approve}>Aprovar</button>
                <button className="btn danger" disabled={loading} onClick={reject}>Reprovar</button>
              </div>
            </div>
          </>
        ) : (
          <div className="info-card">
            <div className="info-title">Ações</div>
            <div className="info-value chip">Este documento já foi avaliado e não pode ser modificado.</div>
          </div>
        )}
        {error && <div className="info-card"><div className="info-title">Erro</div><div className="info-value" style={{ color: "var(--red)" }}>{error}</div></div>}
      </div>
    </>
  );
}
