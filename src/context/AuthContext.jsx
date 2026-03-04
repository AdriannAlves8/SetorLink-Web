import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { sectors, isPrivilegedSector, sectorEmails } from "../utils/constants.js";
import { acl } from "../utils/acl.js";
import * as api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const norm = (x) => {
    const tx = String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const match = sectors.find(s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === tx);
    return match || x;
  };

  useEffect(() => {
    (async () => {
      const u = await api.getUser();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  const login = async (sector, password) => {
    const u = await api.login(sector, password);
    setUser(u);
    return u;
  };
  const loginEmail = async (email, password) => {
    const u = await api.loginByEmail(email, password);
    setUser(u);
    return u;
  };
  const logout = () => {
    api.logout();
    setUser(null);
  };
  // Atualiza perfil e sincroniza em tempo real no Context
  const updateProfile = async (payload) => {
    const updated = await api.updateProfile(payload);
    setUser(u => ({ ...(u || {}), name: updated.name, avatar: updated.avatar }));
    return updated;
  };
  // Atualização de senha via Account API
  const updatePassword = async ({ currentPassword, newPassword }) => {
    await api.updatePassword({ currentPassword, newPassword });
    return true;
  };

  const deriveSector = () => {
    if (!user) return "";
    const nsec = norm(user.sector);
    if (nsec && acl[nsec]) return nsec;
    const mail = String(user.email || "").trim().toLowerCase();
    const found = Object.entries(sectorEmails).find(([, em]) => String(em).trim().toLowerCase() === mail);
    return found ? found[0] : nsec || "";
  };

  const can = (permission) => {
    if (!user) return false;
    const sectorKey = deriveSector();
    const rules = acl[sectorKey] || {};
    // RH como administrador: garante permissões principais mesmo se regras não carregarem
    if (sectorKey === "RH") {
      const adminPerms = new Set(["send","view_sent","notifications","reset_password","generate_invite"]);
      if (adminPerms.has(permission)) return true;
    }
    return !!rules[permission];
  };
  const allowedDestinations = () => {
    if (!user) return [];
    const sectorKey = deriveSector();
    const rules = acl[sectorKey] || {};
    return rules.destinations || [];
  };

  const value = useMemo(() => ({
    user,
    loading,
    login,
    loginEmail,
    logout,
    updateProfile,
    updatePassword,
    can,
    allowedDestinations,
    isPrivileged: user ? isPrivilegedSector(deriveSector()) : false,
    refresh: async () => {
      const u = await api.getUser();
      setUser(u);
      return u;
    }
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
