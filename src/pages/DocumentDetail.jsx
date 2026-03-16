import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus } from "../utils/constants.js";

export default function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [openError, setOpenError] = useState(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const load = async () => {
      const d = await api.getDocumentById(id);
      setDoc(d);
    };
    load();
    const unsubscribe = api.subscribeToDocument(id, () => {
      load();
    });
    return () => unsubscribe();
  }, [id]);

  if (!doc) return <div style={{ padding: 24 }}>Carregando...</div>;
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
  return (
    <>
      <div className="content-header">
        <div className="page-title">Detalhes do Documento</div>
      </div>
      <div className="grid">
        <div className="card col-8">
          <div className="card-header">
            <div className="card-title">{doc.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`status ${statusClass(doc.status)}`}>{normalizeStatus(doc.status)}</span>
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
          </div>
        </div>
      </div>
    </>
  );
}
