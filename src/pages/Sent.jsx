import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus, statusLabel } from "../utils/constants.js";
import { NavLink, useNavigate } from "react-router-dom";
import StatusFilter, { matchesStatusFilter } from "../components/StatusFilter.jsx";
import * as XLSX from "xlsx";
import { ExportIcon } from "../components/Icons.jsx";
import { showToast } from "../components/Toast.jsx";
import { PERMISSIONS } from "../utils/acl.js";

import Header from "../components/Header.jsx";

export default function Sent({ compose = false }) {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [isComposing, setIsComposing] = useState(compose);

  useEffect(() => {
    setIsComposing(compose);
  }, [compose]);

  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState("");
  const [nomeProduto, setNomeProduto] = useState("");
  const [codigoProduto, setCodigoProduto] = useState("");
  const [description, setDescription] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [valor, setValor] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loadingList, setLoadingList] = useState(false);

  const canExport = hasPermission(PERMISSIONS.EXPORT_EXCEL);

  async function load() {
    try {
      setLoadingList(true);
      if (!user?.uid) return;
      const res = await api.getSent(user.uid, user.sector, { page, pageSize });
      setDocs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (user?.sector && user?.uid) load();
  }, [user?.sector, user?.uid, page, pageSize]);

  useEffect(() => {
    const unsub = api.subscribeToProposals(() => {
      if (user?.sector && user?.uid) load();
    });
    return () => { try { unsub(); } catch {} };
  }, [user?.sector, user?.uid, page, pageSize]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setConfirmDelete(null); };
    if (confirmDelete) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDelete]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const send = async (e) => {
    e.preventDefault();
    setError(null);

    if (!hasPermission(PERMISSIONS.CREATE_ORDER)) return;

    const tituloTrim = String(title || "").trim();
    const descTrim = String(description || "").trim();
    const nomeProdTrim = String(nomeProduto || "").trim();
    const codigoProdTrim = String(codigoProduto || "").trim();
    if (!tituloTrim) {
      setError("Informe a solicitação de compra.");
      return;
    }
    if (!nomeProdTrim) {
      setError("Informe o nome do produto.");
      return;
    }
    if (!codigoProdTrim) {
      setError("Informe o código do produto.");
      return;
    }
    if (!descTrim) {
      setError("Informe a descrição.");
      return;
    }

    const valorTrim = String(valor || "").trim();
    if (valorTrim !== "") {
      const n = parseFloat(valorTrim.replace(",", "."));
      if (Number.isNaN(n) || n < 0) {
        setError("O valor deve ser um número maior ou igual a zero.");
        return;
      }
    }

    if (file && file.type !== "application/pdf") {
      setError("Apenas arquivos PDF são permitidos.");
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setError("O arquivo é muito grande. O limite é 10MB.");
      return;
    }

    setLoading(true);

    try {
      await api.sendDocument({
        title: tituloTrim,
        description: descTrim,
        file,
        senderSector: user.sector,
        targetSector: null,
        nomeProduto: nomeProdTrim,
        codigoProduto: codigoProdTrim,
        finalidade,
        recorrente,
        valor: valorTrim === "" ? null : valorTrim.replace(",", ".")
      });

      setTitle("");
      setNomeProduto("");
      setCodigoProduto("");
      setDescription("");
      setFinalidade("");
      setRecorrente(false);
      setValor("");
      setFile(null);
      await load();
      navigate("/");
      showToast({ type: "success", message: "Pedido enviado" });
    } catch (err) {
      setError(err.message || "Falha ao enviar pedido.");
      showToast({ type: "error", message: err.message || "Falha ao enviar pedido" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteDocumentIfPending(id);
      await load();
      showToast({ type: "success", message: "Pedido excluído" });
    } catch (err) {
      showToast({ type: "error", message: err.message || "Erro ao excluir documento" });
    }
  };

  const filteredDocs = useMemo(() => {
    return docs.filter((d) =>
      matchesStatusFilter(normalizeStatus(d.status), filter, "sent")
    );
  }, [docs, filter]);

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

  const canDeleteRow = (d) => {
      if (!hasPermission(PERMISSIONS.DELETE_PENDING)) return false;
    if (normalizeStatus(d.status) !== statuses.PENDENTE) return false;
    if (d.uidCriador) return user.uid === d.uidCriador;
    return d.senderSector === user.sector;
  };

  return (
    <>
      <Header 
        title={user?.sector === "Peças" ? "Notas Fiscais Enviadas" : (isComposing ? "Criar Pedido" : "Pedidos enviados")} 
        user={user} 
      />

      <div className="page-shell">
      {isComposing && hasPermission(PERMISSIONS.CREATE_ORDER) && (
        <form className="form stack" onSubmit={send}>
          <div className="helper" style={{ color: "var(--muted)", marginBottom: 4 }}>
            O pedido será analisado exclusivamente pelo setor Peças.
          </div>

          <section className="stack" style={{ gap: 12 }} aria-labelledby="sec-dados-pedido">
            <h2 id="sec-dados-pedido" style={{ fontSize: "0.95rem", fontWeight: 700, margin: "8px 0 0", color: "var(--muted)" }}>
              1. Dados do pedido
            </h2>
            <div className="form-row">
              <label htmlFor="sol-compra">Solicitação de compra <span style={{ color: "var(--red)" }}>*</span></label>
              <input
                id="sol-compra"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Identifique a solicitação"
                autoComplete="off"
              />
            </div>
            <div className="form-row">
              <label htmlFor="nome-produto">Nome do produto <span style={{ color: "var(--red)" }}>*</span></label>
              <input
                id="nome-produto"
                value={nomeProduto}
                onChange={(e) => setNomeProduto(e.target.value)}
                placeholder="Obrigatório"
                autoComplete="off"
              />
            </div>
            <div className="form-row">
              <label htmlFor="codigo-produto">Código do produto <span style={{ color: "var(--red)" }}>*</span></label>
              <input
                id="codigo-produto"
                value={codigoProduto}
                onChange={(e) => setCodigoProduto(e.target.value)}
                placeholder="Obrigatório"
                autoComplete="off"
              />
            </div>
          </section>

          <div className="divider" />

          <section className="stack" style={{ gap: 12 }} aria-labelledby="sec-detalhes">
            <h2 id="sec-detalhes" style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--muted)" }}>
              2. Detalhes
            </h2>
            <div className="form-row">
              <label htmlFor="desc-pedido">Descrição <span style={{ color: "var(--red)" }}>*</span></label>
              <textarea
                id="desc-pedido"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o pedido com o nível de detalhe necessário"
              />
            </div>
            <div className="form-row">
              <label htmlFor="finalidade-pedido">Finalidade</label>
              <textarea
                id="finalidade-pedido"
                rows={3}
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                placeholder="Opcional — para que o material será utilizado"
              />
            </div>
          </section>

          <div className="divider" />

          <section aria-labelledby="sec-controle">
            <h2 id="sec-controle" style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 8px", color: "var(--muted)" }}>
              3. Controle
            </h2>
            <div className="form-row" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <input
                id="recorrente-switch"
                type="checkbox"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                style={{ width: "auto", minWidth: 18, height: 18, cursor: "pointer" }}
              />
              <label htmlFor="recorrente-switch" style={{ marginBottom: 0, cursor: "pointer" }}>
                Recorrente
              </label>
            </div>
          </section>

          <div className="divider" />

          <section className="stack" style={{ gap: 8 }} aria-labelledby="sec-valor">
            <h2 id="sec-valor" style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--muted)" }}>
              4. Valor
            </h2>
            <div className="form-row">
              <label htmlFor="valor-pedido">Valor (R$)</label>
              <input
                id="valor-pedido"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Opcional — 0 ou mais"
              />
            </div>
          </section>

          <div className="divider" />

          <section className="stack" style={{ gap: 8 }} aria-labelledby="sec-anexo">
            <h2 id="sec-anexo" style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--muted)" }}>
              5. Anexo
            </h2>
            <div className="form-row">
              <label htmlFor="pdf-pedido">Documento PDF</label>
              <input id="pdf-pedido" type="file" accept="application/pdf" onChange={onFile} />
              <div className="helper" style={{ color: "var(--muted)", marginTop: 4 }}>Opcional — anexe quando houver documento.</div>
            </div>
          </section>

          {error && (
            <div style={{ color: "var(--red)" }} role="alert">{error}</div>
          )}

          <div className="actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Criar Pedido"}
            </button>
          </div>

          <div className="divider" />
        </form>
      )}

      {!isComposing && (
        <>
          <StatusFilter value={filter} onChange={setFilter} variant="sent" />

          <div className="actions" style={{ marginBottom: 8, justifyContent: "flex-end", gap: 8 }}>
            {canExport && (
              <button className="btn primary export-btn" onClick={exportToExcel} disabled={loadingList}>
                <ExportIcon />
                Exportar registros processados
              </button>
            )}
            {hasPermission(PERMISSIONS.CREATE_ORDER) && (
              <button className="btn primary" onClick={() => setIsComposing(true)}>
                Novo Pedido
              </button>
            )}
          </div>

          <div className="card col-12">
            <div className="table-container">
              <table className="table table--stacked">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Remetente</th>
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
                      <td data-label="Remetente"><div className="skeleton" style={{ width: 100 }} /></td>
                      <td data-label="Destino"><div className="skeleton" style={{ width: 100 }} /></td>
                      <td data-label="Data"><div className="skeleton" style={{ width: 140 }} /></td>
                      <td data-label="Status"><div className="skeleton" style={{ width: 80 }} /></td>
                      <td data-label="Ações"><div className="skeleton" style={{ width: 100 }} /></td>
                    </tr>
                  ))}
                  {!loadingList && filteredDocs.map((d) => (
                    <tr key={d.id}>
                      <td data-label="Título">{d.title}</td>
                      <td data-label="Remetente">{d.senderSector}</td>
                      <td data-label="Destino">{d.targetSector || "Peças"}</td>
                      <td data-label="Data">
                        {new Date(d.date).toLocaleString()}
                      </td>
                      <td data-label="Status">
                        <span className={`status ${statusClass(d.status)}`}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                      <td data-label="Ações">
                        <NavLink className="btn" to={`/documento/${d.id}`}>Detalhes</NavLink>

                        {canDeleteRow(d) && (
                            <button
                              className="btn danger"
                              onClick={() => setConfirmDelete({ id: d.id, title: d.title })}
                            >
                              Excluir
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}

                  {!loadingList && filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ color: "var(--color-muted)" }}>
                        Nenhum pedido encontrado
                      </td>
                    </tr>
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
      )}
      </div>
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="card-title">Excluir pedido</div>
            </div>
            <div className="stack">
              <div style={{ color: "var(--muted)" }}>
                Tem certeza que deseja excluir "{confirmDelete.title}"? Esta ação não pode ser desfeita.
              </div>
              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                <button
                  className="btn danger"
                  onClick={async () => {
                    const id = confirmDelete.id;
                    setConfirmDelete(null);
                    await remove(id);
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
