/**
 * AuthContext.tsx
 * Stores JWT token, role, and active user profile.
 * Survives session re-renders and handles clean logout.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

export interface UserProfile {
  name: string;
  username: string;
  email?: string;
  role: 'analyst' | 'admin';
  avatarInitials: string;
}

interface AuthState {
  token: string | null;
  role: 'analyst' | 'admin' | null;
  user: UserProfile | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (token: string, role: 'analyst' | 'admin', username?: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  role: null,
  user: null,
  setAuth: () => {},
  clearAuth: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const saved = sessionStorage.getItem('finlens_auth');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      token: null,
      role: null,
      user: null,
    };
  });

  const setAuth = useCallback((token: string, role: 'analyst' | 'admin', username?: string) => {
    const cleanUser = username?.trim() || 'A. Nambiar';
    const name = cleanUser.includes('@') ? cleanUser.split('@')[0] : cleanUser;
    const initials = (name.length >= 2 ? name.slice(0, 2) : name).toUpperCase();
    const user: UserProfile = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      username: cleanUser,
      email: cleanUser.includes('@') ? cleanUser : `${cleanUser.toLowerCase()}@finlens.internal`,
      role,
      avatarInitials: initials,
    };
    const nextState = { token, role, user };
    setState(nextState);
    try {
      sessionStorage.setItem('finlens_auth', JSON.stringify(nextState));
    } catch {}
  }, []);

  const clearAuth = useCallback(() => {
    setState({ token: null, role: null, user: null });
    try {
      sessionStorage.removeItem('finlens_auth');
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
