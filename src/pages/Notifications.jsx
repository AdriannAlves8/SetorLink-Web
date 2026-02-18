import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses } from "../utils/constants.js";
import NotificationCard from "../components/NotificationCard.jsx";

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const ns = await api.getNotifications(user.sector);
    setItems(ns);
  }
  useEffect(() => { load(); }, [user.sector]);

  const remove = async (id) => {
    setLoading(true);
    await api.deleteNotification(id);
    await load();
    setLoading(false);
  };
  const clear = async () => {
    setLoading(true);
    await api.clearNotifications(user.sector);
    await load();
    setLoading(false);
  };

  return (
    <>
      <div className="content-header">
        <div className="page-title">Notificações</div>
        <div className="badge">{items.length}</div>
      </div>
      <div className="card col-12">
        {items.length === 0 && <div className="empty">Sem notificações</div>}
        <div className="notif-actions">
          <button className="btn danger" disabled={loading || items.length === 0} onClick={clear}>Limpar tudo</button>
        </div>
        <div className="notif-grid">
          {items.map(n => (
            <NotificationCard
              key={n.id}
              title={n.newStatus === statuses.APROVADO ? `Aprovado pelo setor ${n.reviewerSector}` : `Reprovado pelo setor ${n.reviewerSector}`}
              documentTitle={n.documentTitle}
              date={n.date}
              status={n.newStatus}
              reason={n.reason}
              onDelete={() => remove(n.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
