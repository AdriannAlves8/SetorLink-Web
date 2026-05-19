import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { hasPermission as checkPermission, ROLES } from "../utils/acl.js";
import * as api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const u = await api.getUser();
        setUser(u);
        
        if (u) {
          try {
            const sRes = await api.listSectorsForForward();
            setSectors(sRes || []);
          } catch {
            setSectors([]);
          }
        }
      } catch (err) {
        // Silencioso: Erro 401 é esperado se o usuário não estiver logado
        console.debug("Usuário não autenticado ou erro na inicialização.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    await api.loginByEmail(email, password);
    const u = await api.getUser();
    setUser(u);
    if (u) {
      try {
        const sRes = await api.listSectorsForForward();
        setSectors(sRes || []);
      } catch {
        setSectors([]);
      }
    }
    return u;
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setSectors([]);
  };

  const updateProfile = async (payload) => {
    const updated = await api.updateProfile(payload);
    // Recarrega o usuário para garantir permissões e dados atualizados
    const u = await api.getUser();
    setUser(u);
    return updated;
  };

  const updatePassword = async ({ currentPassword, newPassword }) => {
    await api.updatePassword({ currentPassword, newPassword });
    return true;
  };

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    updateProfile,
    updatePassword,
    hasPermission: (perm) => {
      if (!user) return false;
      if (Array.isArray(user.permissions) && user.permissions.length > 0 && user.permissions.includes(perm)) {
        return true;
      }
      return checkPermission(user, perm);
    },
    can: (perm) => {
      if (!user) return false;
      if (Array.isArray(user.permissions) && user.permissions.length > 0 && user.permissions.includes(perm)) {
        return true;
      }
      return checkPermission(user, perm);
    },
    sectors,
    isAdmin: user?.role === ROLES.SUPORTE,
    refresh: async () => {
      const u = await api.getUser();
      setUser(u);
      if (u) {
        try {
          const sRes = await api.listSectorsForForward();
          setSectors(sRes || []);
        } catch {
          setSectors([]);
        }
      } else {
        setSectors([]);
      }
      return u;
    }
  }), [user, loading, sectors]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
