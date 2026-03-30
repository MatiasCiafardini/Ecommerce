"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import {
  getScopedStorageItem,
  removeScopedStorageItem,
  setScopedStorageItem,
} from "@/lib/store-browser-storage";

type User = {
  id: number;
  email: string;
  storeId?: number;
  role?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  name?: string | null;
  storeFeatures?: {
    manualSalesEnabled?: boolean;
  };
};

export type { User };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  authUiLocked: boolean;
  login: (data: { email: string; password: string }) => Promise<User>;
  logout: () => void;
  setUser: (user: User | null) => void;
  lockAuthUi: () => void;
  unlockAuthUi: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUiLockRouteKey, setAuthUiLockRouteKey] = useState<string | null>(null);

  useEffect(() => {
    if (!authUiLockRouteKey || authUiLockRouteKey === pathname) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setAuthUiLockRouteKey(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [authUiLockRouteKey, pathname]);

  useEffect(() => {
    const token = getScopedStorageItem("token");
    const storedUser = getScopedStorageItem("user");

    if (!token || !storedUser) {
      setLoading(false);
      return;
    }

    const hydrateSession = async () => {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Refresh the session from the API so the account shown in UI matches the JWT.
        const freshUser = await api("/auth/me");
        setScopedStorageItem("user", JSON.stringify(freshUser));
        setUser(freshUser);
      } catch {
        removeScopedStorageItem("token");
        removeScopedStorageItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    try {
      JSON.parse(storedUser);
      void hydrateSession();
    } catch {
      removeScopedStorageItem("token");
      removeScopedStorageItem("user");
      setUser(null);
      setLoading(false);
    }
  }, []);

  const login = async (data: { email: string; password: string }) => {
    const res = await api("/auth/session-login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    setScopedStorageItem("token", res.access_token);
    setScopedStorageItem("user", JSON.stringify(res.user));

    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    removeScopedStorageItem("token");
    removeScopedStorageItem("user");
    setUser(null);
  };

  const lockAuthUi = () => {
    setAuthUiLockRouteKey(pathname);
  };

  const unlockAuthUi = () => {
    setAuthUiLockRouteKey(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authUiLocked: authUiLockRouteKey !== null,
        login,
        logout,
        setUser,
        lockAuthUi,
        unlockAuthUi,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
