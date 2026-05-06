import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus, statusLabel } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import StatusFilter from "../components/StatusFilter.jsx";
import * as XLSX from "xlsx";
import { ExportIcon } from "../components/Icons.jsx";
import { showToast } from "../components/Toast.jsx";

export default function Received() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("recebidos"); // "recebidos" ou "meus"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  async function load() {
    setLoadingList(true);
    try {
      let res;
      if (typeFilter === "recebidos") {
        res = await api.getReceived(user.sector, { page, pageSize });
      } else {
        res = await api.getSent(user.uid, user.sector, { page, pageSize });
      }
      setDocs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.sector, page, pageSize, typeFilter]);

  useEffect(() => {
    const unsub = api.subscribeToProposals(() => {
      load();
    });
    return () => { try { unsub(); } catch {} };
  }, [user.sector, page, pageSize, typeFilter]);

  const filtered = docs.filter(d => {
    if (filter === "Todos") return true;
    if (filter === "ANALISE") {
      const st = normalizeStatus(d.status);
      return st === statuses.PENDENTE || st === statuses.ENCAMINHADO || st === statuses.EM_ATENDIMENTO;
    }
    return normalizeStatus(d.status) === filter;
  });

  const canExport = user?.sector === "Peças";

  const exportToExcel = async () => {
    try {
      setLoadingList(true);
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
      setLoadingList(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="page-title">Pedidos para atender</div>
        <div className="chip">{user.sector}</div>
      </div>

      <div className="type-filter-group">
        <button 
          className={`type-btn ${typeFilter === "recebidos" ? "active" : ""}`} 
          onClick={() => { setTypeFilter("recebidos"); setPage(1); }}
        >
          Recebidos
        </button>
        <button 
          className={`type-btn ${typeFilter === "meus" ? "active" : ""}`} 
          onClick={() => { setTypeFilter("meus"); setPage(1); }}
        >
          Meus Pedidos
        </button>
      </div>

      <StatusFilter value={filter} onChange={setFilter} />

      {canExport && (
        <div className="actions" style={{ marginBottom: 8, justifyContent: "flex-end" }}>
          <button className="btn primary export-btn" onClick={exportToExcel} disabled={loadingList}>
            <ExportIcon />
            Exportar registros processados
          </button>
        </div>
      )}

      <div className="card col-12 stack">
        <div className="card-header">
          <div className="card-title">
            {typeFilter === "recebidos" ? "Pedidos para atender" : "Meus pedidos enviados"}
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Setor Remetente</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingList && Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td><div className="skeleton" style={{ width: 160 }} /></td>
                  <td><div className="skeleton" style={{ width: 100 }} /></td>
                  <td><div className="skeleton" style={{ width: 140 }} /></td>
                  <td><div className="skeleton" style={{ width: 80 }} /></td>
                  <td><div className="skeleton" style={{ width: 100 }} /></td>
                </tr>
              ))}
              {!loadingList && filtered.map(d => {
                const st = normalizeStatus(d.status);
                const isPecas = user.sector === "Peças";
                const isTarget = d.targetSector === user.sector;
                const podeAtender = (isPecas && (st === statuses.PENDENTE || st === statuses.APROVADO || st === statuses.EM_ATENDIMENTO || st === statuses.RECUSADO))
                                 || (isTarget && st === statuses.ENCAMINHADO);
                
                return (
                <tr key={d.id}>
                  <td data-label="Título">
                    <div className="stack">
                      <span style={{ fontWeight: 600 }}>{d.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>#{d.id.slice(-4).toUpperCase()}</span>
                    </div>
                  </td>
                  <td data-label="Setor Remetente">{d.senderSector}</td>
                  <td data-label="Data">{new Date(d.date).toLocaleString()}</td>
                  <td data-label="Status">
                    <span className={`status ${statusClass(d.status)}`}>{statusLabel(d.status)}</span>
                  </td>
                  <td data-label="Ações">
                    {podeAtender ? (
                      <NavLink className="btn primary small" style={{ width: '100%' }} to={`/avaliar/${d.id}`}>Atender</NavLink>
                    ) : (
                      <NavLink className="btn small" style={{ width: '100%' }} to={`/documento/${d.id}`}>Detalhes</NavLink>
                    )}
                  </td>
                </tr>
              );})}
              {!loadingList && filtered.length === 0 && (
                <tr><td colSpan={5} style={{ color: "var(--color-muted)" }}>Nenhum pedido encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap" }}>
          <div>
            <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
            <button className="btn" onClick={() => setPage(p => (p * pageSize < total ? p + 1 : p))} disabled={page * pageSize >= total}>Próxima</button>
          </div>
          <div>
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <div>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
