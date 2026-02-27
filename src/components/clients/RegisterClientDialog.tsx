import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, User, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

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
  const { profile } = useAuth();
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

    if (!profile?.organization_id) {
      toast.error('Organização não encontrada. Faça login novamente.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('clients').insert({
      organization_id: profile.organization_id,
      name,
      phone,
      email: email || null,
      notes: notes || null,
      created_by: profile.user_id,
    });
    setLoading(false);

    if (error) {
      console.error('Error creating client:', error);
      toast.error('Erro ao cadastrar cliente');
      return;
    }

    toast.success(`${name} cadastrado no programa de indicações!`);
    resetForm();
    onOpenChange(false);
    onClientCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <UserPlus className="h-5 w-5 text-success" />
            Cadastrar Cliente no Programa
          </DialogTitle>
          <DialogDescription>
            Insira o cliente diretamente no programa de recompensas, sem passar pelo funil de leads.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="client-name" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="client-phone" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email (opcional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="client-email" type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-notes">Observações (opcional)</Label>
            <Textarea id="client-notes" placeholder="Alguma observação sobre o cliente..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="gold-gradient gold-glow text-primary-foreground" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
