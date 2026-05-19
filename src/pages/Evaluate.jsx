import React, { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import { useParams, useNavigate } from "react-router-dom";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { statuses, statusClass, normalizeStatus, statusLabel, isPecasSector, canForwardToSector } from "../utils/constants.js";
import { PERMISSIONS } from "../utils/acl.js";
import { showToast } from "../components/Toast.jsx";
import { CheckIcon, XIcon, CalendarIcon, SendIcon, FileTextIcon } from "../components/Icons.jsx";

export default function Evaluate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, sectors, hasPermission } = useAuth();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [openError, setOpenError] = useState(null);
  const [preview, setPreview] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [forwardSectors, setForwardSectors] = useState([]);

  useEffect(() => {
    if (!user || !isPecasSector(user.sector)) return;
    let cancelled = false;
    api.listSectorsForForward()
      .then((list) => { if (!cancelled) setForwardSectors(list || []); })
      .catch(() => { if (!cancelled) setForwardSectors([]); });
    return () => { cancelled = true; };
  }, [user?.sector]);

  const sectorOptions = forwardSectors.length > 0 ? forwardSectors : sectors;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const d = await api.getDocumentById(id);
        
        // Proteção de Rota: Verifica se o usuário tem permissão para avaliar este documento
        const st = normalizeStatus(d.status);
        const isPecas = isPecasSector(user?.sector);
        const canPecasQueue =
          isPecas &&
          (hasPermission(PERMISSIONS.VIEW_RECEIVED) || hasPermission(PERMISSIONS.VIEW_ATTEND_QUEUE));
        const isTarget = d.targetSector === user?.sector;
        const podeAtender = (canPecasQueue && (st === statuses.PENDENTE || st === statuses.APROVADO || st === statuses.EM_ATENDIMENTO || st === statuses.RECUSADO)) || 
                            (isTarget && st === statuses.ENCAMINHADO) ||
                            (hasPermission(PERMISSIONS.EVALUATE_ORDER) && d.uidCriador === user?.uid && st === statuses.PENDENTE);

        if (!podeAtender) {
          showToast({ type: "error", message: "Você não tem permissão para avaliar este documento." });
          navigate("/dashboard");
          return;
        }

        setDoc(d);
      } catch (err) {
        console.error("Erro ao carregar documento:", err);
        setLoadError(err.message || "Erro ao carregar pedido");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate, user?.sector])

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

  const forward = async () => {
    if (!selectedSector) {
      setError("Selecione um setor para encaminhar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await api.forwardOrder(id, selectedSector);
      setDoc(d);
      showToast({ type: "success", message: `Pedido encaminhado para ${selectedSector}` });
      navigate("/recebidos");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.approveBySector(id);
      setDoc(d);
      showToast({ type: "success", message: "Pedido aprovado e enviado para compra" });
      navigate("/recebidos");
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
      const d = await api.rejectOrder(id, reason);
      setDoc(d);
      showToast({ type: "success", message: "Pedido rejeitado" });
      navigate("/recebidos");
    } catch (err) {
      setError(err.message);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return <div style={{ padding: 24 }}>{loadError}</div>;
  const assume = async () => {
    try {
      setLoading(true);
      await api.assumeOrder(id);
      showToast({ type: "success", message: "Pedido assumido para atendimento" });
      const d = await api.getDocumentById(id);
      setDoc(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!doc) return <div style={{ padding: 24 }}>Carregando...</div>;

  const st = normalizeStatus(doc.status);
  const canQueue =
    isPecasSector(user?.sector) &&
    (hasPermission(PERMISSIONS.VIEW_RECEIVED) || hasPermission(PERMISSIONS.VIEW_ATTEND_QUEUE));
  const isTarget = doc.targetSector === user?.sector;

  return (
    <>
      <Header title="Atender Pedido" user={user} />
      <div className="page-shell">
      <div className="grid">
        <div className="card col-8">
          <div className="card-header">
            <div className="card-title">{doc.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`status ${statusClass(doc.status)}`}>{statusLabel(doc.status)}</span>
              {doc.fileData ? (
                <>
                  <button className="btn primary" onClick={openFile}>Abrir</button>
                  <button className="btn" onClick={() => setPreview(p => !p)}>{preview ? "Ocultar prévia" : "Prévia"}</button>
                </>
              ) : <span className="chip">Sem arquivo</span>}
            </div>
          </div>
          {doc.fileData && preview ? (
            <iframe
              title="preview"
              src={(() => { try { return api.getFileViewUrl(doc.fileData); } catch { return ""; } })()}
              style={{ width: "100%", height: 480, border: "1px solid var(--border)", borderRadius: 12 }}
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
          <div className="stack" style={{ gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--bg-alt, #f9f9f9)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--primary)", background: "rgba(11, 100, 244, 0.08)", padding: "8px", borderRadius: "10px", display: "flex" }}>
                  <SendIcon size={18} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02rem" }}>Remetente</span>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{doc.senderSector}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--bg-alt, #f9f9f9)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--primary)", background: "rgba(11, 100, 244, 0.08)", padding: "8px", borderRadius: "10px", display: "flex" }}>
                  <CalendarIcon size={18} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02rem" }}>Data de envio</span>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{new Date(doc.date).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="stack" style={{ padding: "14px", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.7rem", color: "var(--primary)", marginBottom: 12, letterSpacing: "0.05rem", textTransform: "uppercase" }}>DADOS DO PEDIDO</div>
              <div className="stack" style={{ gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--muted)" }}>Produto:</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{doc.nomeProduto || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--muted)" }}>Código:</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{doc.codigoProduto || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--muted)" }}>Finalidade:</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{doc.finalidade || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--muted)" }}>Controle:</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{doc.recorrente ? "Recorrente" : "Único"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", marginTop: 6, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
                  <span style={{ fontWeight: 700 }}>Valor:</span>
                  <span style={{ fontWeight: 800, color: "var(--primary)" }}>
                    {doc.valor ? `R$ ${doc.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {(doc.dataAssumido || doc.dataFinalizado) && (
              <div className="stack" style={{ gap: 8 }}>
                {doc.dataAssumido && (
                  <div className="chip" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8rem", background: "rgba(0,0,0,0.02)" }}>
                    <span style={{ fontWeight: 600, marginRight: 4 }}>Assumido em:</span> {new Date(doc.dataAssumido).toLocaleString()}
                  </div>
                )}
                {doc.dataFinalizado && (
                  <div className="chip" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8rem", background: "rgba(0,0,0,0.02)" }}>
                    <span style={{ fontWeight: 600, marginRight: 4 }}>Finalizado em:</span> {new Date(doc.dataFinalizado).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "rgba(11, 100, 244, 0.03)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileTextIcon size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.7rem", color: "var(--primary)", letterSpacing: "0.04rem", textTransform: "uppercase" }}>Descrição</span>
              </div>
              <div style={{ padding: "12px 14px", fontSize: "0.9rem", lineHeight: "1.6", color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {doc.description || "Nenhuma descrição fornecida."}
              </div>
            </div>

            {st === statuses.RECUSADO && doc.reason && (
              <div style={{ padding: "12px", background: "rgba(188,0,31,0.05)", borderRadius: "12px", border: "1px solid rgba(188,0,31,0.2)" }}>
                <div style={{ fontWeight: 700, color: "var(--red)", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "6px" }}>Motivo da recusa</div>
                <div style={{ fontSize: "0.9rem", color: "var(--red)", lineHeight: "1.4" }}>{doc.reason}</div>
              </div>
            )}

            {/* Ações de Peças: Encaminhar ou Rejeitar */}
            {canQueue && st === statuses.PENDENTE && (
              <div className="stack" style={{ marginTop: 8, gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                  <span style={{ fontWeight: 700, fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05rem" }}>Ações Peças</span>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Encaminhar para setor responsável:</label>
                  <select 
                    value={selectedSector} 
                    onChange={(e) => setSelectedSector(e.target.value)}
                    style={{ padding: "10px", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                  >
                    <option value="">Selecione um setor...</option>
                    {sectorOptions
                      .filter((s) => s.ativo !== false && canForwardToSector(s.nome))
                      .map((s) => (
                        <option key={s.id} value={s.nome}>{s.nome}</option>
                      ))}
                  </select>
                  <button className="btn success" style={{ height: "42px", fontWeight: 600, borderRadius: "10px" }} disabled={loading || !selectedSector} onClick={forward}>
                    <SendIcon size={18} />
                    Encaminhar pedido
                  </button>
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Ou recusar pedido (informe o motivo):</label>
                  <textarea 
                    rows={2} 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    placeholder="Motivo da recusa..."
                    style={{ resize: "none", fontSize: "0.9rem", padding: "10px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg-alt, #f9f9f9)" }}
                  />
                  <button className="btn danger" style={{ height: "42px", fontWeight: 600, borderRadius: "10px" }} disabled={loading} onClick={reject}>
                    <XIcon size={18} />
                    Recusar pedido
                  </button>
                </div>
              </div>
            )}

            {/* Ações do Setor Responsável: Aprovar ou Rejeitar */}
            {isTarget && st === statuses.ENCAMINHADO && (
              <div className="stack" style={{ marginTop: 8, gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                  <span style={{ fontWeight: 700, fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05rem" }}>Avaliação Setor</span>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                </div>
                
                <button className="btn success" style={{ width: "100%", height: "46px", borderRadius: "12px", fontWeight: 600 }} disabled={loading} onClick={approve}>
                  <CheckIcon size={20} />
                  Aprovar pedido
                </button>

                <div className="stack" style={{ gap: 10 }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Ou recusar pedido (informe o motivo):</label>
                  <textarea 
                    rows={2} 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    placeholder="Motivo da recusa..."
                    style={{ resize: "none", fontSize: "0.9rem", padding: "10px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg-alt, #f9f9f9)" }}
                  />
                  <button className="btn danger" style={{ height: "42px", fontWeight: 600, borderRadius: "10px" }} disabled={loading} onClick={reject}>
                    <XIcon size={18} />
                    Recusar
                  </button>
                </div>
              </div>
            )}

            {/* Ações de Peças: Atender ou Finalizar */}
            {canQueue && (st === statuses.APROVADO || st === statuses.RECUSADO || st === statuses.EM_ATENDIMENTO) && (
              <div className="stack" style={{ marginTop: 8, gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                  <span style={{ fontWeight: 700, fontSize: "0.7rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05rem" }}>Processamento</span>
                  <div style={{ height: "1px", flex: 1, background: "var(--border)" }}></div>
                </div>
                
                {st === statuses.APROVADO && (
                  <>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", background: "rgba(11, 100, 244, 0.05)", padding: "10px", borderRadius: "10px", borderLeft: "4px solid var(--primary)" }}>
                      O setor responsável já <strong>aprovou</strong> este pedido. Inicie a compra ou finalize.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <button className="btn success" style={{ height: "46px", borderRadius: "10px", fontWeight: 600, fontSize: "0.85rem" }} disabled={loading} onClick={assume}>
                        Iniciar Compra
                      </button>
                      <button className="btn primary" style={{ height: "46px", borderRadius: "10px", fontWeight: 600, fontSize: "0.85rem" }} disabled={loading} onClick={finalize}>
                        Finalizar
                      </button>
                    </div>
                  </>
                )}

                {st === statuses.EM_ATENDIMENTO && (
                  <>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", background: "rgba(11, 100, 244, 0.05)", padding: "10px", borderRadius: "10px", borderLeft: "4px solid var(--primary)" }}>
                      Compra em andamento. Conclua o processo para notificar o autor.
                    </div>
                    <button className="btn primary" style={{ width: "100%", height: "46px", borderRadius: "10px", fontWeight: 600 }} disabled={loading} onClick={finalize}>
                      Finalizar Pedido
                    </button>
                  </>
                )}

                {st === statuses.RECUSADO && (
                  <>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", background: "rgba(188,0,31,0.05)", padding: "10px", borderRadius: "10px", borderLeft: "4px solid var(--red)" }}>
                      O setor responsável <strong>recusou</strong> este pedido. Você ainda pode comprar ou confirmar a recusa.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <button className="btn success" style={{ height: "46px", borderRadius: "10px", fontWeight: 600, fontSize: "0.85rem" }} disabled={loading} onClick={assume}>
                        Comprar
                      </button>
                      <button className="btn primary" style={{ height: "46px", borderRadius: "10px", fontWeight: 600, fontSize: "0.85rem" }} disabled={loading} onClick={finalize}>
                        Confirmar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {st !== statuses.RECUSADO && st !== statuses.FINALIZADO && 
             !((canQueue && (st === statuses.PENDENTE || st === statuses.APROVADO || st === statuses.EM_ATENDIMENTO)) || 
               (isTarget && st === statuses.ENCAMINHADO)) && (
              <div className="chip" style={{ marginTop: 16 }}>Aguardando processamento pelos setores responsáveis.</div>
            )}

            {error && <div className="chip" style={{ color: "var(--red)", marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
