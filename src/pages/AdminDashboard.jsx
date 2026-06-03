import React, { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { UsersIcon, ActivityIcon, LayersIcon, ShieldIcon, SendIcon } from "../components/Icons.jsx";
import { NavLink } from "react-router-dom";
import { ROLE_INFO, ROLES } from "../utils/acl.js";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.getAdminStats(),
          api.getRecentAuditLogs(12)
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

    const channels = [
      api.CHANNELS.PROPOSTAS,
      api.CHANNELS.NOTIFICACOES,
      api.CHANNELS.LOGS,
      api.CHANNELS.USUARIOS,
      api.CHANNELS.SETORES
    ];

    const unsubscribe = api.subscribe(channels, fetchData);
    return () => unsubscribe();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Suporte";

  const adminModules = [
    {
      title: "Usuários",
      desc: "Contas, perfis e bloqueios",
      icon: <UsersIcon size={24} />,
      to: "/admin/usuarios",
      color: "#2563eb",
      bg: "rgba(37, 99, 235, 0.1)",
      stat: stats ? `${stats.accountsActive} ativos` : "—"
    },
    {
      title: "Permissões",
      desc: "Regras por perfil de acesso",
      icon: <ShieldIcon size={24} />,
      to: "/admin/permissoes",
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.1)",
      stat: "3 perfis"
    },
    {
      title: "Setores",
      desc: "Estrutura e e-mails de alerta",
      icon: <LayersIcon size={24} />,
      to: "/admin/setores",
      color: "#ea580c",
      bg: "rgba(234, 88, 12, 0.1)",
      stat: stats ? `${stats.sectorsActive} ativos` : "—"
    },
    {
      title: "Logs de auditoria",
      desc: "Rastreio de ações no sistema",
      icon: <ActivityIcon size={24} />,
      to: "/admin/logs",
      color: "#64748b",
      bg: "rgba(100, 116, 139, 0.12)",
      stat: stats ? `${recentLogs.length} recentes` : "—"
    }
  ];

  const kpis = stats
    ? [
        { label: "Usuários cadastrados", value: stats.totalUsers, hint: `${stats.accountsBlocked} bloqueado(s)` },
        { label: "Acessos recentes", value: stats.activeUsers, hint: "últimos 15 min" },
        { label: "Pedidos no sistema", value: stats.totalOrders, hint: `${stats.pendingOrders} pendente(s)` },
        { label: "Setores operacionais", value: stats.sectorsActive, hint: `de ${stats.sectorsCount} cadastrados` }
      ]
    : [];

  const roleRows = stats
    ? [
        { key: ROLES.SUPORTE, count: stats.usersByRole?.suporte ?? 0 },
        { key: ROLES.GESTOR, count: stats.usersByRole?.gestor ?? 0 },
        { key: ROLES.OPERADOR, count: stats.usersByRole?.operador ?? 0 }
      ]
    : [];

  return (
    <>
      <Header title="Painel Administrativo" user={user} />

      <div className="page-shell admin-dashboard">
        <section className="admin-hero card">
          <div className="admin-hero__content">
            <p className="admin-hero__eyebrow">Centro de controle · Suporte</p>
            <h1 className="admin-hero__title">Olá, {firstName}</h1>
            <p className="admin-hero__subtitle">
              Visão consolidada de usuários, setores, pedidos e auditoria. Use os atalhos abaixo para
              administrar o SetorLink com segurança.
            </p>
            <div className="admin-hero__actions">
              <NavLink to="/admin/usuarios" className="btn primary">
                <UsersIcon size={18} />
                Novo usuário
              </NavLink>
              <NavLink to="/admin/logs" className="btn">
                <ActivityIcon size={18} />
                Ver auditoria
              </NavLink>
            </div>
          </div>
          <div className="admin-hero__meta">
            <span className="admin-hero__date">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long"
              })}
            </span>
            {loading ? (
              <span className="chip">Atualizando dados…</span>
            ) : (
              <span className="chip success">Sistema operacional</span>
            )}
          </div>
        </section>

        <div className="admin-kpi-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="admin-kpi card">
                  <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 32, width: "40%" }} />
                </div>
              ))
            : kpis.map((k) => (
                <div key={k.label} className="admin-kpi card">
                  <span className="admin-kpi__label">{k.label}</span>
                  <span className="admin-kpi__value">{k.value}</span>
                  <span className="admin-kpi__hint">{k.hint}</span>
                </div>
              ))}
        </div>

        <section>
          <div className="admin-section-head">
            <h2 className="admin-section-head__title">Módulos de administração</h2>
            <p className="admin-section-head__desc">Acesso rápido às áreas críticas do sistema</p>
          </div>
          <div className="admin-modules-grid">
            {adminModules.map((module) => (
              <NavLink key={module.to} to={module.to} className="admin-module-card card">
                <div
                  className="admin-module-card__icon"
                  style={{ background: module.bg, color: module.color }}
                >
                  {module.icon}
                </div>
                <div className="admin-module-card__body">
                  <h3 className="admin-module-card__title">{module.title}</h3>
                  <p className="admin-module-card__desc">{module.desc}</p>
                  <span className="admin-module-card__stat">{module.stat}</span>
                </div>
                <span className="admin-module-card__link">
                  Acessar
                  <SendIcon size={14} />
                </span>
              </NavLink>
            ))}
          </div>
        </section>

        <div className="admin-panels-grid">
          <div className="card admin-panel">
            <div className="admin-panel__header">
              <div className="admin-panel__title">
                <ActivityIcon size={18} />
                Atividade recente
              </div>
              <NavLink className="btn small" to="/admin/logs">
                Histórico completo
              </NavLink>
            </div>
            <div className="data-table-wrap">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Ação</th>
                    <th>Setor</th>
                    <th>Responsável</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="empty">
                        Carregando…
                      </td>
                    </tr>
                  ) : recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty">
                        Nenhuma atividade registrada ainda.
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td data-label="Ação">
                          <span className="chip primary" style={{ fontSize: "0.7rem" }}>
                            {log.actionLabel || log.action}
                          </span>
                        </td>
                        <td data-label="Setor">{log.sector || "—"}</td>
                        <td data-label="Responsável" style={{ fontWeight: 600 }}>{log.user}</td>
                        <td data-label="Quando" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{log.time}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card admin-panel admin-panel--side">
            <div className="admin-panel__header">
              <div className="admin-panel__title">
                <UsersIcon size={18} />
                Usuários por perfil
              </div>
            </div>
            <ul className="admin-role-list">
              {loading ? (
                <li className="empty">Carregando…</li>
              ) : (
                roleRows.map(({ key, count }) => (
                  <li key={key} className="admin-role-list__item">
                    <div>
                      <strong>{ROLE_INFO[key]?.nome || key}</strong>
                      <span className="admin-role-list__desc">{ROLE_INFO[key]?.descricao}</span>
                    </div>
                    <span className="admin-role-list__count">{count}</span>
                  </li>
                ))
              )}
            </ul>

            {stats && stats.usersByRole?.outros > 0 && (
              <p className="admin-role-list__warn">
                {stats.usersByRole.outros} usuário(s) sem perfil padrão — revise em Usuários.
              </p>
            )}

            <div className="admin-side-actions">
              <NavLink to="/admin/setores" className="btn small">
                Gerenciar setores
              </NavLink>
              <NavLink to="/admin/permissoes" className="btn small primary">
                Ajustar permissões
              </NavLink>
            </div>

            {stats && stats.pendingOrders > 0 && (
              <div className="admin-alert">
                <strong>{stats.pendingOrders}</strong> pedido(s) aguardando triagem na central.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
