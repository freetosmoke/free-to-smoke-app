import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce, PerformanceMonitor } from '../utils/performance';
import { searchCustomers, getCustomers, getPrizes, getNotifications, getTransactions } from '../utils/firebase';
import type { Customer, Prize, Notification, PointTransaction } from '../types';

// Tipi per gli hook
interface UseFirebaseDataOptions {
  useCache?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

interface UseFirebaseDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

// Hook generico per dati Firebase
function useFirebaseData<T>(
  fetchFunction: (useCache?: boolean) => Promise<T[]>,
  options: UseFirebaseDataOptions = {}
): UseFirebaseDataResult<T> {
  const {
    useCache = true,
    refreshInterval
  } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const monitor = PerformanceMonitor.getInstance();
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;
    
    const endTimer = monitor.startTimer('firebase_fetch');
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction(useCache && !forceRefresh);
      
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
        setError(errorMessage);
        // Error logging removed
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      endTimer();
    }
  }, [fetchFunction, useCache, setData, setLoading, setError, setLastUpdated, mountedRef, monitor]);
  
  const debouncedFetch = useCallback(
    debounce(() => fetchData(true), 300),
    [fetchData, monitor]
  );
  
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);
  
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    
    // Setup refresh interval se specificato
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          debouncedFetch();
        }
      }, refreshInterval);
    }
    
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, debouncedFetch, mountedRef, refreshIntervalRef]);
  
  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated
  };
}

// Hook specifici per ogni tipo di dato
export function useCustomers(options?: UseFirebaseDataOptions) {

  return useFirebaseData<Customer>(getCustomers, options);
}

export function usePrizes(options?: UseFirebaseDataOptions) {

  return useFirebaseData<Prize>(getPrizes, options);
}

export function useNotifications(options?: UseFirebaseDataOptions) {

  return useFirebaseData<Notification>(getNotifications, options);
}

export function useTransactions(options?: UseFirebaseDataOptions) {

  return useFirebaseData<PointTransaction>(getTransactions, options);
}

// Hook per ricerca clienti ottimizzata
export function useCustomerSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // searchCustomers dovrebbe essere importato in cima al file
  const monitor = PerformanceMonitor.getInstance();
  
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    const endTimer = monitor.startTimer('customer_search');
    
    try {
      setSearching(true);
      setSearchError(null);
      
      const results = await searchCustomers(term, 20);
      setSearchResults(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella ricerca';
      setSearchError(errorMessage);
      // Error logging removed
    } finally {
      setSearching(false);
      endTimer();
    }
  }, []);
  
  const debouncedSearch = useCallback(
    debounce(performSearch, 500),
    [performSearch]
  );
  
  const search = useCallback((term: string) => {
    setSearchTerm(term);
    debouncedSearch(term);
  }, [debouncedSearch]);
  
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
  }, []);
  
  return {
    searchTerm,
    searchResults,
    searching,
    searchError,
    search,
    clearSearch
  };
}

// Hook per paginazione ottimizzata
export function usePaginatedData<T>(
  fetchFunction: (pageSize: number, lastDoc?: unknown) => Promise<{ data: T[]; lastDoc?: unknown }>,
  pageSize: number = 20
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<unknown>(null);
  
  const monitor = PerformanceMonitor.getInstance();
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    const endTimer = monitor.startTimer('paginated_fetch');
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction(pageSize, lastDoc);
      
      setData(prev => [...prev, ...result.data]);
      setLastDoc(result.lastDoc);
      setHasMore(result.data.length === pageSize && !!result.lastDoc);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento';
      setError(errorMessage);
      // Error logging removed
    } finally {
      setLoading(false);
      endTimer();
    }
  }, [fetchFunction, pageSize, lastDoc, loading, hasMore]);
  
  const reset = useCallback(() => {
    setData([]);
    setLastDoc(null);
    setHasMore(true);
    setError(null);
  }, []);
  
  const refresh = useCallback(async () => {
    reset();
    await loadMore();
  }, [reset, loadMore]);
  
  useEffect(() => {
    loadMore();
  }, []); // Solo al mount
  
  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
    refresh
  };
}

// Hook per operazioni CRUD ottimizzate
export function useFirebaseCRUD() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const monitor = new PerformanceMonitor();
  
  const executeOperation = useCallback(async <R>(
    operation: () => Promise<R>,
    operationName: string
  ): Promise<R | null> => {
    const endTimer = monitor.start(`crud_${operationName}`);
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await operation();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Errore in ${operationName}`;
      setError(errorMessage);
      // Error logging removed
      return null;
    } finally {
      setLoading(false);
      endTimer();
    }
  }, []);
  
  return {
    loading,
    error,
    executeOperation,
    clearError: () => setError(null)
  };
}

export default {
  useCustomers,
  usePrizes,
  useNotifications,
  useTransactions,
  useCustomerSearch,
  usePaginatedData,
  useFirebaseCRUD
};