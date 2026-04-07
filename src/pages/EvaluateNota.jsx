import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { statuses, statusClass, normalizeStatus, statusLabel } from "../utils/constants.js";
import { showToast } from "../components/Toast.jsx";

export default function EvaluateNota() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.getDocumentById(id);
        if (!d.title.startsWith("[NOTA FISCAL]")) {
          throw new Error("Este documento não é uma nota fiscal.");
        }
        setDoc(d);
      } catch (e) {
        setLoadError(e.message || "Erro ao carregar nota fiscal");
      }
    })();
  }, [id]);

  const openFile = () => {
    try {
      const url = api.getFileViewUrl(doc.fileData);
      window.open(url, "_blank");
    } catch (err) {
      showToast({ type: "error", message: "Falha ao abrir arquivo" });
    }
  };

  const approve = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.approveNota(id);
      showToast({ type: "success", message: "Nota Fiscal aprovada com sucesso" });
      navigate("/receber-notas");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setError("Informe o motivo da rejeição.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.rejectNota(id, reason);
      showToast({ type: "success", message: "Nota Fiscal rejeitada" });
      navigate("/receber-notas");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return <div className="content">{loadError}</div>;
  if (!doc) return <div className="content">Carregando...</div>;

  const st = normalizeStatus(doc.status);
  const isTarget = doc.targetSector === user?.sector;
  const canEvaluate = isTarget && st === statuses.PENDENTE;

  return (
    <div className="content">
      <div className="content-header">
        <div className="page-title">Avaliar Nota Fiscal</div>
        <div className="chip">{user?.sector}</div>
      </div>

      <div className="grid">
        <div className="card col-8">
          <div className="card-header">
            <div className="card-title">{doc.title.replace("[NOTA FISCAL] ", "")}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`status ${statusClass(doc.status)}`}>{statusLabel(doc.status)}</span>
              {doc.fileData && (
                <>
                  <button className="btn primary" onClick={openFile}>Abrir</button>
                  <button className="btn" onClick={() => setPreview(p => !p)}>{preview ? "Ocultar prévia" : "Prévia"}</button>
                </>
              )}
            </div>
          </div>
          {doc.fileData && preview ? (
            <iframe
              title="preview"
              src={api.getFileViewUrl(doc.fileData)}
              style={{ width: "100%", height: 600, border: "1px solid var(--border)", borderRadius: 12 }}
            />
          ) : (
            <div className="empty">Clique em Abrir ou Prévia para visualizar o PDF da nota</div>
          )}
        </div>

        <div className="card col-4">
          <div className="card-header">
            <div className="card-title">Informações</div>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <div className="chip" style={{ width: "100%", justifyContent: "flex-start" }}>
              <span style={{ fontWeight: 600, marginRight: 4 }}>Enviado por:</span> {doc.senderSector}
            </div>
            <div className="chip" style={{ width: "100%", justifyContent: "flex-start" }}>
              <span style={{ fontWeight: 600, marginRight: 4 }}>Data:</span> {new Date(doc.date).toLocaleString()}
            </div>
            
            <div className="stack" style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Descrição / Referência</div>
              <div style={{ padding: "12px", background: "var(--bg-alt, #f9f9f9)", borderRadius: 8, border: "1px solid var(--border)" }}>
                {doc.description}
              </div>
            </div>

            {canEvaluate && (
              <div className="stack" style={{ marginTop: 16, gap: 12 }}>
                <div style={{ fontWeight: 700 }}>Ações de Avaliação</div>
                <div className="summary-actions">
                  <button className="btn success" style={{ flex: 1 }} disabled={loading} onClick={approve}>Aprovar Nota</button>
                  <button className="btn danger" style={{ flex: 1 }} disabled={loading} onClick={reject}>Rejeitar</button>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Motivo da rejeição (se houver):</label>
                  <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo caso vá rejeitar" />
                </div>
              </div>
            )}

            {st === statuses.REJEITADO && doc.reason && (
              <div className="stack" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--red)" }}>Motivo da rejeição</div>
                <div style={{ padding: 12, background: "rgba(255,0,0,0.05)", borderRadius: 8, border: "1px solid var(--red)" }}>{doc.reason}</div>
              </div>
            )}

            {!canEvaluate && st === statuses.PENDENTE && (
              <div className="chip" style={{ marginTop: 16 }}>Aguardando avaliação do setor de destino.</div>
            )}

            {error && <div className="chip" style={{ color: "var(--red)", marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
