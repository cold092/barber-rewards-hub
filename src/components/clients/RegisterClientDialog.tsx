import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, User, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { registerClient } from '@/services/referralService';
import { addHistoryEvent } from '@/services/leadHistoryService';

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  phone: z.string().min(8, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
});

interface RegisterClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
}

export function RegisterClientDialog({ open, onOpenChange, onClientCreated }: RegisterClientDialogProps) {
  const { profile, role, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = clientSchema.safeParse({ name, phone, email: email || undefined, notes });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!profile) {
      toast.error('Perfil não encontrado. Faça login novamente.');
      return;
    }

    setLoading(true);
    const createdBy = role ? { id: profile.id, name: profile.name, role } : undefined;
    const result = await registerClient(
      profile.id,
      profile.name,
      {
        clientName: name.trim(),
        clientPhone: phone.trim(),
      },
      createdBy
    );
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || 'Erro ao cadastrar cliente');
      return;
    }

    if (result.referralId) {
      await addHistoryEvent({
        referralId: result.referralId,
        eventType: 'created',
        eventData: {
          client_name: name.trim(),
          client_phone: phone.trim(),
          registered_as_client: true,
        },
        createdById: user?.id,
        createdByName: profile?.name,
      });
    }

    toast.success(`${name} cadastrado no programa de indicações!`);
    resetForm();
    onOpenChange(false);
    onClientCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
            <div className="p-1.5 rounded-lg bg-success/15">
              <UserPlus className="h-4 w-4 text-success" />
            </div>
            Cadastrar Cliente no Programa
          </DialogTitle>
          <DialogDescription className="text-sm">
            Insira o cliente diretamente no programa de recompensas, sem passar pelo funil de leads.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name" className="text-xs uppercase tracking-wide text-muted-foreground">Nome</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
              <Input id="client-name" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 bg-background/50" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone" className="text-xs uppercase tracking-wide text-muted-foreground">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
              <Input id="client-phone" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 bg-background/50" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email" className="text-xs uppercase tracking-wide text-muted-foreground">Email (opcional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
              <Input id="client-email" type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-background/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-notes" className="text-xs uppercase tracking-wide text-muted-foreground">Observações (opcional)</Label>
            <Textarea id="client-notes" placeholder="Alguma observação sobre o cliente..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="bg-background/50 resize-none" />
          </div>
          <DialogFooter className="pt-2 border-t border-border/30">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="lavender-gradient text-primary-foreground font-medium" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
