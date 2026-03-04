import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { sectors } from "../utils/constants.js";
import * as api from "../services/api.js";

export default function GenerateInvite() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [setor, setSetor] = useState("");
  const [dias, setDias] = useState(7);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!email || !empresa || !setor) { setError("Preencha todos os campos."); return; }
    setLoading(true);
    try {
      const { token } = await api.createInvite({ email, empresa, setor, dias });
      const direct = await api.buildInviteLink(token);
      const short = await api.createDynamicShortLink(direct);
      setResult({ token, direct, short });
    } catch (err) {
      setError(err.message || "Falha ao gerar convite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="page-title">Gerar Convite</div>
        <div className="chip">{user?.sector}</div>
      </div>
      <div className="card col-12">
        <form className="form" onSubmit={submit}>
          <div className="form-row">
            <label>Email</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div className="form-row">
            <label>Empresa</label>
            <input value={empresa} onChange={(e)=>setEmpresa(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="form-row">
            <label>Setor</label>
            <select value={setor} onChange={(e)=>setSetor(e.target.value)}>
              <option value="">Selecione</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Validade (dias)</label>
            <input type="number" value={dias} min={1} onChange={(e)=>setDias(Number(e.target.value))} />
          </div>
          {error && <div className="chip" style={{ color: "var(--red)" }}>{error}</div>}
          <button className="btn primary" disabled={loading}>{loading ? "Gerando..." : "Gerar convite"}</button>
        </form>
      </div>
      {result && (
        <div className="card col-12" style={{ marginTop: 16 }}>
          <div className="form">
            <div className="form-row">
              <label>Token</label>
              <input readOnly value={result.token} />
            </div>
            <div className="form-row">
              <label>Dynamic Link</label>
              <input readOnly value={result.short || ""} />
            </div>
            <div className="form-row">
              <label>Link direto</label>
              <input readOnly value={result.direct} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
