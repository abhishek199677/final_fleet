'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: 'owner' | 'ops' | 'admin' | 'platform';
  tenant_id: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, tenantName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('fleetos_token');
    if (token) {
      // Decode JWT to get user info (in production, validate with Cognito)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          role: payload['custom:role'] || 'ops',
          tenant_id: payload['custom:tenant_id'],
        });
      } catch {
        localStorage.removeItem('fleetos_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = apiUrl ? `${apiUrl}/v1/auth/login` : '/api/auth/login';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.message || 'Login failed');
    }

    const body = await res.json().catch(() => null);
    if (!body?.token) throw new Error('Invalid server response');
    const { token, user: userData } = body;
    localStorage.setItem('fleetos_token', token);
    setUser(userData);

    // Redirect based on role
    if (userData.role === 'owner' || userData.role === 'admin') {
      router.push('/');
    } else {
      router.push('/today');
    }
  };

  const register = async (email: string, password: string, tenantName: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = apiUrl ? `${apiUrl}/v1/auth/register` : '/api/auth/register';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenant_name: tenantName }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Registration failed');
    }

    const body = await res.json().catch(() => null);
    if (!body?.token) throw new Error('Invalid server response');
    const { token, user: userData } = body;
    localStorage.setItem('fleetos_token', token);
    setUser(userData);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('fleetos_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
