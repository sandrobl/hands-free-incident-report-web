import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

export function useApi() {
  const { getToken } = useAuth();

  const apiFetch = useCallback(
    async <T>(path: string): Promise<T> => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json() as Promise<T>;
    },
    [getToken],
  );

  const authImgFetch = useCallback(
    async (url: string): Promise<string | null> => {
      try {
        const token = await getToken();
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    },
    [getToken],
  );

  return { apiFetch, authImgFetch };
}
