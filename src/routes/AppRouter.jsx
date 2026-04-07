import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Received from "../pages/Received.jsx";
import Sent from "../pages/Sent.jsx";
import Evaluate from "../pages/Evaluate.jsx";
import Notifications from "../pages/Notifications.jsx";
import Profile from "../pages/Profile.jsx";
import Alert from "../components/Alert.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { LogoutIcon } from "../components/Icons.jsx";
import DocumentDetail from "../pages/DocumentDetail.jsx";
import AcceptInvite from "../pages/AcceptInvite.jsx";
import VerifyEmail from "../pages/VerifyEmail.jsx";
import Recover from "../pages/Recover.jsx";
import NewNotaFiscal from "../pages/NewNotaFiscal.jsx";
import ReceivedNotas from "../pages/ReceivedNotas.jsx";
import EvaluateNota from "../pages/EvaluateNota.jsx";
import ToastManager from "../components/Toast.jsx";

function Protected({ children, permission }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (permission && !can(permission)) return <Navigate to="/" replace />;

  return children;
}

function Layout({ children }) {
  const { user, logout, can, isPrivileged } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

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
            { label: "Dashboard", to: "/", end: true, icon: "home" },
            ...(can("send")
              ? [{ label: "Novo pedido", to: "/enviar", icon: "compose" }]
              : []),
            ...(user?.sector === "Peças"
              ? [{ label: "Enviar Nota Fiscal", to: "/enviar-nota", icon: "file-text" }]
              : []),
            ...(can("view_received")
              ? [{ label: "Pedidos para Atender", to: "/recebidos", icon: "received" }]
              : []),
            ...(can("view_received")
              ? [{ label: "Notas Fiscais", to: "/receber-notas", icon: "received" }]
              : []),
            ...(can("view_sent")
              ? [{ label: "Pedidos Enviados", to: "/enviados", icon: "sent" }]
              : []),
            ...(can("notifications")
              ? [{ label: "Notificações", to: "/notificacoes", icon: "bell" }]
              : []),
            { label: "Perfil", to: "/perfil", icon: "user" }
          ]}
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
        {children}
        <ToastManager />
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
  return (
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
              <Dashboard />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/recebidos"
        element={
          <Protected permission="view_received">
            <Layout>
              <Received />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/receber-notas"
        element={
          <Protected permission="view_received">
            <Layout>
              <ReceivedNotas />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/avaliar-nota/:id"
        element={
          <Protected>
            <Layout>
              <EvaluateNota />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/enviados"
        element={
          <Protected permission="view_sent">
            <Layout>
              <Sent compose={false} />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/enviar"
        element={
          <Protected permission="send">
            <Layout>
              <Sent compose />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/enviar-nota"
        element={
          <Protected permission="send">
            <Layout>
              <NewNotaFiscal />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/avaliar/:id"
        element={
          <Protected>
            <Layout>
              <Evaluate />
            </Layout>
          </Protected>
        }
      />

      <Route
        path="/notificacoes"
        element={
          <Protected permission="notifications">
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
  );
}
