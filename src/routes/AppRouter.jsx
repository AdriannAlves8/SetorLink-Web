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
import GenerateInvite from "../pages/GenerateInvite.jsx";
import AcceptInvite from "../pages/AcceptInvite.jsx";
import VerifyEmail from "../pages/VerifyEmail.jsx";
import Recover from "../pages/Recover.jsx";

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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setConfirmLogout(false);
    };
    if (confirmLogout) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout]);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className={`app ${sidebarOpen ? "with-sidebar" : "no-sidebar"} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className={`sidebar-wrapper ${sidebarOpen ? "open" : "hidden"}`}>
        <Sidebar
          items={[
            { label: "Dashboard", to: "/", end: true, icon: "home" },
            ...(can("view_sent")
              ? [{ label: "Documentos Enviados", to: "/enviados", icon: "sent" }]
              : []),
            ...(can("view_received")
              ? [{ label: "Documentos Recebidos", to: "/recebidos", icon: "received" }]
              : []),
            ...(can("send")
              ? [{ label: "Enviar Documento", to: "/enviar", icon: "compose" }]
              : []),
            ...(can("generate_invite")
              ? [{ label: "Adicionar Colaborador", to: "/convites/gerar", icon: "user-plus" }]
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
        <div className="actions" style={{ marginBottom: 12, justifyContent: "flex-start" }}>
          <button
            className="btn"
            onClick={() => { if (isMobile) setSidebarOpen(s => !s); else setSidebarCollapsed(c => !c); }}
            aria-label={
              isMobile ? (sidebarOpen ? "Fechar menu" : "Abrir menu")
                       : (sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar")
            }
            title={
              isMobile ? (sidebarOpen ? "Fechar menu" : "Abrir menu")
                       : (sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar")
            }
          >
            {isMobile ? (sidebarOpen ? "⟨⟨" : "⟩⟩") : (sidebarCollapsed ? "⟩⟩" : "⟨⟨")}
          </button>
        </div>

        {children}
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
        path="/convites/gerar"
        element={
          <Protected permission="generate_invite">
            <Layout>
              <GenerateInvite />
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

      {/* ✅ CORREÇÃO AQUI */}
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
        path="/avaliar/:id"
        element={
          <Protected permission="evaluate">
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
