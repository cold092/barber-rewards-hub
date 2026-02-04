import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User,
  Users,
  Trash2,
  Shield,
  Scissors
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

export default function ManageTeam() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  
  // New barber form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const members: TeamMember[] = (profiles || [])
        .map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.user_id);
          return {
            profile: profile as Profile,
            role: (userRole?.role as AppRole) || 'client'
          };
        })
        .filter(m => m.role === 'barber' || m.role === 'admin');

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
      const { data: currentSessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const currentSession = currentSessionData.session;

      // Create the user using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name, role: 'barber' }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          throw authError;
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error('Usuário não criado');
      }

      if (!currentSession) {
        toast.error('Sessão do admin expirada. Faça login novamente.');
        setLoading(false);
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });

      if (signOutError) {
        console.error('Error clearing barber session:', signOutError);
      }

      const { error: restoreError } = await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token
      });

      if (restoreError) {
        console.error('Error restoring admin session:', restoreError);
        toast.error('Erro ao restaurar sessão do admin');
        setLoading(false);
        return;
      }

      // Assign barber role via direct insert
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'barber' as AppRole
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        toast.error('Erro ao atribuir perfil de barbeiro');
        setLoading(false);
        return;
      }

      toast.success(`Barbeiro ${name} criado com sucesso!`);
      
      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      
      // Reload team list
      setTimeout(() => loadTeamMembers(), 1000);
      
    } catch (error: any) {
      console.error('Error creating barber:', error);
      toast.error(error.message || 'Erro ao criar barbeiro');
    }
    
    setLoading(false);
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      // Note: We can only delete the profile and role, not the auth user
      // The auth user would need admin SDK or be done through Supabase dashboard
      
      if (memberToDelete.profile.user_id) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', memberToDelete.profile.user_id);
      }
      
      await supabase
        .from('profiles')
        .delete()
        .eq('id', memberToDelete.profile.id);
      
      toast.success('Membro removido');
      loadTeamMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Erro ao remover membro');
    }
    
    setDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  // Only admin can access this page
  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Gerenciar <span className="gold-text">Equipe</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie os barbeiros da equipe
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create new barber */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <UserPlus className="h-5 w-5 text-primary" />
                Novo Barbeiro
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
                      placeholder="Nome do barbeiro"
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
                      placeholder="email@barbeiro.com"
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
                
                <Button 
                  type="submit" 
                  className="w-full gold-gradient gold-glow text-primary-foreground font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar Barbeiro'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Team list */}
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
                          ${member.role === 'admin' ? 'bg-primary/20' : 'bg-muted'}
                        `}>
                          {member.role === 'admin' ? (
                            <Shield className="h-5 w-5 text-primary" />
                          ) : (
                            <Scissors className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{member.profile.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {member.role === 'admin' ? 'Administrador' : 'Barbeiro'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-primary font-medium">
                          {member.profile.lifetime_points} pts
                        </span>
                        {member.role !== 'admin' && (
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

        {/* Info card */}
        <Card className="glass-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary-foreground">💡</span>
              </div>
              <div>
                <h3 className="font-semibold">Como funciona?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  1. Crie login/senha para cada barbeiro<br />
                  2. O barbeiro acessa com seu email e senha<br />
                  3. Cada barbeiro cadastra seus próprios leads<br />
                  4. Você (Admin) vê todos os leads e converte as vendas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
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
