/**
 * Authentication Hook
 *
 * Provides access to current user session and auth state
 */

"use client";

import { useApi } from "./useApi";
import { SessionUser } from "@/lib/auth";

interface UseAuthReturn {
  user: SessionUser | undefined;
  isLoading: boolean;
  error: Error | undefined;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { data, error, isLoading, mutate } = useApi<{ user: SessionUser }>("/api/auth/me");

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    mutate(undefined, false);
    window.location.href = "/login";
  };

  return {
    user: data?.user,
    isLoading,
    error,
    isAuthenticated: !!data?.user,
    logout,
  };
}

export default useAuth;
