import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface TagConfig {
  value: string;
  label: string;
  className: string;
}

const DEFAULT_TAGS: TagConfig[] = [
  { value: 'sql', label: 'SQL', className: 'bg-success/20 text-success border-success/30' },
  { value: 'mql', label: 'MQL', className: 'bg-info/20 text-info border-info/30' },
  { value: 'cold', label: 'Frio', className: 'bg-muted text-muted-foreground border-border' },
  { value: 'scheduled', label: 'Marcou', className: 'bg-accent/20 text-accent-foreground border-accent/30' },
];

const TAG_CONFIG_STORAGE_KEY = 'crmTagConfig';

const PRESET_COLORS = [
  { label: 'Verde', className: 'bg-success/20 text-success border-success/30' },
  { label: 'Azul', className: 'bg-info/20 text-info border-info/30' },
  { label: 'Amarelo', className: 'bg-warning/20 text-warning border-warning/30' },
  { label: 'Roxo', className: 'bg-primary/20 text-primary border-primary/30' },
  { label: 'Destaque', className: 'bg-accent/20 text-accent-foreground border-accent/30' },
  { label: 'Neutro', className: 'bg-muted text-muted-foreground border-border' },
];

interface TagConfigContextType {
  tags: TagConfig[];
  presetColors: typeof PRESET_COLORS;
  addTag: (tag: TagConfig) => void;
  updateTag: (value: string, updated: Partial<TagConfig>) => void;
  removeTag: (value: string) => void;
  resetToDefaults: () => void;
}

const TagConfigContext = createContext<TagConfigContextType | undefined>(undefined);

export function TagConfigProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<TagConfig[]>(() => {
    const stored = localStorage.getItem(TAG_CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_TAGS;
      }
    }
    return DEFAULT_TAGS;
  });

  useEffect(() => {
    localStorage.setItem(TAG_CONFIG_STORAGE_KEY, JSON.stringify(tags));
  }, [tags]);

  const addTag = useCallback((tag: TagConfig) => {
    setTags(prev => {
      if (prev.some(t => t.value === tag.value)) return prev;
      return [...prev, tag];
    });
  }, []);

  const updateTag = useCallback((value: string, updated: Partial<TagConfig>) => {
    setTags(prev => prev.map(t => t.value === value ? { ...t, ...updated } : t));
  }, []);

  const removeTag = useCallback((value: string) => {
    setTags(prev => prev.filter(t => t.value !== value));
  }, []);

  const resetToDefaults = useCallback(() => {
    setTags(DEFAULT_TAGS);
  }, []);

  return (
    <TagConfigContext.Provider value={{ tags, presetColors: PRESET_COLORS, addTag, updateTag, removeTag, resetToDefaults }}>
      {children}
    </TagConfigContext.Provider>
  );
}

export function useTagConfig() {
  const context = useContext(TagConfigContext);
  if (!context) {
    throw new Error('useTagConfig must be used within a TagConfigProvider');
  }
  return context;
}
