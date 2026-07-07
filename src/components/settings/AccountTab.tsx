import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, KeyRound, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function AccountTab() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateEmail = async () => {
    const email = newEmail.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Informe um email válido');
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/` }
    );
    setSavingEmail(false);
    if (error) {
      toast.error(error.message || 'Falha ao atualizar email');
      return;
    }
    toast.success('Enviamos um link de confirmação para o novo email. A troca só se conclui após clicar nesse link.');
    setNewEmail('');
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('A senha precisa ter ao menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message || 'Falha ao atualizar senha');
      return;
    }
    toast.success('Senha atualizada com sucesso');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Current account */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <ShieldAlert className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Sua conta</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alterações aqui afetam apenas o usuário atualmente logado.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Email atual</p>
            <p className="text-sm font-medium mt-1 break-all">{user?.email ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Change email */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Alterar email</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Um link de confirmação será enviado para o novo endereço.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Novo email</label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="novo@email.com"
              className="h-10 bg-background/40 border-border/30 focus:border-primary/40"
            />
          </div>
        </div>
        <div className="px-6 py-3.5 border-t border-border/20 bg-secondary/10 flex justify-end">
          <Button
            className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity"
            onClick={handleUpdateEmail}
            disabled={savingEmail || !newEmail}
          >
            <Save className="h-4 w-4" />
            {savingEmail ? 'Enviando...' : 'Atualizar email'}
          </Button>
        </div>
      </div>

      {/* Change password */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <KeyRound className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Alterar senha</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mínimo de 8 caracteres. A alteração é imediata.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nova senha</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 bg-background/40 border-border/30 focus:border-primary/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmar nova senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 bg-background/40 border-border/30 focus:border-primary/40"
            />
          </div>
        </div>
        <div className="px-6 py-3.5 border-t border-border/20 bg-secondary/10 flex justify-end">
          <Button
            className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity"
            onClick={handleUpdatePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
          >
            <Save className="h-4 w-4" />
            {savingPassword ? 'Salvando...' : 'Atualizar senha'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
