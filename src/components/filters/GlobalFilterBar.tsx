import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, X, Filter, Users, ChevronDown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TagOption {
  value: string;
  label: string;
  className: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Novo', className: 'bg-info/20 text-info border-info/30' },
  { value: 'contacted', label: 'Contatado', className: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'converted', label: 'Convertido', className: 'bg-success/20 text-success border-success/30' },
];

interface CollaboratorOption {
  id: string;
  name: string;
}

interface GlobalFilterBarProps {
  tagOptions?: TagOption[];
}

export function GlobalFilterBar({ tagOptions = [] }: GlobalFilterBarProps) {
  const {
    activeTags, toggleTag,
    activeStatuses, toggleStatus,
    activeCollaborator, setActiveCollaborator,
    hasActiveFilters, clearAll,
  } = useGlobalFilter();

  const { isAdmin } = useAuth();
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([]);
  const [showCollaborators, setShowCollaborators] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, user_id');
      if (!profiles) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
      const teamOnly = profiles.filter(p => {
        const r = roleMap.get(p.user_id);
        return r === 'owner' || r === 'admin' || r === 'barber';
      });

      setCollaborators(teamOnly.map(p => ({ id: p.id, name: p.name })));
    })();
  }, [isAdmin]);

  const activeCount = activeTags.length + activeStatuses.length + (activeCollaborator ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-2 px-4 lg:px-8 py-2.5 bg-secondary/20 border-b border-border/20 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 mr-1">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span>
          {activeCount > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground rounded-full">
              {activeCount}
            </Badge>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/40" />

        {/* Status filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/60 font-medium uppercase mr-0.5">Status</span>
          {STATUS_OPTIONS.map(s => {
            const isActive = activeStatuses.includes(s.value);
            return (
              <Badge
                key={s.value}
                variant="outline"
                className={cn(
                  "text-[11px] cursor-pointer transition-all px-2 py-0.5",
                  isActive ? s.className : 'bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50'
                )}
                onClick={() => toggleStatus(s.value)}
              >
                {s.label}
              </Badge>
            );
          })}
        </div>

        {/* Divider */}
        {tagOptions.length > 0 && <div className="w-px h-5 bg-border/40" />}

        {/* Tag filters */}
        {tagOptions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase mr-0.5">Tags</span>
            {tagOptions.map(tag => {
              const isActive = activeTags.includes(tag.value);
              return (
                <Badge
                  key={tag.value}
                  variant="outline"
                  className={cn(
                    "text-[11px] cursor-pointer transition-all px-2 py-0.5",
                    isActive ? tag.className : 'bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50'
                  )}
                  onClick={() => toggleTag(tag.value)}
                >
                  {tag.label}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Collaborator filter (admin only) */}
        {isAdmin && collaborators.length > 0 && (
          <>
            <div className="w-px h-5 bg-border/40" />
            <Popover open={showCollaborators} onOpenChange={setShowCollaborators}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all",
                    activeCollaborator
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                  )}
                >
                  <Users className="h-3 w-3" />
                  {activeCollaborator
                    ? collaborators.find(c => c.id === activeCollaborator)?.name || 'Colaborador'
                    : 'Colaborador'}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", showCollaborators && "rotate-180")} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[200px] p-1 max-h-[260px] overflow-y-auto z-[60]"
              >
                <button
                  className={cn(
                    "w-full flex items-center justify-between text-left text-xs px-3 py-1.5 rounded-md transition-colors",
                    !activeCollaborator ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-foreground"
                  )}
                  onClick={() => { setActiveCollaborator(null); setShowCollaborators(false); }}
                >
                  <span>Todos</span>
                  {!activeCollaborator && <Check className="h-3 w-3" />}
                </button>
                {collaborators.map(c => (
                  <button
                    key={c.id}
                    className={cn(
                      "w-full flex items-center justify-between text-left text-xs px-3 py-1.5 rounded-md transition-colors",
                      activeCollaborator === c.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-foreground"
                    )}
                    onClick={() => { setActiveCollaborator(c.id); setShowCollaborators(false); }}
                  >
                    <span className="truncate">{c.name}</span>
                    {activeCollaborator === c.id && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <>
            <div className="w-px h-5 bg-border/40" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-destructive"
              onClick={clearAll}
            >
              <X className="h-3 w-3" />
              Limpar tudo
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
