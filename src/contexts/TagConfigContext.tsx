import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { getGlobalSetting, upsertSetting } from '@/services/settingsService';
import { supabase } from '@/integrations/supabase/client';

export interface TagConfig {
  value: string;
  label: string;
  className: string;
  showInClientColumns?: boolean;
}

const DEFAULT_LEAD_TAGS: TagConfig[] = [
  { value: 'sql', label: 'SQL', className: 'bg-success/20 text-success border-success/30', showInClientColumns: false },
  { value: 'mql', label: 'MQL', className: 'bg-info/20 text-info border-info/30', showInClientColumns: false },
  { value: 'cold', label: 'Frio', className: 'bg-muted text-muted-foreground border-border', showInClientColumns: false },
  { value: 'scheduled', label: 'Marcou', className: 'bg-accent/20 text-accent-foreground border-accent/30', showInClientColumns: false },
];

const DEFAULT_CLIENT_TAGS: TagConfig[] = [
  { value: 'premium', label: 'Premium', className: 'bg-success/20 text-success border-success/30', showInClientColumns: true },
  { value: 'intermediario', label: 'Intermediário', className: 'bg-info/20 text-info border-info/30', showInClientColumns: true },
  { value: 'basico', label: 'Básico', className: 'bg-warning/20 text-warning border-warning/30', showInClientColumns: true },
  { value: 'inativo', label: 'Inativo', className: 'bg-muted text-muted-foreground border-border', showInClientColumns: true },
];

const LEAD_TAG_CONFIG_STORAGE_KEY = 'crmLeadTagConfig';
const CLIENT_TAG_CONFIG_STORAGE_KEY = 'crmClientTagConfig';

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

function createTagConfigContext(options: {
  storageKey: string;
  settingsKey: 'tags' | 'client_tags';
  defaultTags: TagConfig[];
}) {
  return function TagConfigScopedProvider({ children }: { children: ReactNode }) {
    const normalizeTags = useCallback((sourceTags: TagConfig[]) => {
      return sourceTags.map((tag) => ({
        ...tag,
        showInClientColumns: tag.showInClientColumns !== false,
      }));
    }, []);

    const [tags, setTags] = useState<TagConfig[]>(() => {
      const stored = localStorage.getItem(options.storageKey);
      if (stored) {
        try { return normalizeTags(JSON.parse(stored)); } catch { /* fall through */ }
      }
      return options.defaultTags;
    });
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        const dbTags = await getGlobalSetting<TagConfig[]>(options.settingsKey);
        if (!cancelled && dbTags && Array.isArray(dbTags) && dbTags.length > 0) {
          const normalized = normalizeTags(dbTags);
          setTags(normalized);
          localStorage.setItem(options.storageKey, JSON.stringify(normalized));
        }
        if (!cancelled) setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [normalizeTags]);

    const persistTags = useCallback((nextTags: TagConfig[]) => {
      localStorage.setItem(options.storageKey, JSON.stringify(nextTags));

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await upsertSetting(user.id, options.settingsKey, nextTags);
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
      setTags(options.defaultTags);
      persistTags(options.defaultTags);
    }, [persistTags]);

    return (
      <TagConfigContext.Provider value={{ tags, presetColors: PRESET_COLORS, addTag, updateTag, removeTag, resetToDefaults, loading }}>
        {children}
      </TagConfigContext.Provider>
    );
  };
}

export const LeadTagConfigProvider = createTagConfigContext({
  storageKey: LEAD_TAG_CONFIG_STORAGE_KEY,
  settingsKey: 'tags',
  defaultTags: DEFAULT_LEAD_TAGS,
});

export const ClientTagConfigProvider = createTagConfigContext({
  storageKey: CLIENT_TAG_CONFIG_STORAGE_KEY,
  settingsKey: 'client_tags',
  defaultTags: DEFAULT_CLIENT_TAGS,
});

export function useTagConfig() {
  const context = useContext(TagConfigContext);
  if (!context) {
    throw new Error('useTagConfig must be used within a TagConfigProvider');
  }
  return context;
}
