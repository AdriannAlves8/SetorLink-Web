import React, { useEffect, useState } from "react";
import * as api from "../services/api.js";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("Processando verificação...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const userId = url.searchParams.get("userId") || url.searchParams.get("user") || "";
    const secret = url.searchParams.get("secret") || "";
    if (!userId || !secret) {
      setMsg("Link inválido.");
      setDone(true);
      return;
    }
    (async () => {
      try {
        await api.updateEmailVerification(userId, secret);
        setMsg("E-mail verificado com sucesso. Redirecionando ao login...");
      } catch (err) {
        setMsg(err.message || "Falha na verificação.");
      } finally {
        setDone(true);
        setTimeout(() => nav("/login"), 2000);
      }
    })();
  }, [nav]);

  return (
    <div style={{ padding: 24 }}>
      <div className="card col-12">
        <div className="form">
          <div className="chip">{msg}</div>
        </div>
      </div>
    </div>
  );
}
