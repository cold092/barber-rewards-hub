import { useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

const STATUS_OPTIONS: { value: ReferralStatus; label: string }[] = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'client', label: 'Cliente' },
  { value: 'converted', label: 'Convertido' },
];

export function EditLeadDialog({
  referral,
  open,
  onOpenChange,
  onUpdate,
  contactTagOptions
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
    const result = await updateReferral(referral.id, {
      lead_name: leadName.trim(),
      lead_phone: leadPhone.trim(),
      referrer_name: referrerName.trim(),
      notes: notes.trim() || null,
      status,
      is_client: status === 'client' || status === 'converted',
      converted_plan_id: status === 'converted' ? (convertedPlanId || null) : null,
      tags: localTags,
    });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nome</Label>
            <Input id="edit-name" value={leadName} onChange={e => setLeadName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Telefone</Label>
            <Input id="edit-phone" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-referrer">Indicado por</Label>
            <Input id="edit-referrer" value={referrerName} onChange={e => setReferrerName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as ReferralStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === 'converted' && (
            <div className="space-y-1.5">
              <Label>Plano convertido</Label>
              <Select value={convertedPlanId} onValueChange={setConvertedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(rewardPlans).map(([id, plan]) => (
                    <SelectItem key={id} value={id}>{plan.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
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
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                      isSelected
                        ? option.className + " ring-2 ring-primary/30 shadow-sm"
                        : "bg-secondary/40 text-muted-foreground border-border/40 hover:border-primary/30 hover:bg-secondary/60"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações sobre este lead..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
