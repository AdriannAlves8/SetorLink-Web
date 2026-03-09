import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, statusClass, normalizeStatus } from "../utils/constants.js";
import { acl } from "../utils/acl.js";
import { NavLink } from "react-router-dom";
import Header from "../components/Header.jsx";
import SummaryCard from "../components/SummaryCard.jsx";
import DocumentCard from "../components/DocumentCard.jsx";

export default function Dashboard() {
  const { user, can } = useAuth();
  const [received, setReceived] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [sent, setSent] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    (async () => {
      const r = await api.getReceived(user.sector, { page: 1, pageSize: 50 });
      setReceived(r.items);
      const n = await api.getNotifications(user.sector);
      setNotifications(n);
      if (can("view_sent")) {
        const hidden = acl[user.sector]?.hidden_sent_from || [];
        const s = await api.getSent(user.sector, hidden, { page: 1, pageSize: 50 });
        setSent(s.items);
      } else {
        setSent([]);
      }
      const st = await api.getStats(user.sector, { source: can("view_received") ? "received" : "sent" });
      setStats(st);
    })();
    const onStorage = (e) => {
      if (e.key === "setorlink.documents" || e.key === "setorlink.notifications") {
        (async () => {
          const r = await api.getReceived(user.sector, { page: 1, pageSize: 50 });
          setReceived(r.items);
          const st = await api.getStats(user.sector, { source: can("view_received") ? "received" : "sent" });
          setStats(st);
          const n = await api.getNotifications(user.sector);
          setNotifications(n);
          if (can("view_sent")) {
            const hidden = acl[user.sector]?.hidden_sent_from || [];
            const s = await api.getSent(user.sector, hidden, { page: 1, pageSize: 50 });
            setSent(s.items);
          } else {
            setSent([]);
          }
        })();
      }
    };
    window.addEventListener("storage", onStorage);

    const onVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      if (!user || !user.sector) return;
      try {
        const st = await api.getStats(user.sector, { source: can("view_received") ? "received" : "sent" });
        setStats(st);
      } catch {}
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user.sector, can]);

  const pendingCount = stats.pending;
  const approvedCount = stats.approved;
  const rejectedCount = stats.rejected;

  return (
    <>
      <Header title="Dashboard" user={user} />
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-title">Olá, {user.name || user.sector}</div>
          <div className="hero-subtitle">Aqui está um resumo do seu dia</div>
          <div className="hero-actions">
            {can("send") && <NavLink className="btn primary" to="/enviar">Enviar Documento</NavLink>}
            {can("view_received") && <NavLink className="btn" to="/recebidos">Ver Recebidos</NavLink>}
            {can("view_sent") && <NavLink className="btn" to="/enviados">Ver Enviados</NavLink>}
          </div>
        </div>
      </div>
      <div className="grid">
        <SummaryCard color="orange" title="Pendentes" value={pendingCount} buttonText={can("view_received") ? "Ver recebidos" : undefined} buttonTo="/recebidos" />
        <SummaryCard color="green" title="Aprovados" value={approvedCount} />
        <SummaryCard color="red" title="Reprovados" value={rejectedCount} />
        {can("view_received") && (
          <div className="card col-12">
            <div className="card-header">
              <div className="card-title">Recebidos Recentes</div>
              <NavLink className="btn small" to="/recebidos">Ver todos</NavLink>
            </div>
            <div className="doc-grid">
              {[...received].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).map(d => {
                const isPending = normalizeStatus(d.status) === statuses.PENDENTE;
                const canEvaluateDoc = (() => {
                  if (!isPending) return false;
                  if (user.sector === "RH") return false;
                  if (user.sector === "Peças") {
                    return d.targetSector === "Peças" && d.senderSector !== "Peças";
                  }
                  return d.targetSector === user.sector;
                })();
                const label = isPending && canEvaluateDoc ? "Avaliar" : "Detalhes";
                const to = isPending && canEvaluateDoc ? `/avaliar/${d.id}` : `/documento/${d.id}`;
                return (
                  <DocumentCard
                    key={d.id}
                    title={d.title}
                    status={d.status}
                    meta1={`De: ${d.senderSector}`}
                    meta2={new Date(d.date).toLocaleString()}
                    actionLabel={label}
                    actionTo={to}
                    className="col-6"
                  />
                );
              })}
              {received.length === 0 && <div style={{ color: "var(--color-muted)" }}>Sem documentos</div>}
            </div>
          </div>
        )}
        {can("view_sent") && (
          <div className="card col-12">
            <div className="card-header">
              <div className="card-title">Enviados Recentes</div>
              <NavLink className="btn small" to="/enviados">Ver todos</NavLink>
            </div>
            <div className="doc-grid">
              {[...sent].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).map(d => (
                <DocumentCard
                  key={d.id}
                  title={d.title}
                  status={d.status}
                  meta1={`Para: ${d.targetSector}`}
                  meta2={new Date(d.date).toLocaleString()}
                  actionLabel={"Detalhes"}
                  actionTo={`/documento/${d.id}`}
                  className="col-6"
               />
              ))}
              {sent.length === 0 && <div style={{ color: "var(--color-muted)" }}>Sem documentos</div>}
            </div>
          </div>
        )}
        {/* Filtro removido conforme regra: aplicar apenas em Recebidos e Enviados */}
        <div className="card col-12">
          <div className="card-header">
            <div className="card-title">Notificações</div>
            <span className="chip">{notifications.length} novas</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Documento #{n.documentId.slice(-6).toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: "var(--color-muted)" }}>Status: {n.newStatus} • {new Date(n.date).toLocaleString()}</div>
                </div>
                  <div className={`status ${statusClass(n.newStatus)}`}>
                  {normalizeStatus(n.newStatus)}
                </div>
              </div>
            ))}
            {notifications.length === 0 && <div style={{ color: "var(--color-muted)" }}>Sem notificações</div>}
          </div>
        </div>
      </div>
    </>
  );
}
