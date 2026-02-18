import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses } from "../utils/constants.js";
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
      const r = await api.getReceived(user.sector);
      setReceived(r);
      const n = await api.getNotifications(user.sector);
      setNotifications(n);
      if (can("view_sent")) {
        const hidden = acl[user.sector]?.hidden_sent_from || [];
        const s = await api.getSent(user.sector, hidden);
        setSent(s);
      } else {
        setSent([]);
      }
      const st = await api.getStats(user.sector);
      setStats(st);
    })();
    const onStorage = (e) => {
      if (e.key === "setorlink.documents" || e.key === "setorlink.notifications") {
        (async () => {
          const r = await api.getReceived(user.sector);
          setReceived(r);
          const st = await api.getStats(user.sector);
          setStats(st);
          const n = await api.getNotifications(user.sector);
          setNotifications(n);
          if (can("view_sent")) {
            const hidden = acl[user.sector]?.hidden_sent_from || [];
            const s = await api.getSent(user.sector, hidden);
            setSent(s);
          } else {
            setSent([]);
          }
        })();
      }
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible") {
        const st = await api.getStats(user.sector);
        setStats(st);
      }
    });
    return () => window.removeEventListener("storage", onStorage);
  }, [user.sector, can]);

  const pendingCount = stats.pending;
  const approvedCount = stats.approved;
  const rejectedCount = stats.rejected;

  return (
    <>
      <Header title="Dashboard" user={user} />
      <div className="grid">
        <SummaryCard color="orange" title="Pendentes" value={pendingCount} buttonText={can("view_received") ? "Ver recebidos" : undefined} buttonTo="/recebidos" />
        <SummaryCard color="green" title="Aprovados" value={approvedCount} />
        <SummaryCard color="red" title="Reprovados" value={rejectedCount} />
        {can("view_received") && (
          <div className="card col-12">
            <div className="card-header">
              <div className="card-title">Recebidos Recentes</div>
            </div>
            <div className="doc-grid">
              {[...received].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).map(d => (
                <DocumentCard
                  key={d.id}
                  title={d.title}
                  status={d.status}
                  meta1={`De: ${d.senderSector}`}
                  meta2={new Date(d.date).toLocaleString()}
                  actionLabel={d.status === statuses.PENDENTE && can("evaluate") ? "Avaliar" : "Detalhes"}
                  actionTo={d.status === statuses.PENDENTE && can("evaluate") ? `/avaliar/${d.id}` : `/documento/${d.id}`}
                />
              ))}
              {received.length === 0 && <div style={{ color: "var(--color-muted)" }}>Sem documentos</div>}
            </div>
          </div>
        )}
        {can("view_sent") && (
          <div className="card col-12">
            <div className="card-header">
              <div className="card-title">Enviados Recentes</div>
            </div>
            <div className="doc-grid">
              {[...sent].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).map(d => (
                <DocumentCard
                  key={d.id}
                  title={d.title}
                  status={d.status}
                  meta1={`Para: ${d.targetSector}`}
                  meta2={new Date(d.date).toLocaleString()}
                  actionLabel="Detalhes"
                  actionTo={`/documento/${d.id}`}
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
                <div className={`status ${n.newStatus === statuses.APROVADO ? "aprovado" : n.newStatus === statuses.REPROVADO ? "reprovado" : "pendente"}`}>
                  {n.newStatus}
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
