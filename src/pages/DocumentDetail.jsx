import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus } from "../utils/constants.js";

export default function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [openError, setOpenError] = useState(null);

  useEffect(() => {
    (async () => {
      const d = await api.getDocumentById(id);
      setDoc(d);
    })();
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
          <div className="info-title">Data</div>
          <div className="info-value">{new Date(doc.date).toLocaleString()}</div>
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
            {doc.fileData ? <button className="btn" onClick={openFile}>Abrir arquivo</button> : <span className="chip">Sem arquivo</span>}
            {openError && <span className="chip" style={{ color: "var(--red)", marginLeft: 8 }}>{openError}</span>}
          </div>
        </div>
      </div>
    </>
  );
}
