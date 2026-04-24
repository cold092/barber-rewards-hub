import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { UserPlus, Phone, User, Users, Link, Sparkles, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { registerLead, getAllBarbers, getAllLeadsAsReferrers, registerLeadByLead, getBarberLeadsAsReferrers, checkDuplicatePhone } from '@/services/referralService';
import { BARBER_REFERRAL_CONVERSION_PERCENT, REFERRAL_BONUS_POINTS } from '@/config/plans';
import { isValidPhone } from '@/utils/whatsapp';
import type { Profile } from '@/types/database';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().refine(isValidPhone, 'Telefone inválido'),
});

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function RegisterLead() {
  const navigate = useNavigate();
  const { profile, isAdmin, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referrers, setReferrers] = useState<Profile[]>([]);
  const [leadReferrers, setLeadReferrers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [barberClients, setBarberClients] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(true);
  const [selectedReferrerId, setSelectedReferrerId] = useState('');
  const [selectedLeadReferrerId, setSelectedLeadReferrerId] = useState('');
  const [selectedBarberClientId, setSelectedBarberClientId] = useState('');
  const [referrerType, setReferrerType] = useState<'user' | 'lead'>('user');
  const [barberReferrerType, setBarberReferrerType] = useState<'self' | 'client'>('self');

  useEffect(() => {
    async function load() {
      setLoadingReferrers(true);
      if (isAdmin) {
        const [barbersResult, leadsResult] = await Promise.all([
          getAllBarbers(),
          getAllLeadsAsReferrers()
        ]);
        setReferrers(barbersResult.data);
        setLeadReferrers(leadsResult.data);
      } else if (profile) {
        const clientsResult = await getBarberLeadsAsReferrers(profile.id);
        setBarberClients(clientsResult.data);
      }
      setLoadingReferrers(false);
    }
    load();
  }, [profile, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = schema.safeParse({ name, phone });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    if (!profile) { toast.error('Perfil não encontrado'); return; }

    setLoading(true);

    // Check for duplicate phone
    const duplicate = await checkDuplicatePhone(phone.trim());
    if (duplicate.exists) {
      toast.error(`Este número já está cadastrado como ${duplicate.type}: ${duplicate.name}`);
      setLoading(false);
      return;
    }

    const createdBy = role && profile ? { id: profile.id, name: profile.name, role } : undefined;

    // Admin + lead referrer
    if (isAdmin && referrerType === 'lead') {
      if (!selectedLeadReferrerId) { toast.error('Selecione o cliente que está indicando'); setLoading(false); return; }
      if (!selectedReferrerId) { toast.error('Selecione o colaborador responsável'); setLoading(false); return; }
      const barber = referrers.find(r => r.id === selectedReferrerId);
      if (!barber) { toast.error('Colaborador não encontrado'); setLoading(false); return; }
      const leadRef = leadReferrers.find(l => l.id === selectedLeadReferrerId);
      const result = await registerLeadByLead(barber.id, barber.name, selectedLeadReferrerId, { leadName: name.trim(), leadPhone: phone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success(`Lead registrado! ${leadRef?.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); }
      else { toast.error(result.error || 'Erro ao registrar lead'); }
      return;
    }

    // Admin + user referrer
    if (isAdmin && referrerType === 'user') {
      if (!selectedReferrerId) { toast.error('Selecione o colaborador responsável'); setLoading(false); return; }
      const referrer = referrers.find(r => r.id === selectedReferrerId);
      if (!referrer) { toast.error('Colaborador não encontrado'); setLoading(false); return; }
      const result = await registerLead(selectedReferrerId, referrer.name, { leadName: name.trim(), leadPhone: phone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success(`Lead registrado! ${referrer.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); }
      else { toast.error(result.error || 'Erro ao registrar lead'); }
      return;
    }

    // Barber + client referrer
    if (!isAdmin && barberReferrerType === 'client') {
      if (!selectedBarberClientId) { toast.error('Selecione o cliente que está indicando'); setLoading(false); return; }
      const clientRef = barberClients.find(c => c.id === selectedBarberClientId);
      const result = await registerLeadByLead(profile.id, profile.name, selectedBarberClientId, { leadName: name.trim(), leadPhone: phone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success(`Lead registrado! ${clientRef?.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); }
      else { toast.error(result.error || 'Erro ao registrar lead'); }
      return;
    }

    // Barber self
    const result = await registerLead(profile.id, profile.name, { leadName: name.trim(), leadPhone: phone.trim() }, createdBy);
    setLoading(false);
    if (result.success) { toast.success(`Lead registrado! Você ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); }
    else { toast.error(result.error || 'Erro ao registrar lead'); }
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const inputClass = "bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-11 text-sm";
  const selectClass = "bg-secondary/10 border-border/20 rounded-xl h-11 text-sm";
  const labelClass = "text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5";

  const isDisabled = loading ||
    (isAdmin && referrerType === 'user' && (loadingReferrers || !selectedReferrerId)) ||
    (isAdmin && referrerType === 'lead' && (loadingReferrers || !selectedLeadReferrerId || !selectedReferrerId)) ||
    (!isAdmin && barberReferrerType === 'client' && (loadingReferrers || !selectedBarberClientId));

  return (
    <DashboardLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <PageHeader
            icon={UserPlus}
            title="Novo Lead"
            subtitle="Registre uma nova indicação e ganhe pontos"
          />
        </motion.div>

        {/* Points badge */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">+{REFERRAL_BONUS_POINTS} pontos por indicação</span>
            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div variants={fadeUp}>
          <Card className="glass-card border-primary/15 overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 lavender-gradient" />

            <CardContent className="p-6 pt-5">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Admin referrer selection */}
                {isAdmin && (
                  <motion.div variants={fadeUp} className="space-y-3">
                    <Label className={labelClass}>Indicado por</Label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/20 border border-border/15">
                      <button type="button" onClick={() => setReferrerType('user')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        referrerType === 'user' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <Users className="h-4 w-4" /> Colaborador
                      </button>
                      <button type="button" onClick={() => setReferrerType('lead')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        referrerType === 'lead' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <Link className="h-4 w-4" /> Cliente existente
                      </button>
                    </div>

                    {referrerType === 'user' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Colaborador responsável por este lead</Label>
                        <SearchableSelect
                          options={referrers.map(r => ({ value: r.id, label: r.name, icon: <Users className="h-4 w-4 text-muted-foreground" /> }))}
                          value={selectedReferrerId}
                          onValueChange={setSelectedReferrerId}
                          placeholder="Selecionar colaborador"
                          searchPlaceholder="Buscar colaborador..."
                          emptyMessage="Nenhum colaborador encontrado"
                          loading={loadingReferrers}
                        />
                      </div>
                    )}

                    {referrerType === 'lead' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Selecione o cliente que trouxe este lead</Label>
                          <SearchableSelect
                            options={leadReferrers.map(l => ({ value: l.id, label: l.name, sublabel: l.phone, icon: <User className="h-4 w-4 text-muted-foreground" /> }))}
                            value={selectedLeadReferrerId}
                            onValueChange={setSelectedLeadReferrerId}
                            placeholder="Selecionar cliente indicador"
                            searchPlaceholder="Buscar por nome ou telefone..."
                            emptyMessage="Nenhum cliente cadastrado ainda"
                            loading={loadingReferrers}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Colaborador que vai atender este lead</Label>
                          <SearchableSelect
                            options={referrers.map(r => ({ value: r.id, label: r.name, icon: <Users className="h-4 w-4 text-muted-foreground" /> }))}
                            value={selectedReferrerId}
                            onValueChange={setSelectedReferrerId}
                            placeholder="Selecionar colaborador responsável"
                            searchPlaceholder="Buscar colaborador..."
                            emptyMessage="Nenhum colaborador encontrado"
                            loading={loadingReferrers}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Barber referrer selection */}
                {!isAdmin && profile && (
                  <motion.div variants={fadeUp} className="space-y-3">
                    <Label className={labelClass}>Indicado por</Label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/20 border border-border/15">
                      <button type="button" onClick={() => setBarberReferrerType('self')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        barberReferrerType === 'self' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <Users className="h-4 w-4" /> Eu mesmo
                      </button>
                      <button type="button" onClick={() => setBarberReferrerType('client')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        barberReferrerType === 'client' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <User className="h-4 w-4" /> Meu cliente
                      </button>
                    </div>

                    {barberReferrerType === 'self' && (
                      <div className="rounded-xl bg-primary/[0.06] border border-primary/15 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl lavender-gradient flex items-center justify-center shadow-md shadow-primary/20">
                          <Users className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Indicado por</p>
                          <p className="font-semibold text-sm">{profile.name}</p>
                        </div>
                      </div>
                    )}

                    {barberReferrerType === 'client' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Selecione o cliente que trouxe este lead</Label>
                        <SearchableSelect
                          options={barberClients.map(c => ({ value: c.id, label: c.name, sublabel: c.phone, icon: <User className="h-4 w-4 text-muted-foreground" /> }))}
                          value={selectedBarberClientId}
                          onValueChange={setSelectedBarberClientId}
                          placeholder="Selecionar cliente indicador"
                          searchPlaceholder="Buscar por nome ou telefone..."
                          emptyMessage="Nenhum cliente cadastrado ainda"
                          loading={loadingReferrers}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Name & Phone */}
                <motion.div variants={fadeUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>
                      <User className="h-3 w-3" /> Nome do Lead
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome completo do indicado"
                      className={inputClass}
                      required
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>
                      <Phone className="h-3 w-3" /> Telefone
                    </Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className={inputClass}
                      required
                      maxLength={16}
                    />
                  </div>
                </motion.div>

                {/* Submit */}
                <motion.div variants={fadeUp} className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl lavender-gradient text-primary-foreground font-semibold shadow-lg shadow-primary/20 text-sm gap-2"
                    disabled={isDisabled}
                  >
                    {loading ? 'Registrando...' : 'Registrar Indicação'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div variants={fadeUp}>
          <Card className="mt-5 glass-card border-primary/10 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-semibold text-sm">Como funciona a indicação?</h3>
                  <div className="text-xs text-muted-foreground/80 space-y-1 leading-relaxed">
                    <p>• Ao registrar: indicador ganha <span className="text-primary font-medium">+{REFERRAL_BONUS_POINTS} pontos</span> imediatos</p>
                    <p>• Ao converter em cliente: <span className="text-primary font-medium">+30 a +400 pontos</span> (depende do plano)</p>
                    <p>• Indicação via cliente: colaborador ganha <span className="text-primary font-medium">{BARBER_REFERRAL_CONVERSION_PERCENT}%</span> dos pontos</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
