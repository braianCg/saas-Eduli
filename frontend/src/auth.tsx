import { createContext, useContext, useState, type ReactNode } from 'react';
import { session } from './api';
import type { User } from './types';

interface Ctx {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthCtx = createContext<Ctx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(session.get()?.user ?? null);
  const value: Ctx = {
    user,
    login: (token, u) => { session.set({ token, user: u }); setUser(u); },
    logout: () => { session.clear(); setUser(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
