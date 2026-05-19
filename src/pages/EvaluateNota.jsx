import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { statuses, statusClass, normalizeStatus, statusLabel } from "../utils/constants.js";
import { showToast } from "../components/Toast.jsx";
import Header from "../components/Header.jsx";
import { CheckIcon, XIcon, CalendarIcon, SendIcon, FileTextIcon } from "../components/Icons.jsx";

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
    <>
      <Header title="Avaliar Nota Fiscal" user={user} />
      <div className="page-shell">
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
          <div className="stack" style={{ gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--bg-alt, #f9f9f9)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--primary)", background: "rgba(11, 100, 244, 0.08)", padding: "8px", borderRadius: "10px", display: "flex" }}>
                  <SendIcon size={18} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02rem" }}>Enviado por</span>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{doc.senderSector}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--bg-alt, #f9f9f9)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--primary)", background: "rgba(11, 100, 244, 0.08)", padding: "8px", borderRadius: "10px", display: "flex" }}>
                  <CalendarIcon size={18} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02rem" }}>Data de envio</span>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{new Date(doc.date).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: "rgba(11, 100, 244, 0.03)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileTextIcon size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.04rem", textTransform: "uppercase" }}>Descrição / Referência</span>
              </div>
              <div style={{ padding: "16px", fontSize: "0.9rem", lineHeight: "1.6", color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {doc.description || "Nenhuma descrição fornecida."}
              </div>
            </div>

            {canEvaluate && (
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                  <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05rem" }}>Ações de Avaliação</span>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button className="btn success" style={{ height: "44px", borderRadius: "12px", fontWeight: 600 }} disabled={loading} onClick={approve}>
                    <CheckIcon size={18} />
                    Aprovar
                  </button>
                  <button className="btn danger" style={{ height: "44px", borderRadius: "12px", fontWeight: 600 }} disabled={loading} onClick={reject}>
                    <XIcon size={18} />
                    Rejeitar
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Motivo da rejeição (se houver):</label>
                  <textarea 
                    rows={3} 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    placeholder="Descreva o motivo caso vá rejeitar..."
                    style={{ resize: "none", fontSize: "0.9rem", padding: "12px", background: "var(--bg-alt, #f9f9f9)", border: "1px solid var(--border)", borderRadius: "12px" }}
                  />
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
    </>
  );
}
