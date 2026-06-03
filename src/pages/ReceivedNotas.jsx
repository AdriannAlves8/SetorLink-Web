import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { PERMISSIONS } from "../utils/acl.js";
import * as api from "../services/api.js";
import { statuses, statusClass, statusLabel, normalizeStatus } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import * as XLSX from "xlsx";
import { ExportIcon } from "../components/Icons.jsx";
import { showToast } from "../components/Toast.jsx";
import Header from "../components/Header.jsx";

export default function ReceivedNotas() {
  const { user, hasPermission } = useAuth();
  const [notas, setNotas] = useState([]);
  const [typeFilter, setTypeFilter] = useState("received"); // "received" ou "sent"
  const [loading, setLoading] = useState(false);

  const canExport = hasPermission(PERMISSIONS.EXPORT_EXCEL);

  const exportToExcel = async () => {
    try {
      setLoading(true);
      // Busca Pedidos (Sent + Received) e Notas Fiscais para Peças
      const [sentRes, receivedRes, notasRec, notasSent] = await Promise.all([
        api.getSent(user.uid, user.sector, { page: 1, pageSize: 2000 }),
        api.getReceived(user.sector, { page: 1, pageSize: 2000, allStatuses: true }),
        api.getNotasFiscais(user.sector, "received"),
        api.getNotasFiscais(user.sector, "sent")
      ]);
      
      // Combina tudo e remove duplicatas
      const combined = [...sentRes.items, ...receivedRes.items, ...notasRec.items, ...notasSent.items];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

      const processed = unique.filter(
        (d) => normalizeStatus(d.status) === statuses.FINALIZADO || normalizeStatus(d.status) === statuses.REJEITADO
      );

      if (processed.length === 0) {
        showToast({ type: "info", message: "Não há registros finalizados ou rejeitados para exportar." });
        return;
      }

      const headers = [
        "Tipo",
        "Data",
        "Título",
        "Produto",
        "Código",
        "Descrição",
        "Finalidade",
        "Recorrente",
        "Valor (R$)",
        "Remetente",
        "Destino",
        "Status",
        "Motivo Rejeição",
        "Data Finalizado",
        "Documento"
      ];

      const rows = processed.map((d) => {
        let docUrl = "";
        try { if (d.fileData) docUrl = api.getFileViewUrl(d.fileData); } catch {}
        const prettyLink = docUrl ? { t: "s", v: "Abrir", l: { Target: docUrl } } : "";
        const isNota = d.title.startsWith("[NOTA FISCAL]");
        
        return [
          isNota ? "Nota Fiscal" : "Pedido",
          new Date(d.date).toLocaleString(),
          d.title.replace("[NOTA FISCAL] ", ""),
          d.nomeProduto || "",
          d.codigoProduto || "",
          d.description || "",
          d.finalidade || "",
          d.recorrente ? "Sim" : "Não",
          d.valor != null ? d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
          d.senderSector || "",
          d.targetSector || "Peças",
          statusLabel(d.status),
          d.reason || "",
          d.dataFinalizado ? new Date(d.dataFinalizado).toLocaleString() : "",
          prettyLink
        ];
      });

      const aoa = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      
      // Ajuste de largura das colunas
      worksheet["!cols"] = [
        { wch: 15 }, // Tipo
        { wch: 20 }, // Data
        { wch: 30 }, // Título
        { wch: 25 }, // Produto
        { wch: 15 }, // Código
        { wch: 40 }, // Descrição
        { wch: 25 }, // Finalidade
        { wch: 12 }, // Recorrente
        { wch: 15 }, // Valor
        { wch: 16 }, // Remetente
        { wch: 16 }, // Destino
        { wch: 18 }, // Status
        { wch: 25 }, // Motivo
        { wch: 20 }, // Data Finalizado
        { wch: 10 }  // Documento
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");
      XLSX.writeFile(workbook, `pedidos_export_${user.sector}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showToast({ type: "success", message: "Planilha exportada com sucesso" });
    } catch (err) {
      console.error("Erro ao exportar:", err);
      showToast({ type: "error", message: "Erro ao exportar planilha" });
    } finally {
      setLoading(false);
    }
  };

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
  }, [user?.sector, typeFilter]);

  const openFile = (fileId) => {
    try {
      const url = api.getFileViewUrl(fileId);
      window.open(url, "_blank");
    } catch (err) {
      alert("Erro ao abrir arquivo");
    }
  };

  return (
    <>
      <Header title="Notas Fiscais" user={user} />

      <div className="page-shell">
      <div className="type-filter-group">
        <button 
          className={`type-btn ${typeFilter === "received" ? "active" : ""}`} 
          onClick={() => setTypeFilter("received")}
        >
          Notas Recebidas
        </button>
        {hasPermission(PERMISSIONS.VIEW_NOTA_SENT) && (
          <button 
            className={`type-btn ${typeFilter === "sent" ? "active" : ""}`} 
            onClick={() => setTypeFilter("sent")}
          >
            Notas Enviadas
          </button>
        )}
      </div>

      {canExport && (
        <div className="actions" style={{ marginBottom: 8, justifyContent: "flex-end" }}>
          <button className="btn primary export-btn" onClick={exportToExcel} disabled={loading}>
            <ExportIcon />
            Exportar registros processados
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
          <table className="table table--stacked">
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
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td data-label="Nome da Nota"><div className="skeleton" style={{ width: 160 }} /></td>
                  <td data-label={typeFilter === "received" ? "Remetente" : "Destino"}><div className="skeleton" style={{ width: 100 }} /></td>
                  <td data-label="Data"><div className="skeleton" style={{ width: 140 }} /></td>
                  <td data-label="Status"><div className="skeleton" style={{ width: 80 }} /></td>
                  <td data-label="Ações"><div className="skeleton" style={{ width: 120 }} /></td>
                </tr>
              ))}
              {!loading && notas.map(n => (
                <tr key={n.id}>
                  <td data-label="Nome da Nota">{n.title.replace("[NOTA FISCAL] ", "")}</td>
                  <td data-label={typeFilter === "received" ? "Remetente" : "Destino"}>
                    {typeFilter === "received" ? n.senderSector : n.targetSector}
                  </td>
                  <td data-label="Data">{new Date(n.date).toLocaleString()}</td>
                  <td data-label="Status">
                    <span className={`status ${statusClass(n.status)}`}>{statusLabel(n.status)}</span>
                  </td>
                  <td data-label="Ações">
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn primary small" onClick={() => openFile(n.fileData)}>Ver PDF</button>
                      {typeFilter === "received" && normalizeStatus(n.status) === statuses.PENDENTE ? (
                        <NavLink className="btn success small" to={`/avaliar-nota/${n.id}`}>Avaliar Nota</NavLink>
                      ) : (
                        <NavLink className="btn small" to={`/documento/${n.id}`}>Detalhes</NavLink>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && notas.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--color-muted)", padding: "32px" }}>Nenhuma nota encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  );
}
