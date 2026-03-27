import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, User, Phone, Mail, FileText, X } from 'lucide-react';
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
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20 bg-gradient-to-b from-success/[0.04] to-transparent">
          <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
            <div className="p-2 rounded-xl bg-success/15 shadow-md shadow-success/10">
              <UserPlus className="h-4 w-4 text-success" />
            </div>
            Cadastrar Cliente
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Insira o cliente diretamente no programa de recompensas
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-6 py-5 space-y-5"
          >
            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Nome
                </Label>
                <Input
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Telefone
                </Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-9 text-sm"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Email <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
              </Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-9 text-sm"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Observações <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
              </Label>
              <Textarea
                placeholder="Alguma observação sobre o cliente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-secondary/10 border-border/20 resize-none text-sm rounded-xl focus:border-primary/40"
              />
            </div>
          </motion.div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border/15 gap-2 bg-card/50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg border-border/30 text-xs h-9 px-4">
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancelar
            </Button>
            <Button type="submit" className="rounded-lg lavender-gradient text-primary-foreground font-medium text-xs h-9 px-5 shadow-md shadow-primary/20" disabled={loading}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
