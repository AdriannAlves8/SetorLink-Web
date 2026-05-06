import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { sectors } from "../utils/constants.js";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast.jsx";

export default function NewNotaFiscal() {
  const { user, can } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [propostaId, setPropostaId] = useState("");
  const [targetSector, setTargetSector] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userOrders, setUserOrders] = useState([]);

  useEffect(() => {
    async function loadOrders() {
      if (user?.uid) {
        try {
          // Busca tanto os pedidos enviados quanto recebidos pelo setor Peças (ou outros)
          const [sentRes, receivedRes] = await Promise.all([
            api.getSent(user.uid, user.sector, { page: 1, pageSize: 100 }),
            api.getReceived(user.sector, { page: 1, pageSize: 100, allStatuses: true })
          ]);
          
          // Combina os resultados e remove duplicatas por ID
          const combined = [...sentRes.items, ...receivedRes.items];
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          
          setUserOrders(unique);
        } catch (err) {
          console.error("Erro ao carregar pedidos para referência:", err);
        }
      }
    }
    loadOrders();
  }, [user]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type !== "application/pdf") {
      setError("Apenas arquivos PDF são permitidos.");
      return;
    }
    setFile(f || null);
    setError(null);
  };

  const send = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Informe o nome da nota.");
      return;
    }
    if (!targetSector) {
      setError("Selecione o setor de destino.");
      return;
    }
    if (!file) {
      setError("Selecione o arquivo PDF da nota fiscal.");
      return;
    }

    setLoading(true);

    try {
      const selectedOrder = userOrders.find(o => o.id === propostaId);
      const propostaTitle = selectedOrder ? selectedOrder.title.replace("[NOTA FISCAL] ", "") : "";

      await api.sendNotaFiscal({
        title: title.trim(),
        propostaId,
        propostaTitle,
        targetSector,
        file,
        senderSector: user.sector
      });

      showToast({ type: "success", message: "Nota Fiscal enviada com sucesso" });
      navigate("/");
    } catch (err) {
      setError(err.message || "Falha ao enviar nota fiscal.");
    } finally {
      setLoading(false);
    }
  };

  if (user?.sector !== "Peças") return <div className="content">Acesso negado. Apenas o setor Peças pode enviar notas fiscais.</div>;

  return (
    <>
      <div className="content-header">
        <div className="page-title">Enviar Nota Fiscal</div>
        <div className="chip">{user?.sector}</div>
      </div>

      <form className="form stack" onSubmit={send}>
        <div className="form-row">
          <label>Nome da Nota Fiscal <span style={{ color: "var(--red)" }}>*</span></label>
          <input
            type="text"
            placeholder="Ex: NF-e 12345 - Roteador TI"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Pedido de Referência (Opcional)</label>
          <select value={propostaId} onChange={(e) => setPropostaId(e.target.value)}>
            <option value="">Selecione um pedido para vincular esta nota...</option>
            {userOrders.map(o => (
              <option key={o.id} value={o.id}>
                {o.title.replace("[NOTA FISCAL] ", "")} ({new Date(o.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Setor de Destino <span style={{ color: "var(--red)" }}>*</span></label>
          <select value={targetSector} onChange={(e) => setTargetSector(e.target.value)}>
            <option value="">Selecione o setor...</option>
            {sectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Arquivo PDF <span style={{ color: "var(--red)" }}>*</span></label>
          <input type="file" accept="application/pdf" onChange={onFile} />
          <div className="helper">Máximo 10MB. Apenas PDF.</div>
        </div>

        {error && <div className="chip danger" style={{ marginTop: 8 }}>{error}</div>}

        <div className="actions" style={{ marginTop: 20 }}>
          <button className="btn primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Nota Fiscal"}
          </button>
        </div>
      </form>
    </>
  );
}
