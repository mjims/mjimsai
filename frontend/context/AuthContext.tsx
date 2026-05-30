"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const storedToken = localStorage.getItem("mjimsai_token");
    const storedUser = localStorage.getItem("mjimsai_user");
    if (storedToken) setTokenState(storedToken);
    if (storedUser) {
      try { setUserState(JSON.parse(storedUser)); } catch {}
    }
    setLoading(false);
  }, []);

  function setUser(u: User | null) {
    setUserState(u);
    if (u) localStorage.setItem("mjimsai_user", JSON.stringify(u));
    else localStorage.removeItem("mjimsai_user");
  }

  function setToken(t: string | null) {
    setTokenState(t);
    if (t) localStorage.setItem("mjimsai_token", t);
    else localStorage.removeItem("mjimsai_token");
  }

  function logout() {
    setUserState(null);
    setTokenState(null);
    localStorage.removeItem("mjimsai_token");
    localStorage.removeItem("mjimsai_user");
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
