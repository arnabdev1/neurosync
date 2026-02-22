"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  dob: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("neurosync-token") : null;
    
    if (!token) {
      setIsLoggedIn(false);
      setUser(null);
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/auth/verify", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.user) {
        setIsLoggedIn(true);
        setUser(data.user);
      } else {
        // Invalid token
        localStorage.removeItem("neurosync-token");
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth verification failed:", error);
      localStorage.removeItem("neurosync-token");
      setIsLoggedIn(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((token: string, userData: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("neurosync-token", token);
    }
    setIsLoggedIn(true);
    setUser(userData);
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("neurosync-token");
    }
    setIsLoggedIn(false);
    setUser(null);
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
