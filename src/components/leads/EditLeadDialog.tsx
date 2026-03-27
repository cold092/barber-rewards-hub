import { useState } from 'react';
import { Pencil, Save, X, User, Phone, UserCheck, FileText, Tag, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { updateReferral } from '@/services/referralService';
import { getRewardPlans } from '@/config/plans';
import type { Referral, ReferralStatus } from '@/types/database';

interface EditLeadDialogProps {
  referral: Referral;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  contactTagOptions: Array<{ value: string; label: string; className: string }>;
  userId?: string;
  userName?: string;
}

const STATUS_OPTIONS: { value: ReferralStatus; label: string; color: string }[] = [
  { value: 'new', label: 'Novo', color: 'bg-info/20 text-info border-info/30' },
  { value: 'contacted', label: 'Contatado', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'client', label: 'Cliente', color: 'bg-success/15 text-success border-success/30' },
  { value: 'converted', label: 'Convertido', color: 'bg-success/20 text-success border-success/30' },
];

export function EditLeadDialog({
  referral,
  open,
  onOpenChange,
  onUpdate,
  contactTagOptions,
  userId,
  userName
}: EditLeadDialogProps) {
  const [saving, setSaving] = useState(false);
  const [leadName, setLeadName] = useState(referral.lead_name);
  const [leadPhone, setLeadPhone] = useState(referral.lead_phone);
  const [referrerName, setReferrerName] = useState(referral.referrer_name);
  const [notes, setNotes] = useState(referral.notes || '');
  const [status, setStatus] = useState<ReferralStatus>(referral.status);
  const [convertedPlanId, setConvertedPlanId] = useState(referral.converted_plan_id || '');
  const [localTags, setLocalTags] = useState<string[]>(referral.tags || []);

  const rewardPlans = getRewardPlans();

  const handleSave = async () => {
    if (!leadName.trim() || !leadPhone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    setSaving(true);
    const updates = {
      lead_name: leadName.trim(),
      lead_phone: leadPhone.trim(),
      referrer_name: referrerName.trim(),
      notes: notes.trim() || null,
      status,
      is_client: status === 'client' || status === 'converted',
      converted_plan_id: status === 'converted' ? (convertedPlanId || null) : null,
      tags: localTags,
    };
    const previousData = {
      lead_name: referral.lead_name,
      lead_phone: referral.lead_phone,
      referrer_name: referral.referrer_name,
      notes: referral.notes,
      status: referral.status,
      tags: referral.tags,
      converted_plan_id: referral.converted_plan_id,
    };
    const result = await updateReferral(referral.id, updates, { userId, userName, previousData });
    setSaving(false);

    if (result.success) {
      toast.success('Lead atualizado com sucesso');
      onUpdate();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Erro ao atualizar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20 bg-gradient-to-b from-primary/[0.04] to-transparent">
          <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
            <div className="p-2 rounded-xl lavender-gradient shadow-md shadow-primary/20">
              <Pencil className="h-4 w-4 text-primary-foreground" />
            </div>
            Editar Lead
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Altere as informações deste lead
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]"
        >
          {/* Name & Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <User className="h-3 w-3" /> Nome
              </Label>
              <Input
                value={leadName}
                onChange={e => setLeadName(e.target.value)}
                className="bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Telefone
              </Label>
              <Input
                value={leadPhone}
                onChange={e => setLeadPhone(e.target.value)}
                className="bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-9 text-sm"
              />
            </div>
          </div>

          {/* Referrer */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <UserCheck className="h-3 w-3" /> Indicado por
            </Label>
            <Input
              value={referrerName}
              onChange={e => setReferrerName(e.target.value)}
              className="bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-9 text-sm"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as ReferralStatus)}>
              <SelectTrigger className="bg-secondary/10 border-border/20 rounded-xl h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan (conditional) */}
          {status === 'converted' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard className="h-3 w-3" /> Plano convertido
              </Label>
              <Select value={convertedPlanId} onValueChange={setConvertedPlanId}>
                <SelectTrigger className="bg-secondary/10 border-border/20 rounded-xl h-9 text-sm">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(rewardPlans).map(([id, plan]) => (
                    <SelectItem key={id} value={id}>{plan.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}

          {/* Tags */}
          <div className="space-y-2.5">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Etiquetas
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {contactTagOptions.map(option => {
                const isSelected = localTags.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setLocalTags(prev =>
                        isSelected ? prev.filter(t => t !== option.value) : [...prev, option.value]
                      );
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200",
                      isSelected
                        ? option.className + " ring-1 ring-primary/20 shadow-sm scale-[1.02]"
                        : "bg-secondary/20 text-muted-foreground/60 border-border/20 hover:border-primary/30 hover:bg-secondary/40"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Observações
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações sobre este lead..."
              className="min-h-[80px] bg-secondary/10 border-border/20 resize-none text-sm rounded-xl focus:border-primary/40"
            />
          </div>
        </motion.div>

        <DialogFooter className="px-6 py-4 border-t border-border/15 gap-2 bg-card/50">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg border-border/30 text-xs h-9 px-4">
            <X className="h-3.5 w-3.5 mr-1.5" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-lg lavender-gradient text-primary-foreground font-medium text-xs h-9 px-5 shadow-md shadow-primary/20">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
