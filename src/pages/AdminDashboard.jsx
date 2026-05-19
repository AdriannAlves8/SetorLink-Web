import React, { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import SummaryCard from "../components/SummaryCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { UsersIcon, ActivityIcon, LayersIcon, ShieldIcon } from "../components/Icons.jsx";
import { NavLink } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    activeUsers: 0,
    sectorsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.getAdminStats(),
          api.getRecentAuditLogs(),
        ]);
        setStats(statsRes);
        setRecentLogs(logsRes);
      } catch (err) {
        console.error("Erro ao carregar dados administrativos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Inscrição Realtime para Logs e Estatísticas
    const channels = [api.CHANNELS.PROPOSTAS, api.CHANNELS.USUARIOS];
    if (api.CHANNELS.LOGS) channels.push(api.CHANNELS.LOGS);

    const unsubscribe = api.subscribe(channels, (payload) => {
      // Se mudar algo em propostas ou usuários, atualiza estatísticas
      if (payload.events.some(e => e.includes(".documents."))) {
        fetchData(); 
      }
    });

    return () => unsubscribe();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm("Tem certeza que deseja limpar todo o histórico de logs? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      setLoading(true);
      await api.adminClearAuditLogs();
      const logsRes = await api.getRecentAuditLogs();
      setRecentLogs(logsRes);
    } catch (err) {
      alert("Erro ao limpar logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Painel Administrativo" user={user} />

      <div className="page-shell">
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-title">Gestão SetorLink 🛠️</div>
          <div className="hero-subtitle">
            Gerencie usuários, permissões e monitore as atividades do sistema.
          </div>
          
          <div className="hero-quick-actions">
            <NavLink to="/admin/usuarios" className="quick-action-item">
              <div className="quick-action-icon">
                <UsersIcon />
              </div>
              Gerenciar Usuários
            </NavLink>
            <NavLink to="/admin/permissoes" className="quick-action-item">
              <div className="quick-action-icon">
                <ShieldIcon />
              </div>
              Perfis de acesso
            </NavLink>
          </div>
        </div>
      </div>

      {/* Resumo do Sistema (Padrão de layout) */}
      <div className="daily-summary-footer" style={{ marginTop: 0, marginBottom: '2rem' }}>
        <div className="daily-summary-header">
          <div className="card-title">Resumo do Sistema</div>
          <div className="chip">{new Date().toLocaleDateString()}</div>
        </div>
        <div className="daily-summary-grid">
          <SummaryCard 
            color="orange" 
            title="Setores" 
            value={stats.sectorsCount} 
            subtitle="Setores operacionais"
            buttonText="Configurar"
            buttonTo="/admin/setores"
          />
          <SummaryCard 
            color="blue" 
            title="Usuários" 
            value={stats.totalUsers} 
            subtitle="Total de contas"
            buttonText="Ver todos"
            buttonTo="/admin/usuarios"
          />
          <SummaryCard 
            color="green" 
            title="Ativos" 
            value={stats.activeUsers} 
            subtitle="Usuários online/ativos"
          />
          <SummaryCard 
            color="red" 
            title="Total Pedidos" 
            value={stats.totalOrders} 
            subtitle="Volume total no banco"
          />
        </div>
      </div>

      <div className="dashboard-main-grid" style={{ gridTemplateColumns: "1fr", gap: "2rem" }}>
        <div className="card">
          <div className="daily-summary-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ActivityIcon size={18} />
              Logs de Auditoria Recentes
            </div>
            <NavLink className="btn small" to="/admin/logs" style={{ fontSize: '0.85rem' }}>Ver logs completos</NavLink>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Detalhes</th>
                  <th>Responsável</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 && !loading ? (
                  <tr><td colSpan={4} className="empty">Nenhuma atividade registrada ainda.</td></tr>
                ) : recentLogs.map(log => (
                  <tr key={log.id}>
                    <td><span className="chip primary">{log.actionLabel || log.action}</span></td>
                    <td>{log.details}</td>
                    <td>{log.user}</td>
                    <td style={{ color: 'var(--muted)' }}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
