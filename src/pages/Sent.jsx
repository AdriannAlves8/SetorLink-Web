import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { acl } from "../utils/acl.js";
import { statuses, statusClass, normalizeStatus } from "../utils/constants.js";
import { NavLink, useNavigate } from "react-router-dom";
import StatusFilter from "../components/StatusFilter.jsx";
import * as XLSX from "xlsx";
import { ExportIcon } from "../components/Icons.jsx";
import { showToast } from "../components/Toast.jsx";

export default function Sent({ compose = true }) {
  const { user, allowedDestinations, can } = useAuth();
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [targets, setTargets] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loadingList, setLoadingList] = useState(false);

  const canExport = user?.sector === "RH" || user?.sector === "Peças";

  // ----------------------------
  // LOAD DOCUMENTS
  // ----------------------------
  async function load() {
    try {
      setLoadingList(true);
      const hidden = acl[user.sector]?.hidden_sent_from || [];
      const res = await api.getSent(user.sector, hidden, { page, pageSize });
      setDocs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (user?.sector) load();
  }, [user?.sector, page, pageSize]);

  useEffect(() => {
    const unsub = api.subscribeToProposals(() => {
      if (user?.sector) load();
    });
    return () => { try { unsub(); } catch {} };
  }, [user?.sector, page, pageSize]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setConfirmDelete(null); };
    if (confirmDelete) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDelete]);

  // ----------------------------
  // FILE HANDLER
  // ----------------------------
  const onFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  // ----------------------------
  // SEND DOCUMENT
  // ----------------------------
  const send = async (e) => {
    e.preventDefault();
    setError(null);

    if (!can("send")) return;

    if (!title || targets.length === 0 || !file) {
      setError("Preencha título, selecione pelo menos um destino e arquivo.");
      return;
    }

    if (file && file.type !== "application/pdf") {
      setError("Apenas arquivos PDF são permitidos.");
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) { // 10MB limit
      setError("O arquivo é muito grande. O limite é 10MB.");
      return;
    }

    setLoading(true);

    try {
      await api.sendDocument({
        title,
        description,
        file,
        senderSector: user.sector,
        targetSector: targets,
      });

      setTitle("");
      setDescription("");
      setFile(null);
      setTargets([]);
      await load();
      navigate("/");
      showToast({ type: "success", message: "Documento enviado" });
    } catch (err) {
      setError(err.message || "Falha ao enviar documento.");
      showToast({ type: "error", message: err.message || "Falha ao enviar documento" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteDocumentIfPending(id);
      await load();
      showToast({ type: "success", message: "Documento excluído" });
    } catch (err) {
      showToast({ type: "error", message: err.message || "Erro ao excluir documento" });
    }
  };

  // ----------------------------
  // FILTERED DOCUMENTS
  // ----------------------------
  const filteredDocs = useMemo(() => {
    return docs.filter((d) =>
      filter === "Todos" ? true : d.status === filter
    );
  }, [docs, filter]);

  // ----------------------------
  // EXPORT TO EXCEL
  // ----------------------------
  const exportToExcel = () => {
    try {
      const evaluated = docs.filter(
        (d) => d.status !== statuses.PENDENTE
      );

      if (evaluated.length === 0) {
        alert("Não há documentos avaliados para exportar.");
        return;
      }

      const headers = ["Título","Descrição","Enviado por","Recebido por","Status","Mot.Reprovação","Documento"];
      const rows = evaluated.map((d) => {
        let docUrl = "";
        try { if (d.fileData) docUrl = api.getFileViewUrl(d.fileData); } catch {}
        const prettyLink = docUrl ? { t: "s", v: "Abrir", l: { Target: docUrl } } : "";
        return [
          d.title,
          d.description || "",
          d.senderSector || "",
          Array.isArray(d.targetSector) ? d.targetSector.join(", ") : d.targetSector || "",
          d.status,
          d.reason || "",
          prettyLink
        ];
      });
      const aoa = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      worksheet["!cols"] = [
        { wch: 30 },
        { wch: 50 },
        { wch: 16 },
        { wch: 18 },
        { wch: 12 },
        { wch: 20 },
        { wch: 10 }
      ];
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Documentos Avaliados"
      );

      XLSX.writeFile(
        workbook,
        `documentos_avaliados_${user.sector}_${Date.now()}.xlsx`
      );
    } catch (err) {
      console.error("Erro ao exportar:", err);
      alert("Erro ao exportar planilha.");
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="page-title">
          {compose ? "Enviar Documento" : "Enviados"}
        </div>
        <div className="chip">{user?.sector}</div>
      </div>

      {/* ---------------- COMPOSE ---------------- */}
      {compose && can("send") && (
        <form className="form stack" onSubmit={send}>
          <div className="form-row">
            <label>Arquivo</label>
            <input type="file" onChange={onFile} />
          </div>

          <div className="form-row">
            <label>Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do documento"
            />
          </div>

          <div className="form-row">
            <label>Descrição</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição"
            />
          </div>

          <div className="form-row">
            <label>Destinos</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allowedDestinations().map((d) => (
                <label key={d} style={{ display: "flex", gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={targets.includes(d)}
                    onChange={(e) =>
                      e.target.checked
                        ? setTargets([...targets, d])
                        : setTargets(targets.filter((t) => t !== d))
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: "var(--red)" }}>{error}</div>
          )}

          <button className="btn primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar"}
          </button>

          <div className="divider" />
        </form>
      )}

      {/* ---------------- LIST ---------------- */}
      {!compose && (
        <>
          <StatusFilter value={filter} onChange={setFilter} />

          {canExport && (
            <div className="actions" style={{ marginBottom: 8, justifyContent: "flex-end" }}>
              <button className="btn primary export-btn" onClick={exportToExcel}>
                <ExportIcon />
                Exportar Documentos Avaliados
              </button>
            </div>
          )}

          <div className="card col-12">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Destino</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingList && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td><div className="skeleton" style={{ width: 160 }} /></td>
                    <td><div className="skeleton" style={{ width: 120 }} /></td>
                    <td><div className="skeleton" style={{ width: 140 }} /></td>
                    <td><div className="skeleton" style={{ width: 80 }} /></td>
                    <td><div className="skeleton" style={{ width: 100 }} /></td>
                  </tr>
                ))}
                {!loadingList && filteredDocs.map((d) => (
                  <tr key={d.id}>
                    <td>{d.title}</td>
                    <td>
                      {Array.isArray(d.targetSector)
                        ? d.targetSector.join(", ")
                        : d.targetSector}
                    </td>
                    <td>
                      {new Date(d.date).toLocaleString()}
                    </td>
                    <td>
                      <span className={`status ${statusClass(d.status)}`}>
                        {normalizeStatus(d.status)}
                      </span>
                    </td>
                    <td>
                      <NavLink className="btn" to={`/documento/${d.id}`}>Detalhes</NavLink>

                      {normalizeStatus(d.status) === statuses.PENDENTE &&
                        can("delete_if_pending") && (
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
                    <td colSpan={5} style={{ color: "var(--color-muted)" }}>
                      Nenhum documento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
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
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="card-title">Excluir Documento</div>
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

// ---------------- UTIL ----------------
