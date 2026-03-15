"use client";

import { useAuth } from "@clerk/nextjs";

export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

/**
 * Hook that returns an `apiFetch` function pre-loaded with the
 * current Clerk session token in the Authorization header.
 *
 * Usage:
 *   const { apiFetch } = useApi();
 *   const res = await apiFetch("/analysis/biomarkers");
 */
export function useApi() {
  const { getToken } = useAuth();

  async function apiFetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await getToken();
    return fetch(`${BACKEND}${path}`, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  return { apiFetch };
}
