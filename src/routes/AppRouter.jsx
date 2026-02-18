import React, { useState } from "react";
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Received from "../pages/Received.jsx";
import Sent from "../pages/Sent.jsx";
import Evaluate from "../pages/Evaluate.jsx";
import Notifications from "../pages/Notifications.jsx";
import Profile from "../pages/Profile.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";
import Alert from "../components/Alert.jsx";
import Logo from "../components/Logo.jsx";
import Sidebar from "../components/Sidebar.jsx";
import DocumentDetail from "../pages/DocumentDetail.jsx";

function Protected({ children, permission }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) return <Navigate to="/" replace />;
  if (user.mustChangePassword && location.pathname !== "/perfil") {
    return <Navigate to="/perfil" replace />;
  }
  return children;
}

function Layout({ children }) {
  const { user, logout, can, isPrivileged } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Confirmação de logout com modal e overlay
  const doLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <div className="app">
      <div className={`sidebar-wrapper ${sidebarOpen ? "open" : "hidden"}`}>
        <Sidebar
          items={[
            { label: "Dashboard", to: "/", end: true, icon: "home" },
            ...(can("view_sent") ? [{ label: "Documentos Enviados", to: "/enviados", icon: "sent" }] : []),
            ...(can("view_received") ? [{ label: "Documentos Recebidos", to: "/recebidos", icon: "received" }] : []),
            ...(can("send") ? [{ label: "Enviar Documento", to: "/enviar", icon: "compose" }] : []),
            ...(can("notifications") ? [{ label: "Notificações", to: "/notificacoes", icon: "bell" }] : []),
            { label: "Perfil", to: "/perfil", icon: "user" },
            ...(isPrivileged ? [{ label: "Reset de Senha", to: "/reset", icon: "key" }] : [])
          ]}
          onLogout={() => setConfirmLogout(true)}
        />
      </div>
      <main className="content">
        <button className="btn toggle-mobile" onClick={() => setSidebarOpen(s => !s)} style={{ display: "none" }}>☰</button>
        {user?.mustChangePassword && <Alert type="warning" message="Para maior privacidade, altere sua senha." />}
        {children}
      </main>
      {confirmLogout && (
        <div className="modal-overlay" onClick={() => setConfirmLogout(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Tem certeza que deseja sair?</div>
            <div className="actions">
              <button className="btn" onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <button className="btn danger" onClick={doLogout}>Confirmar</button>
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
        path="/enviados"
        element={
          <Protected permission="view_sent">
            <Layout>
              <Sent />
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
      <Route
        path="/reset"
        element={
          <Protected permission="reset_password">
            <Layout>
              <ResetPassword />
            </Layout>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
