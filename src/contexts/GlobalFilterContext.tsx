import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface GlobalFilterState {
  // Tags
  activeTags: string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setTags: (tags: string[]) => void;
  isTagActive: (tag: string) => boolean;

  // Status
  activeStatuses: string[];
  toggleStatus: (status: string) => void;
  clearStatuses: () => void;
  isStatusActive: (status: string) => boolean;

  // Collaborator
  activeCollaborator: string | null;
  setActiveCollaborator: (id: string | null) => void;

  // Global
  hasActiveFilters: boolean;
  clearAll: () => void;
}

const GlobalFilterContext = createContext<GlobalFilterState | undefined>(undefined);

export function GlobalFilterProvider({ children }: { children: ReactNode }) {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [activeCollaborator, setActiveCollaborator] = useState<string | null>(null);

  // Tags
  const toggleTag = useCallback((tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);
  const clearTags = useCallback(() => setActiveTags([]), []);
  const setTags = useCallback((tags: string[]) => setActiveTags(tags), []);
  const isTagActive = useCallback((tag: string) => activeTags.includes(tag), [activeTags]);

  // Status
  const toggleStatus = useCallback((status: string) => {
    setActiveStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  }, []);
  const clearStatuses = useCallback(() => setActiveStatuses([]), []);
  const isStatusActive = useCallback((status: string) => activeStatuses.includes(status), [activeStatuses]);

  // Global
  const hasActiveFilters = activeTags.length > 0 || activeStatuses.length > 0 || activeCollaborator !== null;
  const clearAll = useCallback(() => {
    setActiveTags([]);
    setActiveStatuses([]);
    setActiveCollaborator(null);
  }, []);

  return (
    <GlobalFilterContext.Provider value={{
      activeTags, toggleTag, clearTags, setTags, isTagActive,
      activeStatuses, toggleStatus, clearStatuses, isStatusActive,
      activeCollaborator, setActiveCollaborator,
      hasActiveFilters, clearAll,
    }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilter() {
  const context = useContext(GlobalFilterContext);
  if (!context) {
    throw new Error('useGlobalFilter must be used within a GlobalFilterProvider');
  }
  return context;
}
