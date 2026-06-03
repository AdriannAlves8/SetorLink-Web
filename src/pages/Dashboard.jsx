import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { statuses, normalizeStatus, statusLabel, statusClass, isPecasSector } from "../utils/constants.js";
import { NavLink } from "react-router-dom";
import { PERMISSIONS } from "../utils/acl.js";
import Header from "../components/Header.jsx";

// Otimização: Componentes menores para evitar re-render da página toda
const StatItem = React.memo(({ icon, count, label, background, color }) => (
  <div className="summary-item-small">
    <div className="icon" style={{ background, color }}>
      {icon}
    </div>
    <div className="stack">
      <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{count}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{label}</span>
    </div>
  </div>
));

const TableSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <tr key={i}>
        <td data-label="Documento"><div className="skeleton" style={{ height: 24, width: '80%' }} /></td>
        <td data-label="Remetente"><div className="skeleton" style={{ height: 20, width: 60 }} /></td>
        <td data-label="Destino"><div className="skeleton" style={{ height: 20, width: 60 }} /></td>
        <td data-label="Status"><div className="skeleton" style={{ height: 24, width: 80, borderRadius: 12 }} /></td>
        <td data-label="Ações"><div className="skeleton" style={{ height: 32, width: '100%' }} /></td>
      </tr>
    ))}
  </>
);

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    emAtendimento: 0,
    finalizado: 0,
    rejeitado: 0,
    pendingOrders: 0,
    pendingNotas: 0
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (!user) return;
    if (user.role_id === "suporte") return;

    if (isInitial) setLoading(true);
    
    try {
      const [statsRes, receivedRes, notasRes, recentRes] = await Promise.all([
        api.getStats(
          { userId: user.uid, sector: user.sector },
          { scope: hasPermission(PERMISSIONS.VIEW_RECEIVED) && isPecasSector(user.sector) ? "all" : "mine" }
        ),
        hasPermission(PERMISSIONS.ATTEND_ORDER)
          ? api.getReceived(user.sector, { page: 1, pageSize: 10, allStatuses: true })
          : Promise.resolve({ items: [] }),
        hasPermission(PERMISSIONS.VIEW_NOTA_RECEIVED) ? api.getNotasFiscais(user.sector, "received") : Promise.resolve({ items: [] }),
        api.getDashboardRecentItems()
      ]);

      const isPecas = user.sector === "Peças";
      const pendingOrdersCount = receivedRes.items.filter(d => {
        const st = normalizeStatus(d.status);
        const isTarget = d.targetSector === user.sector;
        const canPecasEvaluate = isPecas && (st === statuses.PENDENTE || st === statuses.APROVADO || st === statuses.RECUSADO);
        const canSectorEvaluate = isTarget && st === statuses.ENCAMINHADO;
        return canPecasEvaluate || canSectorEvaluate;
      }).length;

      const pendingNotasCount = notasRes.items.filter(n => normalizeStatus(n.status) === statuses.PENDENTE).length;

      setStats({
        ...statsRes,
        pendingOrders: pendingOrdersCount,
        pendingNotas: pendingNotasCount
      });

      setRecentItems(recentRes);
    } catch (err) {
      console.error("Dashboard fetchData error:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user?.sector, user?.uid, hasPermission]);

  useEffect(() => {
    fetchData(true);
    
    // Otimização: Debounce no realtime para evitar excesso de requisições em picos de atividade
    let timeout;
    const handleUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fetchData(false), 2000);
    };

    const unsubscribe = api.subscribe([api.CHANNELS.PROPOSTAS], handleUpdate);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [fetchData]);

  const firstName = useMemo(() => user?.name?.split(" ")[0] || user?.sector, [user?.name, user?.sector]);

  if (user?.role_id === "suporte") {
    return (
      <>
        <Header title="Painel Administrativo" user={user} />
        <div className="page-shell">
          <div className="alert info" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Bem-vindo ao SetorLink</h2>
            <p>Seu perfil de <strong>Suporte</strong> utiliza o Painel Administrativo para gerenciar o sistema.</p>
            <NavLink to="/admin" className="btn primary" style={{ marginTop: '1rem' }}>Acessar Painel Admin</NavLink>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Dashboard" user={user} />

      <div className="page-shell">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-title">
            Olá, {firstName}! 👋
          </div>
          <div className="hero-subtitle">
            Aqui está o resumo geral dos pedidos e notas fiscais.
          </div>
          
          <div className="hero-quick-actions">
            {hasPermission(PERMISSIONS.ATTEND_ORDER) && (
            <NavLink to="/recebidos" className="quick-action-item">
              <div className="quick-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              Pedidos para atender
              {stats.pendingOrders > 0 && <span className="nav-badge-dot" style={{ position: 'static', marginLeft: 8 }} />}
            </NavLink>
            )} 
            <NavLink to="/receber-notas" className="quick-action-item">
              <div className="quick-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
              </div>
              Notas Recebidas
              {stats.pendingNotas > 0 && <span className="nav-badge-dot" style={{ position: 'static', marginLeft: 8 }} />}
            </NavLink>
          </div>
        </div>

        {(hasPermission(PERMISSIONS.CREATE_ORDER) || hasPermission(PERMISSIONS.CREATE_NOTA)) && (
          <NavLink to={hasPermission(PERMISSIONS.CREATE_ORDER) ? "/enviar" : "/enviar-nota"} className="hero-primary-card">
            <div className="icon-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            </div>
            <div className="text-box">
              <span className="title">{hasPermission(PERMISSIONS.CREATE_ORDER) ? "Criar novo pedido" : "Emitir Nota Fiscal"}</span>
              <span className="subtitle">{hasPermission(PERMISSIONS.CREATE_ORDER) ? "Abra um novo pedido para o setor Peças" : "Envie uma nova nota fiscal"}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </NavLink>
        )}
      </div>

      {/* Resumo do dia */}
      <div className="daily-summary-footer" style={{ marginTop: 0, marginBottom: '2rem' }}>
        <div className="daily-summary-header">
          <div className="card-title">Resumo do dia</div>
          <div className="chip">{new Date().toLocaleDateString()}</div>
        </div>
        <div className="daily-summary-grid">
          <StatItem 
            label="Pedido pendente" 
            count={stats.pending} 
            background="#FFF7ED" 
            color="#EA580C"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
          />
          <StatItem 
            label="Em atendimento" 
            count={stats.emAtendimento} 
            background="#EFF6FF" 
            color="#2563EB"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
          />
          <StatItem 
            label="Finalizados" 
            count={stats.finalizado} 
            background="#F0FDF4" 
            color="#16A34A"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          />
          <StatItem 
            label="Rejeitados" 
            count={stats.rejeitado} 
            background="#FEF2F2" 
            color="#DC2626"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>}
          />
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-section">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Atividades Recentes</div>
              <NavLink className="btn small" to="/enviados">Ver histórico</NavLink>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Remetente</th>
                    <th>Destino</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : recentItems.length > 0 ? (
                    recentItems.map(d => {
                      const st = normalizeStatus(d.status);
                      const isPecas = isPecasSector(user.sector);
                      const isTarget = d.targetSector === user.sector || (!d.targetSector && isPecas);
                      const isNota = d.title.startsWith("[NOTA FISCAL]");
                      
                      const canEvaluate = isNota 
                        ? (isTarget && st === statuses.PENDENTE)
                        : ((isPecas && (st === statuses.PENDENTE || st === statuses.APROVADO || st === statuses.RECUSADO)) || (isTarget && st === statuses.ENCAMINHADO));

                      return (
                        <tr key={d.id}>
                          <td data-label="Documento">
                            <div className="stack">
                              <span style={{ fontWeight: 600 }}>{d.title.replace("[NOTA FISCAL] ", "")}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>#{d.id.slice(-4).toUpperCase()}</span>
                            </div>
                          </td>
                          <td data-label="Remetente">{d.senderSector}</td>
                          <td data-label="Destino">{d.targetSector || "Peças"}</td>
                          <td data-label="Status"><span className={`status ${statusClass(d.status)}`}>{statusLabel(d.status)}</span></td>
                          <td data-label="Ações">
                            <NavLink 
                              to={canEvaluate ? (isNota ? `/avaliar-nota/${d.id}` : `/avaliar/${d.id}`) : `/documento/${d.id}`} 
                              className={`btn small ${canEvaluate ? "primary" : ""}`}
                              style={{ width: '100%' }}
                            >
                              {canEvaluate ? "Atender" : "Detalhes"}
                            </NavLink>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty">Nenhuma atividade recente</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
