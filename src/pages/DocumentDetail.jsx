import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { statuses, statusClass, normalizeStatus, statusLabel } from "../utils/constants.js";
import { showToast } from "../components/Toast.jsx";

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [doc, setDoc] = useState(null);
  const [openError, setOpenError] = useState(null);
  const [preview, setPreview] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.getDocumentById(id);
        
        // Regra de Visibilidade dinâmica:
        // 1. Setor Peças sempre vê.
        // 2. O criador do pedido (uidCriador) sempre vê.
        // 3. O setor de destino (setorDestino) só vê se o status for ENCAMINHADO.
        const isPecas = user?.sector === "Peças";
        const isOwner = d.uidCriador === user?.uid || d.senderSector === user?.sector;
        const isTarget = d.targetSector === user?.sector;

        if (!isPecas && !isOwner && !isTarget) {
          throw new Error("Você não tem permissão para visualizar este pedido.");
        }

        setDoc(d);
      } catch (e) {
        setLoadError(e.message || "Erro ao carregar");
      }
    };
    if (user) load();
    const unsubscribe = api.subscribeToDocument(id, () => {
      if (user) load();
    });
    return () => unsubscribe();
  }, [id, user]);

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

  const assume = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.assumeOrder(id);
      setDoc(d);
      showToast({ type: "success", message: "Pedido assumido" });
      navigate("/recebidos");
    } catch (e) {
      setError(e.message);
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
      const d = await api.rejectOrder(id, reason);
      setDoc(d);
      showToast({ type: "success", message: "Pedido rejeitado" });
      navigate("/recebidos");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const finalize = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.finalizeOrder(id);
      setDoc(d);
      showToast({ type: "success", message: "Pedido finalizado" });
      navigate("/recebidos");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return <div style={{ padding: 24 }}>{loadError}</div>;
  if (!doc) return <div style={{ padding: 24 }}>Carregando...</div>;

  const st = normalizeStatus(doc.status);
  const isPecas = can("evaluate");

  return (
    <>
      <div className="content-header">
        <div className="page-title">Detalhes do pedido</div>
      </div>
      <div className="grid">
        <div className="card col-8">
          <div className="card-header">
            <div className="card-title">{doc.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`status ${statusClass(doc.status)}`}>{statusLabel(doc.status)}</span>
              {doc.fileData ? (
                <>
                  <button className="btn" onClick={openFile}>Abrir</button>
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
          <div className="stack" style={{ gap: 12 }}>
            <div className="chip" style={{ width: "100%", justifyContent: "flex-start" }}>
              <span style={{ fontWeight: 600, marginRight: 4 }}>Remetente:</span> {doc.senderSector}
            </div>
            <div className="chip" style={{ width: "100%", justifyContent: "flex-start" }}>
              <span style={{ fontWeight: 600, marginRight: 4 }}>Data:</span> {new Date(doc.date).toLocaleString()}
            </div>
            
            <div className="stack" style={{ marginTop: 8, padding: "12px", background: "rgba(0,0,0,0.02)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--muted)", marginBottom: 8, letterSpacing: "0.05rem" }}>DADOS DO PEDIDO</div>
              <div className="stack" style={{ gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span style={{ color: "var(--muted)" }}>Produto:</span>
                  <span style={{ fontWeight: 500, textAlign: "right" }}>{doc.nomeProduto || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span style={{ color: "var(--muted)" }}>Código:</span>
                  <span style={{ fontWeight: 500, textAlign: "right" }}>{doc.codigoProduto || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span style={{ color: "var(--muted)" }}>Finalidade:</span>
                  <span style={{ fontWeight: 500, textAlign: "right" }}>{doc.finalidade || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span style={{ color: "var(--muted)" }}>Controle:</span>
                  <span style={{ fontWeight: 500, textAlign: "right" }}>{doc.recorrente ? "Recorrente" : "Único"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", marginTop: 4, paddingTop: 4, borderTop: "1px dashed var(--border)" }}>
                  <span style={{ fontWeight: 600 }}>Valor:</span>
                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                    {doc.valor ? `R$ ${doc.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="stack" style={{ gap: 6 }}>
              {doc.dataAssumido && (
                <div className="chip" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.85rem", opacity: 0.8 }}>
                  <span style={{ fontWeight: 600, marginRight: 4 }}>Assumido em:</span> {new Date(doc.dataAssumido).toLocaleString()}
                </div>
              )}
              {doc.dataFinalizado && (
                <div className="chip" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.85rem", opacity: 0.8 }}>
                  <span style={{ fontWeight: 600, marginRight: 4 }}>Finalizado em:</span> {new Date(doc.dataFinalizado).toLocaleString()}
                </div>
              )}
            </div>

            <div className="stack" style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Descrição</div>
              <div style={{ 
                whiteSpace: "pre-wrap", 
                padding: "12px", 
                background: "var(--bg-alt, #f9f9f9)", 
                borderRadius: 8,
                fontSize: "0.95rem",
                lineHeight: "1.5",
                border: "1px solid var(--border)"
              }}>
                {doc.description || "Nenhuma descrição fornecida."}
              </div>
            </div>
            {st === statuses.REJEITADO && doc.reason && (
              <div className="stack" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--red)" }}>Motivo da rejeição</div>
                <div style={{ padding: 12, background: "rgba(255,0,0,0.05)", borderRadius: 8, border: "1px solid var(--red)" }}>{doc.reason}</div>
              </div>
            )}
            <div className="chip" style={{ marginTop: 16 }}>Este pedido está em status de: <strong>{statusLabel(doc.status)}</strong>.</div>
            {error && <div className="chip" style={{ color: "var(--red)", marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
