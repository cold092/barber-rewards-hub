import { useViewAs } from '@/contexts/ViewAsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Eye, X, Crown, Shield, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/types/database';

export function ViewAsSelector({ collapsed = false }: { collapsed?: boolean }) {
  const { isAdmin } = useAuth();
  const { teamMembers, viewAsProfile, setViewAs, clearViewAs, isViewingAs } = useViewAs();

  if (!isAdmin || teamMembers.length === 0) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-3 w-3 text-amber-400" />;
      case 'admin': return <Shield className="h-3 w-3 text-blue-400" />;
      default: return <Briefcase className="h-3 w-3 text-muted-foreground/60" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Dono';
      case 'admin': return 'Admin';
      case 'barber': return 'Colaborador';
      default: return role;
    }
  };

  if (collapsed) return null;

  return (
    <div className="space-y-2">
      {isViewingAs && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Eye className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-400 font-medium truncate flex-1">
            Visualizando como {viewAsProfile?.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 hover:bg-amber-500/20"
            onClick={clearViewAs}
          >
            <X className="h-3 w-3 text-amber-400" />
          </Button>
        </div>
      )}
      <Select
        value={viewAsProfile?.id ?? '__self__'}
        onValueChange={(value) => {
          if (value === '__self__') {
            clearViewAs();
            return;
          }
          const member = teamMembers.find(m => m.profile.id === value);
          if (member) {
            setViewAs(member.profile, member.role);
          }
        }}
      >
        <SelectTrigger className={cn(
          "h-9 text-xs bg-sidebar-accent/40 border-sidebar-border/30",
          isViewingAs && "border-amber-500/30 ring-1 ring-amber-500/20"
        )}>
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <SelectValue placeholder="Visualizar como..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__self__">
            <span className="font-medium">Minha visão</span>
          </SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.profile.id} value={member.profile.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                    {getInitials(member.profile.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.profile.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {getRoleIcon(member.role)}
                  {getRoleLabel(member.role)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
