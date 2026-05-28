'use client';
import { useAuth } from '@clerk/nextjs';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'error', err.message ?? res.statusText);
  }
  return body as T;
}

export function useApi() {
  const { getToken } = useAuth();
  return {
    async get<T>(path: string): Promise<T> {
      const token = await getToken();
      return apiFetch<T>(path, { token, method: 'GET' });
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      const token = await getToken();
      return apiFetch<T>(path, {
        token,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    async del<T>(path: string): Promise<T> {
      const token = await getToken();
      return apiFetch<T>(path, { token, method: 'DELETE' });
    },
  };
}
