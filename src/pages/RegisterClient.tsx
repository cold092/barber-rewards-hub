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
import { UserCheck, Phone, User, Users, ArrowRight, Crown, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { registerClient, getAllBarbers } from '@/services/referralService';
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

export default function RegisterClient() {
  const navigate = useNavigate();
  const { profile, isAdmin, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [responsibleType, setResponsibleType] = useState<'barber' | 'team'>('barber');

  useEffect(() => {
    async function load() {
      setLoadingBarbers(true);
      if (isAdmin) {
        const result = await getAllBarbers();
        setBarbers(result.data);
      }
      setLoadingBarbers(false);
    }
    load();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = schema.safeParse({ name, phone });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    if (!profile) { toast.error('Perfil não encontrado'); return; }

    setLoading(true);
    const createdBy = role && profile ? { id: profile.id, name: profile.name, role } : undefined;

    if (isAdmin && responsibleType === 'barber') {
      if (!selectedBarberId) { toast.error('Selecione o colaborador responsável'); setLoading(false); return; }
      const barber = barbers.find(b => b.id === selectedBarberId);
      if (!barber) { toast.error('Colaborador não encontrado'); setLoading(false); return; }
      const result = await registerClient(barber.id, barber.name, { clientName: name.trim(), clientPhone: phone.trim() }, createdBy);
      setLoading(false);
      if (result.success) { toast.success('Cliente registrado com sucesso!'); navigate('/clientes'); }
      else { toast.error(result.error || 'Erro ao registrar cliente'); }
      return;
    }

    const result = await registerClient(profile.id, profile.name, { clientName: name.trim(), clientPhone: phone.trim() }, createdBy);
    setLoading(false);
    if (result.success) { toast.success('Cliente registrado com sucesso!'); navigate('/clientes'); }
    else { toast.error(result.error || 'Erro ao registrar cliente'); }
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

  return (
    <DashboardLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
              <UserCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">
                Novo <span className="text-emerald-500">Cliente</span>
              </h1>
              <p className="text-muted-foreground/60 text-xs">
                Cadastre um cliente fidelizado no sistema
              </p>
            </div>
          </div>
        </motion.div>

        {/* Premium Badge */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Fidelização</span>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-400/30 to-transparent" />
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div variants={fadeUp}>
          <Card className="glass-card border-emerald-500/15 overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />

            <CardContent className="p-6 pt-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Admin: responsible selection */}
                {isAdmin && (
                  <motion.div variants={fadeUp} className="space-y-3">
                    <Label className={labelClass}>
                      <ShieldCheck className="h-3 w-3" /> Responsável pelo cadastro
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/20 border border-border/15">
                      <button type="button" onClick={() => setResponsibleType('barber')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        responsibleType === 'barber' ? "bg-emerald-500/15 text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <Users className="h-4 w-4" /> Colaborador
                      </button>
                      <button type="button" onClick={() => setResponsibleType('team')} className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        responsibleType === 'team' ? "bg-emerald-500/15 text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}>
                        <User className="h-4 w-4" /> Equipe
                      </button>
                    </div>
                    {responsibleType === 'barber' && (
                      <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                        <SelectTrigger className={selectClass}><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                        <SelectContent>
                          {loadingBarbers ? (<SelectItem value="loading" disabled>Carregando...</SelectItem>)
                            : barbers.length === 0 ? (<SelectItem value="empty" disabled>Nenhum colaborador</SelectItem>)
                            : barbers.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{b.name}</div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    {responsibleType === 'team' && (
                      <div className="rounded-xl bg-secondary/15 border border-border/15 p-3.5">
                        <p className="text-sm text-muted-foreground">Cadastro feito pela equipe administrativa.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Barber info */}
                {!isAdmin && profile && (
                  <motion.div variants={fadeUp} className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Registrando como</p>
                      <p className="font-semibold text-sm">{profile.name}</p>
                    </div>
                  </motion.div>
                )}

                {/* Name & Phone */}
                <motion.div variants={fadeUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>
                      <User className="h-3 w-3" /> Nome do Cliente
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome completo do cliente"
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
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold shadow-lg shadow-emerald-500/20 text-sm gap-2"
                    disabled={loading || (isAdmin && responsibleType === 'barber' && (loadingBarbers || !selectedBarberId))}
                  >
                    {loading ? 'Registrando...' : 'Cadastrar Cliente'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits info card */}
        <motion.div variants={fadeUp}>
          <Card className="mt-5 glass-card border-emerald-500/10 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 shrink-0">
                  <Crown className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-semibold text-sm">Benefícios do cadastro</h3>
                  <div className="text-xs text-muted-foreground/80 space-y-1 leading-relaxed">
                    <p>• O cliente poderá <span className="text-emerald-500 font-medium">indicar novos leads</span> pelo portal</p>
                    <p>• Acompanhar seus <span className="text-emerald-500 font-medium">pontos e resgates</span></p>
                    <p>• Acessar catálogo de <span className="text-emerald-500 font-medium">recompensas exclusivas</span></p>
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
