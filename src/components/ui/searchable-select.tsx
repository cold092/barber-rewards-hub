import { useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado.',
  loading = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal bg-secondary/10 border-border/20 rounded-xl h-11 text-sm hover:bg-secondary/20 px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          {loading ? (
            <span className="text-muted-foreground text-xs">Carregando...</span>
          ) : selected ? (
            <span className="flex items-center gap-2 truncate min-w-0">
              {selected.icon}
              <span className="truncate text-foreground">{selected.label}</span>
              {selected.sublabel && (
                <span className="text-muted-foreground/50 text-[11px] truncate hidden sm:inline">
                  {selected.sublabel}
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm">{placeholder}</span>
          )}
          <ChevronDown className={cn(
            "ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 rounded-xl border-border/30 shadow-xl shadow-black/10 overflow-hidden"
        align="start"
        sideOffset={4}
      >
        <Command className="rounded-xl">
          <div className="flex items-center border-b border-border/15 px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-10 text-sm border-0 focus:ring-0 placeholder:text-muted-foreground/40"
            />
          </div>
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground/60">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.sublabel || ''}`}
                  onSelect={() => {
                    onValueChange(option.value === value ? '' : option.value);
                    setOpen(false);
                  }}
                  className="rounded-lg px-2.5 py-2 text-sm cursor-pointer"
                >
                  <Check className={cn(
                    "mr-1.5 h-3.5 w-3.5 shrink-0 transition-opacity",
                    value === option.value ? "opacity-100 text-primary" : "opacity-0"
                  )} />
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-muted-foreground/50 text-[11px] truncate">
                        {option.sublabel}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
