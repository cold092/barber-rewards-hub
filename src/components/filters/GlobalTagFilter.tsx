import { Tag, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTagFilter } from '@/contexts/TagFilterContext';

interface TagOption {
  value: string;
  label: string;
  className: string;
}

interface GlobalTagFilterProps {
  tagOptions: TagOption[];
}

export function GlobalTagFilter({ tagOptions }: GlobalTagFilterProps) {
  const { activeTags, toggleTag, clearTags } = useTagFilter();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {tagOptions.map(tag => {
        const isActive = activeTags.includes(tag.value);
        return (
          <Badge
            key={tag.value}
            variant="outline"
            className={cn(
              "text-xs cursor-pointer transition-all",
              isActive
                ? tag.className
                : 'bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50'
            )}
            onClick={() => toggleTag(tag.value)}
          >
            {tag.label}
          </Badge>
        );
      })}
      {activeTags.length > 0 && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={clearTags}>
          <X className="h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
