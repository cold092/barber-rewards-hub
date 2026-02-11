import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { getGlobalSetting, upsertSetting } from '@/services/settingsService';
import { supabase } from '@/integrations/supabase/client';

export interface TagConfig {
  value: string;
  label: string;
  className: string;
  showInClientColumns?: boolean;
}

const DEFAULT_TAGS: TagConfig[] = [
  { value: 'sql', label: 'SQL', className: 'bg-success/20 text-success border-success/30', showInClientColumns: true },
  { value: 'mql', label: 'MQL', className: 'bg-info/20 text-info border-info/30', showInClientColumns: true },
  { value: 'cold', label: 'Frio', className: 'bg-muted text-muted-foreground border-border', showInClientColumns: true },
  { value: 'scheduled', label: 'Marcou', className: 'bg-accent/20 text-accent-foreground border-accent/30', showInClientColumns: true },
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
  loading: boolean;
}

const TagConfigContext = createContext<TagConfigContextType | undefined>(undefined);

export function TagConfigProvider({ children }: { children: ReactNode }) {
  const normalizeTags = useCallback((sourceTags: TagConfig[]) => {
    return sourceTags.map((tag) => ({
      ...tag,
      showInClientColumns: tag.showInClientColumns !== false,
    }));
  }, []);

  const [tags, setTags] = useState<TagConfig[]>(() => {
    const stored = localStorage.getItem(TAG_CONFIG_STORAGE_KEY);
    if (stored) {
      try { return normalizeTags(JSON.parse(stored)); } catch { /* fall through */ }
    }
    return DEFAULT_TAGS;
  });
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dbTags = await getGlobalSetting<TagConfig[]>('tags');
      if (!cancelled && dbTags && Array.isArray(dbTags) && dbTags.length > 0) {
        const normalized = normalizeTags(dbTags);
        setTags(normalized);
        localStorage.setItem(TAG_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [normalizeTags]);

  // Persist to localStorage + debounced DB save
  const persistTags = useCallback((nextTags: TagConfig[]) => {
    localStorage.setItem(TAG_CONFIG_STORAGE_KEY, JSON.stringify(nextTags));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await upsertSetting(user.id, 'tags', nextTags);
      }
    }, 500);
  }, []);

  const addTag = useCallback((tag: TagConfig) => {
    setTags(prev => {
      if (prev.some(t => t.value === tag.value)) return prev;
      const next = [...prev, tag];
      persistTags(next);
      return next;
    });
  }, [persistTags]);

  const updateTag = useCallback((value: string, updated: Partial<TagConfig>) => {
    setTags(prev => {
      const next = prev.map(t => t.value === value ? { ...t, ...updated } : t);
      persistTags(next);
      return next;
    });
  }, [persistTags]);

  const removeTag = useCallback((value: string) => {
    setTags(prev => {
      const next = prev.filter(t => t.value !== value);
      persistTags(next);
      return next;
    });
  }, [persistTags]);

  const resetToDefaults = useCallback(() => {
    setTags(DEFAULT_TAGS);
    persistTags(DEFAULT_TAGS);
  }, [persistTags]);

  return (
    <TagConfigContext.Provider value={{ tags, presetColors: PRESET_COLORS, addTag, updateTag, removeTag, resetToDefaults, loading }}>
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
