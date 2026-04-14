import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { UserPlus, Phone, User, Users, Link, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { registerLead, registerClient, getAllBarbers, getAllLeadsAsReferrers, registerLeadByLead, getBarberLeadsAsReferrers } from '@/services/referralService';
import { BARBER_REFERRAL_CONVERSION_PERCENT, REFERRAL_BONUS_POINTS } from '@/config/plans';
import { isValidPhone } from '@/utils/whatsapp';
import type { Profile } from '@/types/database';

const leadSchema = z.object({
  leadName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  leadPhone: z.string().refine(isValidPhone, 'Telefone inválido'),
});

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface NewReferralProps {
  defaultEntryType?: 'lead' | 'client';
}

export default function NewReferral({ defaultEntryType = 'lead' }: NewReferralProps) {
  const navigate = useNavigate();
  const { profile, isAdmin, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [selectedReferrerId, setSelectedReferrerId] = useState('');
  const [selectedLeadReferrerId, setSelectedLeadReferrerId] = useState('');
  const [referrers, setReferrers] = useState<Profile[]>([]);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [leadReferrers, setLeadReferrers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [barberClients, setBarberClients] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(true);
  const [referrerType, setReferrerType] = useState<'user' | 'lead'>('user');
  const [barberReferrerType, setBarberReferrerType] = useState<'self' | 'client'>('self');
  const [clientReferrerType, setClientReferrerType] = useState<'barber' | 'team'>('barber');
  const [selectedBarberClientId, setSelectedBarberClientId] = useState('');
  const [entryType, setEntryType] = useState<'lead' | 'client'>(defaultEntryType);

  useEffect(() => {
    async function loadReferrers() {
      setLoadingReferrers(true);
      if (isAdmin) {
        const [barbersResult, leadsResult] = await Promise.all([
          getAllBarbers(),
          getAllLeadsAsReferrers()
        ]);
        setReferrers(barbersResult.data);
        setBarbers(barbersResult.data);
        setLeadReferrers(leadsResult.data);
      } else if (profile) {
        const clientsResult = await getBarberLeadsAsReferrers(profile.id);
        setBarberClients(clientsResult.data);
      }
      setLoadingReferrers(false);
    }
    loadReferrers();
  }, [profile, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = leadSchema.safeParse({ leadName, leadPhone });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    if (entryType === 'client') {
      if (!profile) { toast.error('Perfil não encontrado'); setLoading(false); return; }
      const createdBy = role && profile ? { id: profile.id, name: profile.name, role } : undefined;

      if (isAdmin) {
        if (clientReferrerType === 'barber') {
          if (!selectedReferrerId) { toast.error('Selecione o colaborador responsável'); setLoading(false); return; }
          const referrer = barbers.find(r => r.id === selectedReferrerId);
          if (!referrer) { toast.error('Colaborador não encontrado'); setLoading(false); return; }
          const result = await registerClient(referrer.id, referrer.name, { clientName: leadName.trim(), clientPhone: leadPhone.trim() }, createdBy);
          setLoading(false);
          if (result.success) { toast.success('Cliente registrado com sucesso!'); navigate('/leads'); } else { toast.error(result.error || 'Erro ao registrar cliente'); }
          return;
        }
        const result = await registerClient(profile.id, profile.name, { clientName: leadName.trim(), clientPhone: leadPhone.trim() }, createdBy);
        setLoading(false);
        if (result.success) { toast.success('Cliente registrado com sucesso!'); navigate('/leads'); } else { toast.error(result.error || 'Erro ao registrar cliente'); }
        return;
      }

      const result = await registerClient(profile.id, profile.name, { clientName: leadName.trim(), clientPhone: leadPhone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success('Cliente registrado com sucesso!'); navigate('/leads'); } else { toast.error(result.error || 'Erro ao registrar cliente'); }
      return;
    }

    if (isAdmin && referrerType === 'lead') {
      if (!profile) { toast.error('Perfil não encontrado'); setLoading(false); return; }
      const createdBy = role && profile ? { id: profile.id, name: profile.name, role } : undefined;
      if (!selectedLeadReferrerId) { toast.error('Selecione o cliente que está indicando'); setLoading(false); return; }
      if (!selectedReferrerId) { toast.error('Selecione o colaborador responsável'); setLoading(false); return; }
      const responsibleBarber = referrers.find((ref) => ref.id === selectedReferrerId);
      if (!responsibleBarber) { toast.error('Colaborador responsável não encontrado'); setLoading(false); return; }
      const leadReferrer = leadReferrers.find(l => l.id === selectedLeadReferrerId);
      const result = await registerLeadByLead(responsibleBarber.id, responsibleBarber.name, selectedLeadReferrerId, { leadName: leadName.trim(), leadPhone: leadPhone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success(`Lead registrado! ${leadReferrer?.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); } else { toast.error(result.error || 'Erro ao registrar lead'); }
      return;
    }

    if (isAdmin && referrerType === 'user') {
      if (!selectedReferrerId) { toast.error('Selecione o colaborador responsável'); setLoading(false); return; }
      const referrer = referrers.find(r => r.id === selectedReferrerId);
      if (!referrer) { toast.error('Colaborador não encontrado'); setLoading(false); return; }
      const createdBy = role && profile ? { id: profile.id, name: profile.name, role } : undefined;
      const result = await registerLead(selectedReferrerId, referrer.name, { leadName: leadName.trim(), leadPhone: leadPhone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success(`Lead registrado! ${referrer.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); } else { toast.error(result.error || 'Erro ao registrar lead'); }
      return;
    }

    if (!profile) { toast.error('Perfil não encontrado'); setLoading(false); return; }
    const createdBy = role && profile ? { id: profile.id, name: profile.name, role } : undefined;

    if (barberReferrerType === 'client') {
      if (!selectedBarberClientId) { toast.error('Selecione o cliente que está indicando'); setLoading(false); return; }
      const clientReferrer = barberClients.find(c => c.id === selectedBarberClientId);
      const result = await registerLeadByLead(profile.id, profile.name, selectedBarberClientId, { leadName: leadName.trim(), leadPhone: leadPhone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success(`Lead registrado! ${clientReferrer?.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); } else { toast.error(result.error || 'Erro ao registrar lead'); }
      return;
    }

    const result = await registerLead(profile.id, profile.name, { leadName: leadName.trim(), leadPhone: leadPhone.trim() }, createdBy);
    setLoading(false);
    if (result.success) { toast.success(`Lead registrado! Você ganhou +${REFERRAL_BONUS_POINTS} pontos`, { duration: 4000 }); navigate('/leads'); } else { toast.error(result.error || 'Erro ao registrar lead'); }
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const inputClass = "bg-secondary/10 border-border/20 rounded-xl focus:border-primary/40 h-10 text-sm";
  const selectClass = "bg-secondary/10 border-border/20 rounded-xl h-10 text-sm";
  const labelClass = "text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5";

  return (
    <DashboardLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <h1 className="text-3xl font-display font-bold">
            Nova <span className="gold-text">Indicação</span>
          </h1>
          <p className="text-muted-foreground/70 mt-1 text-sm">
            Registre um novo lead ou cliente no programa
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div variants={fadeUp}>
          <Card className="glass-card border-border/30 overflow-hidden">
            {/* Card Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/15 bg-gradient-to-b from-primary/[0.04] to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl lavender-gradient shadow-lg shadow-primary/20">
                  <UserPlus className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-lg">
                    {entryType === 'client' ? 'Dados do Cliente' : 'Dados do Lead'}
                  </h2>
                  <p className="text-xs text-muted-foreground/70">
                    {entryType === 'client'
                      ? 'Cliente já é seu e pode indicar mais pessoas'
                      : `O indicador ganha +${REFERRAL_BONUS_POINTS} pontos ao registrar`}
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Entry Type Toggle */}
                <div className="space-y-2.5">
                  <Label className={labelClass}>Tipo de Cadastro</Label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/20 border border-border/15">
                    <button type="button" onClick={() => setEntryType('lead')} className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      entryType === 'lead' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    )}>
                      <Users className="h-4 w-4" /> Lead
                    </button>
                    <button type="button" onClick={() => setEntryType('client')} className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      entryType === 'client' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    )}>
                      <User className="h-4 w-4" /> Cliente
                    </button>
                  </div>
                </div>

                {/* Admin + Lead referrer selection */}
                {isAdmin && entryType === 'lead' && (
                  <div className="space-y-4">
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
                        <Label className="text-xs text-muted-foreground">Selecione quem indicou este lead</Label>
                        <Select value={selectedReferrerId} onValueChange={setSelectedReferrerId}>
                          <SelectTrigger className={selectClass}><SelectValue placeholder="Quem indicou este lead?" /></SelectTrigger>
                          <SelectContent>
                            {loadingReferrers ? (<SelectItem value="loading" disabled>Carregando...</SelectItem>) : referrers.length === 0 ? (<SelectItem value="empty" disabled>Nenhum colaborador encontrado</SelectItem>) : referrers.map((r) => (<SelectItem key={r.id} value={r.id}><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{r.name}</div></SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {referrerType === 'lead' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Cliente que fez a indicação</Label>
                          <Select value={selectedLeadReferrerId} onValueChange={setSelectedLeadReferrerId}>
                            <SelectTrigger className={selectClass}><SelectValue placeholder="Quem indicou este lead?" /></SelectTrigger>
                            <SelectContent>
                              {loadingReferrers ? (<SelectItem value="loading" disabled>Carregando...</SelectItem>) : leadReferrers.length === 0 ? (<SelectItem value="empty" disabled>Nenhum cliente cadastrado ainda</SelectItem>) : leadReferrers.map((lead) => (<SelectItem key={lead.id} value={lead.id}><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{lead.name} ({lead.phone})</div></SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Colaborador responsável pelo atendimento</Label>
                          <Select value={selectedReferrerId} onValueChange={setSelectedReferrerId}>
                            <SelectTrigger className={selectClass}><SelectValue placeholder="Quem vai atender este lead?" /></SelectTrigger>
                            <SelectContent>
                              {loadingReferrers ? (<SelectItem value="loading" disabled>Carregando...</SelectItem>) : referrers.length === 0 ? (<SelectItem value="empty" disabled>Nenhum colaborador encontrado</SelectItem>) : referrers.map((r) => (<SelectItem key={r.id} value={r.id}><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{r.name}</div></SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Barber referrer selection */}
                {!isAdmin && profile && entryType === 'lead' && (
                  <div className="space-y-4">
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
                        <Label className="text-xs text-muted-foreground">Selecione o cliente que fez a indicação</Label>
                        <Select value={selectedBarberClientId} onValueChange={setSelectedBarberClientId}>
                          <SelectTrigger className={selectClass}><SelectValue placeholder="Quem indicou este lead?" /></SelectTrigger>
                          <SelectContent>
                            {loadingReferrers ? (<SelectItem value="loading" disabled>Carregando...</SelectItem>) : barberClients.length === 0 ? (<SelectItem value="empty" disabled>Nenhum cliente cadastrado ainda</SelectItem>) : barberClients.map((client) => (<SelectItem key={client.id} value={client.id}><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{client.name} ({client.phone})</div></SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Barber client entry */}
                {!isAdmin && profile && entryType === 'client' && (
                  <div className="rounded-xl bg-primary/[0.06] border border-primary/15 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl lavender-gradient flex items-center justify-center shadow-md shadow-primary/20">
                      <Users className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Registrando como</p>
                      <p className="font-semibold text-sm">{profile.name}</p>
                    </div>
                  </div>
                )}

                {/* Admin client entry */}
                {isAdmin && entryType === 'client' && (
                  <div className="space-y-3">
                    <Label className={labelClass}>Responsável pelo cadastro</Label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/20 border border-border/15">
                      <button type="button" onClick={() => setClientReferrerType('barber')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        clientReferrerType === 'barber' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <Users className="h-4 w-4" /> Colaborador
                      </button>
                      <button type="button" onClick={() => setClientReferrerType('team')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        clientReferrerType === 'team' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <User className="h-4 w-4" /> Equipe
                      </button>
                    </div>
                    {clientReferrerType === 'barber' && (
                      <Select value={selectedReferrerId} onValueChange={setSelectedReferrerId}>
                        <SelectTrigger className={selectClass}><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                        <SelectContent>
                          {loadingReferrers ? (<SelectItem value="loading" disabled>Carregando...</SelectItem>) : barbers.length === 0 ? (<SelectItem value="empty" disabled>Nenhum colaborador encontrado</SelectItem>) : barbers.map((r) => (<SelectItem key={r.id} value={r.id}><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{r.name}</div></SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                    {clientReferrerType === 'team' && (
                      <div className="rounded-xl bg-secondary/15 border border-border/15 p-3.5">
                        <p className="text-sm text-muted-foreground">Cadastro feito pela equipe.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Name & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className={labelClass}>
                      <User className="h-3 w-3" /> Nome do {entryType === 'client' ? 'Cliente' : 'Lead'}
                    </Label>
                    <Input
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder={`Nome completo do ${entryType === 'client' ? 'cliente' : 'indicado'}`}
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
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(formatPhoneInput(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className={inputClass}
                      required
                      maxLength={16}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl lavender-gradient text-primary-foreground font-semibold shadow-lg shadow-primary/20 text-sm gap-2"
                    disabled={
                      loading ||
                      (isAdmin && entryType === 'lead' && ((referrerType === 'user' && (loadingReferrers || !selectedReferrerId)) || (referrerType === 'lead' && (loadingReferrers || !selectedLeadReferrerId || !selectedReferrerId)))) ||
                      (isAdmin && entryType === 'client' && clientReferrerType === 'barber' && (loadingReferrers || !selectedReferrerId)) ||
                      (!isAdmin && entryType === 'lead' && barberReferrerType === 'client' && (loadingReferrers || !selectedBarberClientId))
                    }
                  >
                    {loading ? 'Registrando...' : entryType === 'client' ? 'Registrar Cliente' : 'Registrar Indicação'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div variants={fadeUp}>
          <Card className="mt-6 glass-card border-primary/10 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-semibold text-sm">Como funciona?</h3>
                  <div className="text-xs text-muted-foreground/80 space-y-1 leading-relaxed">
                    <p>• Cliente cadastrado pode indicar novos leads</p>
                    <p>• Ao indicar: <span className="text-primary font-medium">+{REFERRAL_BONUS_POINTS} pontos</span> imediatos</p>
                    <p>• Ao converter: <span className="text-primary font-medium">+30 a +400 pontos</span> (depende do plano)</p>
                    <p>• Indicação de cliente: colaborador ganha <span className="text-primary font-medium">{BARBER_REFERRAL_CONVERSION_PERCENT}%</span> dos pontos</p>
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
