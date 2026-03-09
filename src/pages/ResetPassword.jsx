import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { sectors } from "../utils/constants.js";
import * as api from "../services/api.js";

export default function ResetPassword() {
  const { user, allowedDestinations } = useAuth();
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState(null);

  const allowed = allowedDestinations();
  const options = (user.sector === "RH" || user.sector === "Peças") ? allowed : [];

  const reset = async () => {
    if (!target) return;
    try {
      await api.resetPassword(target);
      setMsg(`Senha de ${target} redefinida para 123456`);
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setMsg("Erro ao redefinir senha");
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="page-title">Reset de Senha</div>
        <button className="btn" onClick={() => navigate("/")}>Voltar</button>
      </div>
      <div className="card col-12">
        <div className="form">
          <div className="form-row">
            <label>Setor</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Selecione</option>
              {options.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn warning" onClick={reset}>Redefinir</button>
          {msg && <div className="chip">{msg}</div>}
        </div>
      </div>
    </>
  );
}
