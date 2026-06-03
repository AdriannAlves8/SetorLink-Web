import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { PERMISSIONS } from "../utils/acl.js";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus, statusLabel, isPecasSector } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import StatusFilter, { matchesStatusFilter } from "../components/StatusFilter.jsx";
import * as XLSX from "xlsx";
import { ExportIcon } from "../components/Icons.jsx";
import { showToast } from "../components/Toast.jsx";
import Header from "../components/Header.jsx";

export default function Received() {
  const { user, hasPermission } = useAuth();
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  async function load() {
    if (!user?.sector || !hasPermission(PERMISSIONS.VIEW_ATTEND_QUEUE)) return;
    setLoadingList(true);
    try {
      const res = await api.getReceived(user.sector, { page, pageSize });
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
  }, [user?.sector, page, pageSize]);

  useEffect(() => {
    const unsub = api.subscribeToProposals(() => load());
    return () => { try { unsub(); } catch {} };
  }, [user?.sector, page, pageSize]);

  const filtered = docs.filter((d) =>
    matchesStatusFilter(normalizeStatus(d.status), filter, "attend")
  );

  const canExport = hasPermission(PERMISSIONS.EXPORT_EXCEL);

  const exportToExcel = async () => {
    try {
      setLoadingList(true);
      const [receivedRes, notasRec] = await Promise.all([
        api.getReceived(user.sector, { page: 1, pageSize: 2000, allStatuses: true }),
        api.getNotasFiscais(user.sector, "received")
      ]);

      const combined = [...receivedRes.items, ...notasRec.items];
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());

      const processed = unique.filter(
        (d) =>
          normalizeStatus(d.status) === statuses.FINALIZADO ||
          normalizeStatus(d.status) === statuses.RECUSADO
      );

      if (processed.length === 0) {
        showToast({ type: "info", message: "Não há registros finalizados ou recusados para exportar." });
        return;
      }

      const headers = [
        "Tipo", "Data", "Título", "Produto", "Código", "Descrição", "Finalidade",
        "Recorrente", "Valor (R$)", "Remetente", "Destino", "Status", "Motivo Rejeição",
        "Data Finalizado", "Documento"
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

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      worksheet["!cols"] = [
        { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 15 },
        { wch: 40 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 16 },
        { wch: 16 }, { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 10 }
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");
      XLSX.writeFile(workbook, `pedidos_atender_${user.sector}_${new Date().toISOString().split("T")[0]}.xlsx`);
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
      <Header title="Pedidos para Atender" user={user} />

      <div className="page-shell received-page">
        {hasPermission(PERMISSIONS.VIEW_ATTEND_QUEUE) && !isPecasSector(user?.sector) && (
          <p className="received-hint">
            Pedidos encaminhados pelo setor Peças para <strong>{user?.sector}</strong>.
            Use &quot;Atender&quot; quando o status for <strong>Encaminhado</strong>.
          </p>
        )}

        <StatusFilter value={filter} onChange={setFilter} variant="attend" />

        {canExport && (
          <div className="received-toolbar">
            <button className="btn primary export-btn" onClick={exportToExcel} disabled={loadingList}>
              <ExportIcon />
              Exportar finalizados / recusados
            </button>
          </div>
        )}

        <div className="card col-12 received-panel">
          <div className="card-header received-panel__header">
            <div className="card-title">Fila de atendimento</div>
            <span className="chip">{filtered.length} pedido(s)</span>
          </div>
          <div className="table-container">
            <table className="table table--stacked">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Setor remetente</th>
                  <th>Destino</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingList && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td data-label="Título"><div className="skeleton" style={{ width: 160 }} /></td>
                    <td data-label="Setor remetente"><div className="skeleton" style={{ width: 100 }} /></td>
                    <td data-label="Destino"><div className="skeleton" style={{ width: 100 }} /></td>
                    <td data-label="Data"><div className="skeleton" style={{ width: 140 }} /></td>
                    <td data-label="Status"><div className="skeleton" style={{ width: 80 }} /></td>
                    <td data-label="Ações"><div className="skeleton" style={{ width: 100 }} /></td>
                  </tr>
                ))}
                {!loadingList && filtered.map((d) => {
                  const st = normalizeStatus(d.status);
                  const isPecas = isPecasSector(user?.sector);
                  const isTarget = d.targetSector === user.sector;
                  const podeAtender =
                    (isPecas &&
                      (st === statuses.PENDENTE ||
                        st === statuses.APROVADO ||
                        st === statuses.EM_ATENDIMENTO ||
                        st === statuses.RECUSADO)) ||
                    (isTarget && st === statuses.ENCAMINHADO);

                  return (
                    <tr key={d.id}>
                      <td data-label="Título">
                        <div className="stack">
                          <span className="received-row__title">{d.title}</span>
                          <span className="received-row__id">#{d.id.slice(-4).toUpperCase()}</span>
                        </div>
                      </td>
                      <td data-label="Setor remetente">{d.senderSector}</td>
                      <td data-label="Destino">{d.targetSector || "—"}</td>
                      <td data-label="Data">{new Date(d.date).toLocaleString()}</td>
                      <td data-label="Status">
                        <span className={`status ${statusClass(d.status)}`}>{statusLabel(d.status)}</span>
                      </td>
                      <td data-label="Ações">
                        {podeAtender ? (
                          <NavLink className="btn primary small" style={{ width: "100%" }} to={`/avaliar/${d.id}`}>
                            Atender
                          </NavLink>
                        ) : (
                          <NavLink className="btn small" style={{ width: "100%" }} to={`/documento/${d.id}`}>
                            Detalhes
                          </NavLink>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loadingList && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      Nenhum pedido nesta fila para o filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination received-pagination">
            <div>
              <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Anterior
              </button>
              <button
                className="btn"
                onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
                disabled={page * pageSize >= total}
              >
                Próxima
              </button>
            </div>
            <span>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
