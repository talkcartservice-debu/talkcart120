import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import searchService, { 
  SearchResult, 
  SearchFilters, 
  SearchSuggestion 
} from '@/services/searchApi';

interface UseSearchProps {
  initialQuery?: string;
  debounceMs?: number;
  autoSearch?: boolean;
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: Error | null;
  searching: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  search: (filters?: Partial<SearchFilters>) => Promise<void>;
  clearSearch: () => void;
  saveToRecent: (query: string) => void;
  clearRecentSearches: () => void;
  getRecentSearches: () => string[];
  total: number;
}

export const useSearch = ({
  initialQuery = '',
  debounceMs = 300,
  autoSearch = true
}: UseSearchProps = {}): UseSearchReturn => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [total, setTotal] = useState(0);
  
  const debouncedQuery = useDebounce(query, debounceMs);
  const searchRef = useRef<AbortController | null>(null);
  
  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchRef.current) {
        searchRef.current.abort();
      }
      
      searchRef.current = new AbortController();
      
      try {
        setLoading(true);
        const suggestions = await searchService.getSuggestions(debouncedQuery);
        setSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching suggestions:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (debouncedQuery || debouncedQuery === '') {
      fetchSuggestions();
    }
    
    return () => {
      if (searchRef.current) {
        searchRef.current.abort();
      }
    };
  }, [debouncedQuery]);
  
  // Auto search when query changes if autoSearch is enabled
  useEffect(() => {
    if (autoSearch && debouncedQuery && debouncedQuery.length >= 2) {
      search();
    }
  }, [debouncedQuery, autoSearch]);
  
  // Search function
  const search = useCallback(async (filters?: Partial<SearchFilters>) => {
    if (searchRef.current) {
      searchRef.current.abort();
    }
    
    searchRef.current = new AbortController();
    
    try {
      setSearching(true);
      setError(null);
      
      const searchFilters: SearchFilters = {
        query: filters?.query || query,
        types: filters?.types,
        limit: filters?.limit || 20,
        page: filters?.page || 1
      };
      
      // Only search if query is not empty
      if (!searchFilters.query) {
        setResults([]);
        setTotal(0);
        return;
      }
      
      const { results, total } = await searchService.search(searchFilters);
      
      setResults(results);
      setTotal(total);
      
      // Save to recent searches if it's a full search
      if (searchFilters.query.length >= 2) {
        searchService.saveSearchQuery(searchFilters.query);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setError(error);
        console.error('Search error:', error);
      }
    } finally {
      setSearching(false);
      setShowSuggestions(false);
    }
  }, [query]);
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotal(0);
    setError(null);
  }, []);
  
  // Save to recent searches
  const saveToRecent = useCallback((query: string) => {
    searchService.saveSearchQuery(query);
  }, []);
  
  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    searchService.clearRecentSearches();
  }, []);
  
  // Get recent searches
  const getRecentSearches = useCallback(() => {
    return searchService.getRecentSearches();
  }, []);
  
  return {
    query,
    setQuery,
    results,
    suggestions,
    loading,
    error,
    searching,
    showSuggestions,
    setShowSuggestions,
    search,
    clearSearch,
    saveToRecent,
    clearRecentSearches,
    getRecentSearches,
    total
  };
};

export default useSearch;