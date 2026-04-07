import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, normalizeStatus } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import Header from "../components/Header.jsx";
import SummaryCard from "../components/SummaryCard.jsx";
import DocumentCard from "../components/DocumentCard.jsx";
import NotificationItem from "../components/NotificationItem.jsx";

export default function Dashboard() {
  const { user, can } = useAuth();
  const [received, setReceived] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [sent, setSent] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    emAtendimento: 0,
    finalizado: 0,
    rejeitado: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.sector) return;
      const scope = can("view_received") ? "all" : "mine";
      const st = await api.getStats({ userId: user.uid, sector: user.sector }, { scope });
      setStats(st);

      if (can("view_received")) {
        const r = await api.getReceived(user.sector, { page: 1, pageSize: 50 });
        setReceived(r.items);
      } else {
        setReceived([]);
      }

      const n = await api.getNotifications(user.sector);
      setNotifications(n);

      if (can("view_sent")) {
        const s = await api.getSent(user.uid, user.sector, { page: 1, pageSize: 50 });
        setSent(s.items);
      } else {
        setSent([]);
      }
    };

    fetchData();

    const unsubscribe = api.subscribe(
      [api.CHANNELS.PROPOSTAS, api.CHANNELS.NOTIFICACOES],
      () => {
        fetchData();
      }
    );

    const onVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      fetchData();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user?.sector, user?.uid]);

  const pendingCount = stats.pending;
  const emAtendimentoCount = stats.emAtendimento;
  const finalizadoCount = stats.finalizado;
  const rejeitadoCount = stats.rejeitado;

  return (
    <>
      <Header title="Dashboard" user={user} />
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-title">Olá, {user.name || user.sector}</div>
          <div className="hero-subtitle">Visão geral dos pedidos de compra</div>
          <div className="hero-actions">
            {can("send") && <NavLink className="btn primary" to="/enviar">Novo pedido</NavLink>}
            {can("view_received") && <NavLink className="btn" to="/recebidos">Pedidos para atender</NavLink>}
            {can("view_sent") && <NavLink className="btn" to="/enviados">Meus pedidos</NavLink>}
          </div>
        </div>
      </div>
      <div className="grid">
        <SummaryCard color="orange" title="Pendentes" value={pendingCount} buttonText={can("view_received") ? "Ver fila" : undefined} buttonTo="/recebidos" />
        <SummaryCard color="blue" title="Em atendimento" value={emAtendimentoCount} buttonText={can("view_received") ? "Ver fila" : undefined} buttonTo="/recebidos" />
        <SummaryCard color="green" title="Finalizados" value={finalizadoCount} />
        <SummaryCard color="red" title="Rejeitados" value={rejeitadoCount} />
        {can("view_received") && (
          <div className="card col-12">
            <div className="card-header">
              <div className="card-title">Fila — pedidos recentes</div>
              <NavLink className="btn small" to="/recebidos">Ver todos</NavLink>
            </div>
            <div className="doc-grid">
              {[...received].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).map(d => {
                const st = normalizeStatus(d.status);
                const isPecas = user.sector === "Peças";
                const isTarget = d.targetSector === user.sector;
                const canAtender = (isPecas && (st === statuses.PENDENTE || st === statuses.APROVADO_SETOR || st === statuses.EM_ATENDIMENTO))
                                 || (isTarget && st === statuses.ENCAMINHADO);
                const label = canAtender ? "Atender" : "Detalhes";
                const to = canAtender ? `/avaliar/${d.id}` : `/documento/${d.id}`;
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
              {received.length === 0 && <div style={{ color: "var(--color-muted)" }}>Nenhum pedido na fila</div>}
            </div>
          </div>
        )}
        {can("view_sent") && (
          <div className="card col-12">
            <div className="card-header">
              <div className="card-title">Meus pedidos recentes</div>
              <NavLink className="btn small" to="/enviados">Ver todos</NavLink>
            </div>
            <div className="doc-grid">
              {[...sent].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).map(d => (
                <DocumentCard
                  key={d.id}
                  title={d.title}
                  status={d.status}
                  meta1={`Para: ${d.targetSector || "Peças"}`}
                  meta2={new Date(d.date).toLocaleString()}
                  actionLabel={"Detalhes"}
                  actionTo={`/documento/${d.id}`}
                  className="col-6"
               />
              ))}
              {sent.length === 0 && <div style={{ color: "var(--color-muted)" }}>Nenhum pedido no momento</div>}
            </div>
          </div>
        )}
        <div className="card col-12">
          <div className="card-header">
            <div className="card-title">Notificações</div>
            <div className="actions">
              <span className="chip">{notifications.length} novas</span>
              <NavLink className="btn small" to="/notificacoes">Ver todas</NavLink>
            </div>
          </div>
          <div className="notif-list">
            {[...notifications].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(n => (
              <NotificationItem
                key={n.id}
                title={n.documentTitle || n.documentId.slice(-6).toUpperCase()}
                status={n.newStatus}
                reviewerSector={n.reviewerSector}
                date={n.date}
                isNew={Date.now() - new Date(n.date).getTime() < 24*60*60*1000}
              />
            ))}
            {notifications.length === 0 && <div style={{ color: "var(--color-muted)" }}>Sem notificações no momento</div>}
          </div>
        </div>
      </div>
    </>
  );
}
