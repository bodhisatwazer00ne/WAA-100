import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/types/waa';
import { apiRequest, clearAuthToken, setAuthToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  token: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_USER_STORAGE_KEY = 'waa100_auth_user_v1';

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile?: {
    id?: string;
    [key: string]: unknown;
  } | null;
}

interface LoginResponse {
  token: string;
  user: BackendUser;
}

function normalizeRole(role: UserRole): UserRole {
  return role === 'class_teacher' ? 'teacher' : role;
}

function toClientUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: normalizeRole(backendUser.role),
    department_id: '',
    avatar: undefined,
    ...(backendUser.profile?.id ? { profile_id: backendUser.profile.id } : {}),
  } as User;
}

function loadPersistedUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadPersistedUser());
  const [token, setToken] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('waa100_auth_token_v1') ?? '';
  });

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await apiRequest<LoginResponse>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            password,
          }),
        },
        { withAuth: false },
      );

      const returnedRole = normalizeRole(response.user.role);
      if (returnedRole !== role) {
        return false;
      }

      const normalizedUser = toClientUser(response.user);
      setUser(normalizedUser);
      setToken(response.token);
      setAuthToken(response.token);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalizedUser));
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken('');
    clearAuthToken();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user && !!token, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
