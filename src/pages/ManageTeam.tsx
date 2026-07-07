import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Lock, User, Users, Trash2, Shield, Briefcase, Crown, Sparkles, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ManageTeam() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'barber'>('barber');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [credsDialogOpen, setCredsDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);

  useEffect(() => { loadTeamMembers(); }, []);

  const loadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').order('name');
      if (profilesError) throw profilesError;
      const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
      if (rolesError) throw rolesError;

      const rolePriority: Record<string, number> = { owner: 3, admin: 2, barber: 1, client: 0 };
      const members: TeamMember[] = (profiles || [])
        .map(profile => {
          const userRoles = roles?.filter(r => r.user_id === profile.user_id) || [];
          const bestRole = userRoles.sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0))[0];
          return { profile: profile as Profile, role: (bestRole?.role as AppRole) || 'client' };
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
    if (!validation.success) { toast.error(validation.error.errors[0].message); return; }
    setLoading(true);
    try {
      const requestBody = { name, email, password, role: selectedRole };
      let data: any = null;
      let error: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await supabase.functions.invoke('add-team-member', { body: requestBody });
        data = response.data;
        error = response.error;
        if (!error || attempt === 2) break;
        await wait(700);
      }
      if (error) { toast.error('Erro ao criar membro'); setLoading(false); return; }
      if (data?.error) { toast.error(data.error); setLoading(false); return; }
      const roleLabel = selectedRole === 'admin' ? 'Admin' : 'Colaborador';
      toast.success(`${roleLabel} ${name} criado com sucesso!`);
      setName(''); setEmail(''); setPassword(''); setSelectedRole('barber');
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
      const { data, error } = await supabase.functions.invoke('remove-team-member', { body: { member_user_id: memberToDelete.profile.user_id } });
      if (error) { toast.error('Erro ao remover membro'); } else if (data?.error) { toast.error(data.error); } else { toast.success('Membro removido com sucesso'); loadTeamMembers(); }
    } catch (error) { console.error('Error deleting member:', error); toast.error('Erro ao remover membro'); }
    setDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  const openCredsDialog = (member: TeamMember) => {
    setMemberToEdit(member);
    setEditEmail('');
    setEditPassword('');
    setCredsDialogOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!memberToEdit) return;
    const emailVal = editEmail.trim();
    const passVal = editPassword;
    if (!emailVal && !passVal) {
      toast.error('Informe email ou senha para atualizar');
      return;
    }
    if (emailVal && !/^\S+@\S+\.\S+$/.test(emailVal)) {
      toast.error('Email inválido');
      return;
    }
    if (passVal && passVal.length < 8) {
      toast.error('A senha precisa ter ao menos 8 caracteres');
      return;
    }
    setSavingCreds(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-team-member-credentials', {
        body: {
          member_user_id: memberToEdit.profile.user_id,
          email: emailVal || undefined,
          password: passVal || undefined,
        },
      });
      if (error) {
        toast.error('Erro ao atualizar credenciais');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success('Credenciais atualizadas com sucesso');
        setCredsDialogOpen(false);
        setMemberToEdit(null);
        setEditEmail('');
        setEditPassword('');
      }
    } catch (err: any) {
      console.error('Error updating credentials:', err);
      toast.error(err.message || 'Erro ao atualizar credenciais');
    }
    setSavingCreds(false);
  };


  if (!authLoading && !isAdmin) return <Navigate to="/" replace />;

  const getRoleLabel = (role: AppRole) => {
    switch (role) { case 'owner': return 'Dono'; case 'admin': return 'Admin'; case 'barber': return 'Colaborador'; default: return 'Cliente'; }
  };
  const getRoleBadgeClass = (role: AppRole) => {
    if (role === 'owner') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (role === 'admin') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-secondary/30 text-muted-foreground border-border/30';
  };
  const getRoleIcon = (role: AppRole) => {
    if (role === 'owner') return <Crown className="h-4 w-4 text-amber-400" />;
    if (role === 'admin') return <Shield className="h-4 w-4 text-blue-400" />;
    return <Briefcase className="h-4 w-4 text-muted-foreground" />;
  };
  const getRoleAvatarClass = (role: AppRole) => {
    if (role === 'owner') return 'bg-amber-500/15 border-amber-500/30';
    if (role === 'admin') return 'bg-blue-500/15 border-blue-500/30';
    return 'bg-secondary/20 border-border/20';
  };

  const inputClass = "bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-10 text-sm";
  const selectClass = "bg-secondary/10 border-border/20 rounded-xl h-10 text-sm";
  const labelClass = "text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5";

  return (
    <DashboardLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
        {/* Header */}
        <motion.div variants={fadeUp}>
          <PageHeader
            icon={Users}
            title="Gerenciar Equipe"
            subtitle="Cadastre e gerencie os membros da equipe"
          />
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* New Member Card */}
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-border/30 overflow-hidden h-full">
              <div className="px-6 pt-6 pb-4 border-b border-border/15 bg-gradient-to-b from-primary/[0.04] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl lavender-gradient shadow-lg shadow-primary/20">
                    <UserPlus className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-base">Novo Membro</h2>
                    <p className="text-xs text-muted-foreground/70">Crie login e senha para a equipe</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <form onSubmit={handleCreateBarber} className="space-y-5">
                  <div className="space-y-2">
                    <Label className={labelClass}><User className="h-3 w-3" /> Nome</Label>
                    <Input placeholder="Nome do membro" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}><Mail className="h-3 w-3" /> Email</Label>
                    <Input type="email" placeholder="email@membro.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}><Lock className="h-3 w-3" /> Senha</Label>
                    <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Nível de Acesso</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'barber')}>
                      <SelectTrigger className={selectClass}><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="barber">Colaborador</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground/60">Admin tem acesso total. Colaborador gerencia seus próprios leads.</p>
                  </div>
                  <Button type="submit" className="w-full h-10 rounded-xl lavender-gradient text-primary-foreground font-semibold shadow-lg shadow-primary/20 text-sm" disabled={loading}>
                    {loading ? 'Criando...' : 'Criar Membro'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team List Card */}
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-border/30 overflow-hidden h-full">
              <div className="px-6 pt-6 pb-4 border-b border-border/15 bg-gradient-to-b from-primary/[0.04] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-base">Equipe Cadastrada</h2>
                    <p className="text-xs text-muted-foreground/70">{teamMembers.length} membro(s) na equipe</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                {loadingTeam ? (
                  <div className="text-center py-10 text-muted-foreground/50 text-sm">Carregando...</div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground/50 text-sm">Nenhum membro cadastrado</div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member, i) => (
                      <motion.div
                        key={member.profile.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/10 border border-border/10 hover:bg-secondary/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", getRoleAvatarClass(member.role))}>
                            {getRoleIcon(member.role)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.profile.name}</p>
                            <Badge variant="outline" className={cn("mt-0.5 text-[10px] font-semibold", getRoleBadgeClass(member.role))}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-primary font-semibold tabular-nums mr-1">{member.profile.lifetime_points} pts</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openCredsDialog(member)}
                            title="Alterar email/senha"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {member.role !== 'admin' && member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => { setMemberToDelete(member); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Info Card */}
        <motion.div variants={fadeUp}>
          <Card className="glass-card border-primary/10 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-semibold text-sm">Como funciona?</h3>
                  <div className="text-xs text-muted-foreground/80 space-y-1 leading-relaxed">
                    <p>• Crie login/senha para cada membro</p>
                    <p>• Escolha o nível: <span className="text-blue-400 font-medium">Admin</span> ou <span className="text-muted-foreground font-medium">Colaborador</span></p>
                    <p>• O membro acessa com seu email e senha</p>
                    <p>• Admins veem tudo, Colaboradores gerenciam seus leads</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {memberToDelete?.profile.name} da equipe? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={credsDialogOpen} onOpenChange={setCredsDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Alterar credenciais
            </DialogTitle>
            <DialogDescription>
              {memberToEdit
                ? `Atualize o email e/ou a senha de ${memberToEdit.profile.name}. Deixe em branco o que não quiser mudar.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={labelClass}><Mail className="h-3 w-3" /> Novo email</Label>
              <Input
                type="email"
                placeholder="novo@email.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label className={labelClass}><Lock className="h-3 w-3" /> Nova senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              A alteração é imediata. Informe as novas credenciais ao membro após salvar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCredsDialogOpen(false)} disabled={savingCreds} className="rounded-lg">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCredentials}
              disabled={savingCreds || (!editEmail.trim() && !editPassword)}
              className="rounded-lg lavender-gradient text-primary-foreground"
            >
              {savingCreds ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
