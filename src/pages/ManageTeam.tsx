import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User,
  Users,
  Trash2,
  Shield,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole } from '@/types/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const newUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

interface TeamMember {
  profile: Profile;
  role: AppRole;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ManageTeam() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'barber'>('barber');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const rolePriority: Record<string, number> = { owner: 3, admin: 2, barber: 1, client: 0 };
      const members: TeamMember[] = (profiles || [])
        .map(profile => {
          const userRoles = roles?.filter(r => r.user_id === profile.user_id) || [];
          const bestRole = userRoles.sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0))[0];
          return {
            profile: profile as Profile,
            role: (bestRole?.role as AppRole) || 'client'
          };
        })
        .filter(m => m.role === 'barber' || m.role === 'admin' || m.role === 'owner');

      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Erro ao carregar equipe');
    }
    setLoadingTeam(false);
  };

  const handleCreateBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = newUserSchema.safeParse({ name, email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    
    try {
      const requestBody = { name, email, password, role: selectedRole };
      let data: any = null;
      let error: any = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await supabase.functions.invoke('add-team-member', {
          body: requestBody,
        });

        data = response.data;
        error = response.error;

        const transientFailure = Boolean(error);
        if (!transientFailure || attempt === 2) break;

        await wait(700);
      }

      if (error) {
        toast.error('Erro ao criar membro');
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      const roleLabel = selectedRole === 'owner' ? 'Admin' : 'Colaborador';
      toast.success(`${roleLabel} ${name} criado com sucesso!`);
      setName('');
      setEmail('');
      setPassword('');
      setSelectedRole('barber');
      
      setTimeout(() => loadTeamMembers(), 1000);
    } catch (error: any) {
      console.error('Error creating member:', error);
      toast.error(error.message || 'Erro ao criar membro');
    }
    
    setLoading(false);
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('remove-team-member', {
        body: { member_user_id: memberToDelete.profile.user_id },
      });

      if (error) {
        toast.error('Erro ao remover membro');
        console.error('Error:', error);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success('Membro removido com sucesso');
        loadTeamMembers();
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Erro ao remover membro');
    }
    
    setDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'owner': return 'Admin';
      case 'admin': return 'Administrador';
      case 'barber': return 'Colaborador';
      default: return 'Cliente';
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    if (role === 'owner' || role === 'admin') return 'default';
    return 'secondary';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Gerenciar <span className="gold-text">Equipe</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie os membros da equipe
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <UserPlus className="h-5 w-5 text-primary" />
                Novo Membro
              </CardTitle>
              <CardDescription>
                Crie login e senha para um novo membro da equipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBarber} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Nome do membro"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@membro.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Nível de Acesso</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'owner' | 'barber')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barber">Colaborador</SelectItem>
                      <SelectItem value="owner">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Admin tem acesso total. Colaborador gerencia seus próprios leads.
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gold-gradient gold-glow text-primary-foreground font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar Membro'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Users className="h-5 w-5 text-primary" />
                Equipe Cadastrada
              </CardTitle>
              <CardDescription>
                {teamMembers.length} membro(s) na equipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTeam ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum membro cadastrado
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div 
                      key={member.profile.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${member.role === 'admin' || member.role === 'owner' ? 'bg-primary/20' : 'bg-muted'}
                        `}>
                          {member.role === 'admin' || member.role === 'owner' ? (
                            <Shield className="h-5 w-5 text-primary" />
                          ) : (
                            <Briefcase className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{member.profile.name}</p>
                          <Badge variant={getRoleBadgeVariant(member.role)} className="mt-0.5 text-[10px]">
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-primary font-medium">
                          {member.profile.lifetime_points} pts
                        </span>
                        {member.role !== 'admin' && member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setMemberToDelete(member);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary-foreground">💡</span>
              </div>
              <div>
                <h3 className="font-semibold">Como funciona?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  1. Crie login/senha para cada membro<br />
                  2. Escolha o nível de acesso: Admin ou Colaborador<br />
                  3. O membro acessa com seu email e senha<br />
                  4. Admins veem tudo, Colaboradores gerenciam seus leads
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {memberToDelete?.profile.name} da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
