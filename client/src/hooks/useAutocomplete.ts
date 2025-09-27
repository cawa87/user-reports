import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { usersApi } from '@/services/api';

interface AutocompleteSuggestion {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export const useUserAutocomplete = (query: string, enabled: boolean = true) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch suggestions when query is long enough
  const shouldFetch = enabled && debouncedQuery.trim().length >= 2;

  const {
    data: suggestionsResponse,
    isLoading,
    error,
  } = useQuery(
    ['user-suggestions', debouncedQuery],
    () => usersApi.getSuggestions(debouncedQuery, 8),
    {
      enabled: shouldFetch,
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  );

  const suggestions: AutocompleteSuggestion[] = useMemo(() => {
    if (!suggestionsResponse?.data?.suggestions) return [];
    
    return suggestionsResponse.data.suggestions.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    }));
  }, [suggestionsResponse]);

  return {
    suggestions,
    isLoading: shouldFetch && isLoading,
    error,
    isEnabled: shouldFetch,
  };
};
