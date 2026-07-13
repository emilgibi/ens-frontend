import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseFetchOptions extends RequestInit {
  autoInvoke?: boolean;
}

export interface UseFetchReturnValue<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  abort: () => void;
}

export function useFetch<T>(
  url: string,
  { autoInvoke = true, ...options }: UseFetchOptions = {},
): UseFetchReturnValue<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const controller = useRef<AbortController | null>(null);

  const refetch = useCallback(() => {
    if (controller.current) {
      controller.current.abort();
    }

    controller.current = new AbortController();

    setLoading(true);

    return fetch(url, { signal: controller.current.signal, ...options })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') ?? '';
        const isJson = contentType.includes('application/json');
        if (!res.ok) {
          const msg = isJson
            ? ((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`)
            : `HTTP ${res.status}: ${res.statusText}`;
          throw new Error(msg);
        }
        if (!isJson) throw new Error(`Expected JSON but got: ${contentType}`);
        return res.json();
      })
      .then((res) => {
        setData(res);
        return res as T;
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err);
        }

        return err;
      })
      .finally(() => {
        setLoading(false);
      });
  }, [url]);

  const abort = useCallback(() => {
    if (controller.current) {
      controller.current?.abort('');
    }
  }, []);

  useEffect(() => {
    if (autoInvoke) {
      refetch();
    }

    return () => {
      if (controller.current) {
        controller.current.abort('');
      }
    };
  }, [refetch, autoInvoke]);

  return { data, loading, error, refetch, abort };
}