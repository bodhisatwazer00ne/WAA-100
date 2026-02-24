import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/types/waa';
import { users } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  loginAs: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple in-memory credentials for demo accounts.
const USER_CREDENTIALS: Record<string, string> = {
  'rahul.gaikwad@university.edu': 'rahulgaikwad123',
  'prakash.mali@university.edu': 'prakash123',
  'preeti.raut@university.edu': 'preeti123',
  'vijay.mane@university.edu': 'vijay123',
  'sonali.matondkar@university.edu': 'sonali123',
  'rahul.joshi@university.edu': 'rahul123',
  'aarav.patil@student.edu': 'aarav123',
  'rohan.kulkarni@student.edu': 'rohan123',
  'aditi.kulkarni@student.edu': 'aditi123',
  'sneha.patil@student.edu': 'sneha123',
  'arjun.malhotra@student.edu': 'arjun123',
  'devansh.verma@student.edu': 'devansh123',
  'ananya.malhotra@student.edu': 'ananya123',
  'kavya.verma@student.edu': 'kavya123',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const expectedPassword = USER_CREDENTIALS[normalizedEmail];

    if (!expectedPassword || expectedPassword !== password) {
      return false;
    }

    const found = users.find(
      u => u.email.toLowerCase() === normalizedEmail && u.role === role,
    );
    if (!found) return false;

    setUser(found);
    return true;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const loginAs = useCallback((role: UserRole) => {
    const found = users.find(u => u.role === role);
    if (found) setUser(found);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loginAs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
