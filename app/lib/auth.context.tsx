// ═══════════════════════════════════════════
// KTMDrip — Auth Context (Client-side)
// Tracks logged-in user state across the app
// ═══════════════════════════════════════════

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  isLoggedIn: false,
});

export function AuthProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  const value: AuthContextValue = {
    user,
    isAdmin: user?.role === "admin",
    isLoggedIn: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
