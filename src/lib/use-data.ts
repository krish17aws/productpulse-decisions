import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { fetchTable, type TableQuery } from "@/lib/queries";

/**
 * Client-side data loading for the external Supabase project.
 *
 * - runs only after authentication is established
 * - batches every query requested in the same tick into one Promise.allSettled
 *   so a single failing query never blocks the rest of the page
 * - always clears its loading state in a `finally` block
 * - never writes state after unmount, never retries, never substitutes mock data
 */

export interface DataQueryState<T> {
  data: T[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

type PendingRead = {
  query: TableQuery<unknown>;
  resolve: (rows: unknown[]) => void;
  reject: (error: unknown) => void;
};

let batch: PendingRead[] = [];
let scheduled = false;

function flushBatch() {
  const current = batch;
  batch = [];
  scheduled = false;
  if (current.length === 0) return;

  console.info(
    `[queries] batch of ${current.length}: ${current.map((r) => r.query.name).join(", ")}`,
  );
  void Promise.allSettled(current.map((r) => fetchTable(r.query))).then((results) => {
    results.forEach((result, index) => {
      const entry = current[index];
      if (!entry) return;
      if (result.status === "fulfilled") entry.resolve(result.value as unknown[]);
      else entry.reject(result.reason);
    });
  });
}

function enqueue<T>(query: TableQuery<T>): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    batch.push({
      query: query as TableQuery<unknown>,
      resolve: (rows) => resolve(rows as T[]),
      reject,
    });
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(flushBatch);
    }
  });
}

export function useDataQuery<T>(
  query: TableQuery<T>,
  options?: { enabled?: boolean },
): DataQueryState<T> {
  const { session, loading: authLoading } = useAuth();
  const enabled = options?.enabled ?? true;

  const [data, setData] = useState<T[] | undefined>(undefined);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const name = query.name;

  useEffect(() => {
    if (!enabled) {
      setIsPending(false);
      return;
    }
    // Auth loading is its own state: wait, but never render a stuck skeleton.
    if (authLoading) {
      setIsPending(true);
      return;
    }
    if (!session) {
      setIsPending(false);
      return;
    }

    let cancelled = false;
    setIsPending(true);
    setError(null);

    void (async () => {
      try {
        const rows = await enqueue<T>(query);
        if (cancelled || !mounted.current) return;
        setData(rows);
        setError(null);
      } catch (caught) {
        if (cancelled || !mounted.current) return;
        console.error(`[query:${name}] error surfaced to UI`, caught);
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      } finally {
        if (!cancelled && mounted.current) setIsPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, enabled, authLoading, session?.user.id ?? null, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, isPending, isError: error !== null, error, refetch };
}
