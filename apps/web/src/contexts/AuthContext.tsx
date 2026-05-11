import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getUser, getAuthToken, setUser, setAuthToken, removeAuthToken, type User } from "../lib/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const storedToken = getAuthToken();
    const storedUser = getUser();

    console.log("🔐 AuthContext Loading:", { storedToken: !!storedToken, storedUser });

    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUserState(storedUser);
      console.log("✅ Auth restored from localStorage");
    } else {
      console.log("❌ No auth data found in localStorage");
    }

    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    console.log("🔐 Login called with:", { token: !!newToken, user: newUser });
    setAuthToken(newToken);
    setUser(newUser);
    setTokenState(newToken);
    setUserState(newUser);
    console.log("✅ Auth stored in localStorage");
  };

  const logout = () => {
    removeAuthToken();
    setTokenState(null);
    setUserState(null);
    window.location.href = "/signin";
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
