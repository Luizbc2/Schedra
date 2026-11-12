import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalResult } from "../../../shared/database/cached-query";

type List<T> = (token: string, search: string) => Promise<{ data: T[]; local: LocalResult }>;

export function useCatalogList<T>(list: List<T>, token: string) {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localResult, setLocalResult] = useState<LocalResult | null>(null);
  const requestVersion = useRef(0);
  const load = useCallback(async (query: string) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    setLocalResult(null);
    try {
      const response = await list(token, query);
      if (version !== requestVersion.current) return;
      setItems(response.data);
      setLocalResult(response.local);
    } catch (error) {
      if (version === requestVersion.current) setError(error instanceof Error ? error.message : "Nao foi possivel carregar os dados.");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [list, token]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(search), 350);
    return () => { clearTimeout(timeout); requestVersion.current++; };
  }, [load, search]);
  return { items, search, setSearch, loading, error, localResult, load };
}
