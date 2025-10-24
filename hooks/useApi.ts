/**
 * API Hook using SWR
 *
 * Provides a centralized way to fetch data with caching, revalidation,
 * and error handling.
 */

"use client";

import useSWR, { SWRConfiguration } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: "include", // Include cookies for authentication
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "An error occurred");
  }

  return res.json();
};

export function useApi<T>(
  key: string | null,
  options?: SWRConfiguration
) {
  const { data, error, mutate, isLoading } = useSWR<T>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

export default useApi;
