import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('erp_token'));
  const [roleOverride, setRoleOverride] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('erp_token');
      if (savedToken) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data?.data) {
            setUser(res.data.data);
            localStorage.setItem('erp_user', JSON.stringify(res.data.data));
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    setToken(receivedToken);
    setUser(receivedUser);
    setRoleOverride(null);
    localStorage.setItem('erp_token', receivedToken);
    localStorage.setItem('erp_user', JSON.stringify(receivedUser));
  };

  const signup = async ({ name, email, password, role }) => {
    const res = await apiClient.post('/auth/signup', { name, email, password, role });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    setToken(receivedToken);
    setUser(receivedUser);
    setRoleOverride(null);
    localStorage.setItem('erp_token', receivedToken);
    localStorage.setItem('erp_user', JSON.stringify(receivedUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRoleOverride(null);
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
  };

  const normalizeRole = (r) => {
    if (!r) return 'OPERATIONS_USER';
    const upper = r.toUpperCase();
    if (upper === 'ADMIN') return 'ADMIN';
    if (upper === 'OPERATIONS' || upper === 'OPERATIONS_USER') return 'OPERATIONS_USER';
    if (upper === 'SALES' || upper === 'SALES_USER') return 'SALES_USER';
    return upper;
  };

  const effectiveRole = normalizeRole(roleOverride || user?.role);

  const isAdmin = effectiveRole === 'ADMIN';
  const isOps = effectiveRole === 'OPERATIONS_USER';
  const isSales = effectiveRole === 'SALES_USER';

  const hasRole = (roles) => {
    if (!user) return false;
    const normalized = roles.map(normalizeRole);
    return normalized.includes(effectiveRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: effectiveRole,
        roleOverride,
        setRoleOverride,
        isRoleOverridden: !!roleOverride,
        login,
        signup,
        logout,
        loading,
        isAdmin,
        isOps,
        isSales,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
