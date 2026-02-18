import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { sectors, isPrivilegedSector } from "../utils/constants.js";
import { acl } from "../utils/acl.js";
import * as api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = api.getSession();
    setUser(u);
    setLoading(false);
  }, []);

  const login = async (sector, password) => {
    const u = await api.login(sector, password);
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
  // Atualização de senha no mock API
  const updatePassword = async (newPassword) => {
    await api.updatePassword({ sector: user.sector, newPassword });
    setUser(u => ({ ...(u || {}), mustChangePassword: newPassword === "123456" }));
    return true;
  };

  const can = (permission) => {
    if (!user) return false;
    const rules = acl[user.sector] || {};
    return !!rules[permission];
  };
  const allowedDestinations = () => {
    if (!user) return [];
    const rules = acl[user.sector] || {};
    return rules.destinations || [];
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, updateProfile, updatePassword, can, allowedDestinations, isPrivileged: user ? isPrivilegedSector(user.sector) : false }),
    [user, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
