import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { login as apiLogin, type AuthUser } from '../services/api';

const TOKEN_KEY = 'optiq_token';
const USER_KEY = 'optiq_user';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadStoredSession(): { user: AuthUser | null; token: string | null } {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (token && raw) {
    try {
      return { token, user: JSON.parse(raw) as AuthUser };
    } catch {
    }
  }
  return { user: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredSession();
    if (stored.token && stored.user) {
      setToken(stored.token);
      setUser(stored.user);
    }
  }, []);

  const loginUser = useCallback(async (email: string, password: string) => {
    const response = await apiLogin({ email, password });
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const logoutUser = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loginUser, logoutUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
