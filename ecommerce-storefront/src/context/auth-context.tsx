"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import {
  getScopedStorageItem,
  removeScopedStorageItem,
  setScopedStorageItem,
} from "@/lib/store-browser-storage";

const SESSION_REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const SESSION_ACTIVITY_REFRESH_COOLDOWN_MS = 90 * 1000;

type User = {
  id: number;
  email: string;
  storeId?: number;
  role?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  name?: string | null;
  storeLocationId?: number | null;
  storeLocation?: {
    id: number;
    name: string;
  } | null;
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
  loginWithGoogle: (data: { credential: string; clientId?: string }) => Promise<User>;
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
  const sessionUserKey = user ? `${user.storeId ?? "store"}:${user.id}` : "";

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
    const storedUser = getScopedStorageItem("user");

    const hydrateSession = async () => {
      try {
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }

        // Resolve the current session without surfacing an auth error for anonymous visitors.
        const freshUser = await api("/auth/session");

        if (freshUser) {
          setScopedStorageItem("user", JSON.stringify(freshUser));
          setUser(freshUser);
          return;
        }

        removeScopedStorageItem("user");
        setUser(null);
      } catch {
        removeScopedStorageItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (!storedUser) {
      void hydrateSession();
      return;
    }

    try {
      JSON.parse(storedUser);
    } catch {
      removeScopedStorageItem("user");
    }

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!sessionUserKey) {
      return;
    }

    let cancelled = false;
    let refreshRunning = false;
    let lastActivityRefreshAt = 0;

    const refreshSession = async () => {
      if (refreshRunning) {
        return;
      }

      refreshRunning = true;

      try {
        const freshUser = await api("/auth/session");

        if (cancelled) {
          return;
        }

        if (freshUser) {
          setScopedStorageItem("user", JSON.stringify(freshUser));
          setUser(freshUser);
          return;
        }

        removeScopedStorageItem("user");
        setUser(null);
      } catch {
        // A transient network failure should not log out a working user.
      } finally {
        refreshRunning = false;
      }
    };

    const refreshAfterActivity = () => {
      const now = Date.now();

      if (now - lastActivityRefreshAt < SESSION_ACTIVITY_REFRESH_COOLDOWN_MS) {
        return;
      }

      lastActivityRefreshAt = now;
      void refreshSession();
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshAfterActivity();
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    }, SESSION_REFRESH_INTERVAL_MS);

    window.addEventListener("focus", refreshAfterActivity);
    window.addEventListener("pointerdown", refreshAfterActivity, { passive: true });
    window.addEventListener("keydown", refreshAfterActivity);
    window.addEventListener("touchstart", refreshAfterActivity, { passive: true });
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshAfterActivity);
      window.removeEventListener("pointerdown", refreshAfterActivity);
      window.removeEventListener("keydown", refreshAfterActivity);
      window.removeEventListener("touchstart", refreshAfterActivity);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [sessionUserKey]);

  const login = async (data: { email: string; password: string }) => {
    const res = await api("/auth/session-login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    setScopedStorageItem("user", JSON.stringify(res.user));

    setUser(res.user);
    return res.user;
  };

  const loginWithGoogle = async (data: { credential: string; clientId?: string }) => {
    const res = await api("/auth/google", {
      method: "POST",
      body: JSON.stringify(data),
    });

    setScopedStorageItem("user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    void api("/auth/logout", {
      method: "POST",
    }).catch(() => null);
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
        loginWithGoogle,
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
