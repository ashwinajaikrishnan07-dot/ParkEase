import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api.js';

const TOKEN_KEY = 'parkwise_token';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;

    async function restoreSession() {
      try {
        const data = await apiRequest('/api/auth/me', { token });
        if (active) setUser(data.user);
      } catch {
        if (active) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [token]);

  const applySession = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setIsLoading(false);
    return data.user;
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: credentials });
    return applySession(data);
  }, [applySession]);

  const register = useCallback(async (details) => {
    const data = await apiRequest('/api/auth/register', { method: 'POST', body: details });
    return applySession(data);
  }, [applySession]);

  const googleSignIn = useCallback(async (credential) => {
    const data = await apiRequest('/api/auth/google', { method: 'POST', body: { credential } });
    return applySession(data);
  }, [applySession]);

  const updateProfile = useCallback(async (details) => {
    const data = await apiRequest('/api/users/profile', {
      method: 'PUT',
      token,
      body: details,
    });
    setUser(data.user);
    return data.user;
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      register,
      googleSignIn,
      token,
      updateProfile,
      user,
    }),
    [isLoading, login, logout, register, googleSignIn, token, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
