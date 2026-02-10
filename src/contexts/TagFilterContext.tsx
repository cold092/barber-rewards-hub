import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface TagFilterContextType {
  activeTags: string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setTags: (tags: string[]) => void;
  isTagActive: (tag: string) => boolean;
}

const TagFilterContext = createContext<TagFilterContextType | undefined>(undefined);

export function TagFilterProvider({ children }: { children: ReactNode }) {
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const clearTags = useCallback(() => setActiveTags([]), []);
  
  const setTags = useCallback((tags: string[]) => setActiveTags(tags), []);

  const isTagActive = useCallback((tag: string) => activeTags.includes(tag), [activeTags]);

  return (
    <TagFilterContext.Provider value={{ activeTags, toggleTag, clearTags, setTags, isTagActive }}>
      {children}
    </TagFilterContext.Provider>
  );
}

export function useTagFilter() {
  const context = useContext(TagFilterContext);
  if (!context) {
    throw new Error('useTagFilter must be used within a TagFilterProvider');
  }
  return context;
}
