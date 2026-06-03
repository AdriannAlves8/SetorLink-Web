import React, { useState, useEffect, Suspense, lazy, useCallback } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";

import Sidebar from "../components/Sidebar.jsx";
import { LogoutIcon } from "../components/Icons.jsx";
import ToastManager from "../components/Toast.jsx";
import Alert from "../components/Alert.jsx";
import { PERMISSIONS, ROLES } from "../utils/acl.js";
import { statuses, normalizeStatus } from "../utils/constants.js";

// Lazy Loading das Páginas para melhor performance
const Login = lazy(() => import("../pages/Login.jsx"));
const Dashboard = lazy(() => import("../pages/Dashboard.jsx"));
const Received = lazy(() => import("../pages/Received.jsx"));
const Sent = lazy(() => import("../pages/Sent.jsx"));
const Evaluate = lazy(() => import("../pages/Evaluate.jsx"));
const Notifications = lazy(() => import("../pages/Notifications.jsx"));
const Profile = lazy(() => import("../pages/Profile.jsx"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard.jsx"));
const AdminUsers = lazy(() => import("../pages/UserManager.jsx"));
const AdminSectors = lazy(() => import("../pages/SectorManager.jsx"));
const AdminLogs = lazy(() => import("../pages/AuditLogs.jsx"));
const PermissionManager = lazy(() => import("../pages/PermissionManager.jsx"));
const DocumentDetail = lazy(() => import("../pages/DocumentDetail.jsx"));
const AcceptInvite = lazy(() => import("../pages/AcceptInvite.jsx"));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail.jsx"));
const Recover = lazy(() => import("../pages/Recover.jsx"));
const NewNotaFiscal = lazy(() => import("../pages/NewNotaFiscal.jsx"));
const ReceivedNotas = lazy(() => import("../pages/ReceivedNotas.jsx"));
const EvaluateNota = lazy(() => import("../pages/EvaluateNota.jsx"));

// Componente de Loading para o Suspense
const PageLoader = () => (
  <div className="empty" style={{ height: '80vh', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
    <div className="loading-spinner" />
    <p style={{ color: 'var(--muted)', fontWeight: 500 }}>Carregando módulo...</p>
  </div>
);

function Protected({ children, permission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />;

  return children;
}

function Layout({ children }) {
  const { user, logout, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [counts, setCounts] = useState({ received: 0, notas: 0, notifications: 0 });

  const fetchData = useCallback(async () => {
    if (!user?.sector && !isAdmin) return;
    try {
      if (isAdmin) {
        setCounts({ received: 0, notas: 0, notifications: 0 });
        return;
      }

      const [receivedRes, notasRes, notifsRes] = await Promise.all([
        hasPermission(PERMISSIONS.ATTEND_ORDER) ? api.getReceived(user.sector, { page: 1, pageSize: 20, allStatuses: true }) : Promise.resolve({ items: [], total: 0 }),
        hasPermission(PERMISSIONS.VIEW_NOTA_RECEIVED) ? api.getNotasFiscais(user.sector, "received") : Promise.resolve({ items: [] }),
        hasPermission(PERMISSIONS.NOTIFICATIONS) ? api.getNotifications(user.sector) : Promise.resolve([])
      ]);

      const isPecas = user.sector === "Peças";
      
      const pendingOrders = receivedRes.items.filter(d => {
        const st = normalizeStatus(d.status);
        const isTarget = d.targetSector === user.sector;
        const canPecasEvaluate = isPecas && (st === statuses.PENDENTE || st === statuses.APROVADO || st === statuses.RECUSADO);
        const canSectorEvaluate = isTarget && st === statuses.ENCAMINHADO;
        return canPecasEvaluate || canSectorEvaluate;
      }).length;

      const pendingNotas = notasRes.items.filter(n => normalizeStatus(n.status) === statuses.PENDENTE).length;
      
      setCounts({
        received: pendingOrders,
        notas: pendingNotas,
        notifications: notifsRes.filter(n => !n.read).length || notifsRes.length
      });
    } catch (err) {
      console.error("Erro ao carregar contadores:", err);
    }
  }, [user?.sector, isAdmin, hasPermission]);

  useEffect(() => {
    fetchData();
    
    let timeout;
    const handleUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fetchData(), 5000); // Debounce maior para o layout (5s)
    };

    const unsub = api.subscribe([api.CHANNELS.PROPOSTAS, api.CHANNELS.NOTIFICACOES], handleUpdate);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [fetchData]);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  // Fecha a sidebar ao mudar de rota no mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setConfirmLogout(false);
        setSidebarOpen(false);
      }
    };
    if (confirmLogout || sidebarOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout, sidebarOpen]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false); // Reset mobile sidebar on desktop
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className={`app ${isMobile ? "mobile-view" : "desktop-view"} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      
      <div className={`sidebar-wrapper ${isMobile && sidebarOpen ? "open" : ""}`}>
        <Sidebar
          items={[
            ...(hasPermission(PERMISSIONS.ADMIN_DASHBOARD)
              ? [{ label: "Admin Dashboard", to: "/admin", icon: "home", end: true }]
              : []),
            ...(hasPermission(PERMISSIONS.MANAGE_USERS)
              ? [{ label: "Gerenciar Usuários", to: "/admin/usuarios", icon: "users" }]
              : []),
            ...(hasPermission(PERMISSIONS.MANAGE_PERMISSIONS)
              ? [{ label: "Perfis de acesso", to: "/admin/permissoes", icon: "shield" }]
              : []),
            ...(hasPermission(PERMISSIONS.MANAGE_SECTORS)
              ? [{ label: "Setores", to: "/admin/setores", icon: "layers" }]
              : []),
            ...(hasPermission(PERMISSIONS.VIEW_LOGS)
              ? [{ label: "Logs/Auditoria", to: "/admin/logs", icon: "activity" }]
              : []),
            { label: "Dashboard", to: "/", end: true, icon: "home", hide: hasPermission(PERMISSIONS.ADMIN_DASHBOARD) },
            ...(hasPermission(PERMISSIONS.CREATE_ORDER)
              ? [{ label: "Novo pedido", to: "/enviar", icon: "compose" }]
              : []),
            ...(hasPermission(PERMISSIONS.CREATE_NOTA)
              ? [{ label: "Enviar Nota Fiscal", to: "/enviar-nota", icon: "file-text" }]
              : []),
            ...(hasPermission(PERMISSIONS.ATTEND_ORDER)
              ? [{ 
                  label: "Pedidos para Atender", 
                  to: "/recebidos", 
                  icon: "received", 
                  badge: counts.received > 0
                }]
              : []),
            ...(hasPermission(PERMISSIONS.VIEW_NOTA_RECEIVED)
              ? [{ 
                  label: "Notas Fiscais", 
                  to: "/receber-notas", 
                  icon: "file-text", 
                  badge: counts.notas > 0 
                }]
              : []),
            ...(hasPermission(PERMISSIONS.VIEW_SENT)
              ? [{ label: "Pedidos Enviados", to: "/enviados", icon: "sent" }]
              : []),
            ...(hasPermission(PERMISSIONS.NOTIFICATIONS)
              ? [{ 
                  label: "Notificações", 
                  to: "/notificacoes", 
                  icon: "bell", 
                  badge: counts.notifications > 0 
                }]
              : []),
            { label: "Perfil", to: "/perfil", icon: "user" }
          ].filter(item => !item.hide)}
          onLogout={() => setConfirmLogout(true)}
        />
      </div>

      <main className="content">
        <div className="actions mobile-header-actions" style={{ marginBottom: 12, justifyContent: "flex-start" }}>
          <button
            className="btn toggle-sidebar-btn"
            onClick={() => { 
              if (isMobile) setSidebarOpen(s => !s); 
              else setSidebarCollapsed(c => !c); 
            }}
            aria-label={
              isMobile ? (sidebarOpen ? "Fechar menu" : "Abrir menu")
                       : (sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar")
            }
          >
            <span className="nav-ico-svg">
              {isMobile ? (
                sidebarOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                )
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              )}
            </span>
          </button>
        </div>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>

      {confirmLogout && (
        <div className="modal-overlay" onClick={() => setConfirmLogout(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="nav-ico-svg"><LogoutIcon /></span>
                Sair da conta
              </div>
            </div>
            <div className="stack">
              <div style={{ color: "var(--muted)" }}>
                Tem certeza que deseja sair? Você precisará entrar novamente.
              </div>
              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setConfirmLogout(false)}>Cancelar</button>
                <button className="btn danger" onClick={doLogout}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppRouter() {
  const { isAdmin } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/invite" element={<AcceptInvite />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/recuperar" element={<Recover />} />

        <Route
          path="/"
          element={
            <Protected>
              <Layout>
                {isAdmin ? <AdminDashboard /> : <Dashboard />}
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/admin"
          element={
            <Protected permission={PERMISSIONS.ADMIN_DASHBOARD}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <Protected permission={PERMISSIONS.MANAGE_USERS}>
              <Layout>
                <AdminUsers />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/admin/permissoes"
          element={
            <Protected permission={PERMISSIONS.MANAGE_PERMISSIONS}>
              <Layout>
                <PermissionManager />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/admin/setores"
          element={
            <Protected permission={PERMISSIONS.MANAGE_SECTORS}>
              <Layout>
                <AdminSectors />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/admin/logs"
          element={
            <Protected permission={PERMISSIONS.VIEW_LOGS}>
              <Layout>
                <AdminLogs />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/recebidos"
          element={
            <Protected permission={PERMISSIONS.VIEW_ATTEND_QUEUE}>
              <Layout>
                <Received />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/receber-notas"
          element={
            <Protected permission={PERMISSIONS.VIEW_NOTA_RECEIVED}>
              <Layout>
                <ReceivedNotas />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/avaliar-nota/:id"
          element={
            <Protected permission={PERMISSIONS.APPROVE_NOTA}>
              <Layout>
                <EvaluateNota />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/enviados"
          element={
            <Protected permission={PERMISSIONS.VIEW_SENT}>
              <Layout>
                <Sent />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/enviar"
          element={
            <Protected permission={PERMISSIONS.CREATE_ORDER}>
              <Layout>
                <Sent compose={true} />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/enviar-nota"
          element={
            <Protected>
              <Layout>
                <NewNotaFiscal />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/avaliar/:id"
          element={
            <Protected permission={PERMISSIONS.EVALUATE_ORDER}>
              <Layout>
                <Evaluate />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/notificacoes"
          element={
            <Protected permission={PERMISSIONS.NOTIFICATIONS}>
              <Layout>
                <Notifications />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/perfil"
          element={
            <Protected>
              <Layout>
                <Profile />
              </Layout>
            </Protected>
          }
        />

        <Route
          path="/documento/:id"
          element={
            <Protected>
              <Layout>
                <DocumentDetail />
              </Layout>
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastManager />
    </>
  );
}
