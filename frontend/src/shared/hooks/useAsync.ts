import { useCallback, useEffect, useState, type DependencyList } from "react";

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * Runs an async loader (a feature `api.ts` call) and tracks data/loading/error.
 * Re-runs when `deps` change or when `reload()` is called.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: undefined }));

    loader().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: undefined });
      },
      (error: unknown) => {
        if (!cancelled) setState({ data: undefined, loading: false, error });
      }
    );

    return () => {
      cancelled = true;
    };
    // The caller controls re-runs through `deps`, like useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { ...state, reload };
}
