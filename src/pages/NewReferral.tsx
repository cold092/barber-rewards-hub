import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Phone, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { registerLead, getAllBarbers, getAllClients } from '@/services/referralService';
import { REFERRAL_BONUS_POINTS } from '@/config/plans';
import { isValidPhone } from '@/utils/whatsapp';
import type { Profile } from '@/types/database';
import { useEffect } from 'react';

const leadSchema = z.object({
  leadName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  leadPhone: z.string().refine(isValidPhone, 'Telefone inválido'),
});

export default function NewReferral() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [selectedReferrerId, setSelectedReferrerId] = useState('');
  const [referrers, setReferrers] = useState<Profile[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(true);

  useEffect(() => {
    async function loadReferrers() {
      if (!isAdmin) {
        setLoadingReferrers(false);
        return;
      }

      setLoadingReferrers(true);
      
      // Load both barbers and clients as potential referrers
      const [barbersResult, clientsResult] = await Promise.all([
        getAllBarbers(),
        getAllClients()
      ]);
      
      const allReferrers = [...barbersResult.data, ...clientsResult.data];
      setReferrers(allReferrers);
      
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

    if (!isAdmin && !profile) {
      toast.error('Aguarde o carregamento do seu perfil');
      return;
    }

    const referrerId = isAdmin ? selectedReferrerId : profile?.id;
    const referrer = isAdmin ? referrers.find(r => r.id === referrerId) : profile;
    
    if (!referrerId || !referrer) {
      toast.error('Selecione quem está indicando');
      return;
    }
    
    setLoading(true);
    
    const result = await registerLead(referrerId, referrer.name, {
      leadName: leadName.trim(),
      leadPhone: leadPhone.trim()
    });
    
    setLoading(false);
    
    if (result.success) {
      toast.success(
        `Lead registrado! ${referrer.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`,
        { duration: 4000 }
      );
      navigate('/leads');
    } else {
      toast.error(result.error || 'Erro ao registrar lead');
    }
  };

  const formatPhoneInput = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">
            Nova <span className="gold-text">Indicação</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre um novo lead para ganhar pontos
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <UserPlus className="h-5 w-5 text-primary" />
              Dados do Lead
            </CardTitle>
            <CardDescription>
              O indicador ganha +{REFERRAL_BONUS_POINTS} pontos ao registrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Referrer selection (only for admin) */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="referrer">Quem está indicando?</Label>
                  <Select
                    value={selectedReferrerId}
                    onValueChange={setSelectedReferrerId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o indicador" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingReferrers ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : referrers.length === 0 ? (
                        <SelectItem value="empty" disabled>Nenhum usuário encontrado</SelectItem>
                      ) : (
                        referrers.map((referrer) => (
                          <SelectItem key={referrer.id} value={referrer.id}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {referrer.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* If barber, show who's registering */}
              {!isAdmin && profile && (
                <div className="p-3 rounded-lg bg-secondary/50 flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Indicador</p>
                    <p className="font-medium">{profile.name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="leadName">Nome do Lead</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="leadName"
                    type="text"
                    placeholder="Nome completo do indicado"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="pl-10"
                    required
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadPhone">Telefone do Lead</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="leadPhone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(formatPhoneInput(e.target.value))}
                    className="pl-10"
                    required
                    maxLength={16}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full gold-gradient gold-glow text-primary-foreground font-semibold h-12"
                  disabled={loading || (!isAdmin && !profile) || (isAdmin && (loadingReferrers || !selectedReferrerId))}
                >
                  {loading ? 'Registrando...' : 'Registrar Indicação'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Points info card */}
        <Card className="mt-6 glass-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary-foreground">💰</span>
              </div>
              <div>
                <h3 className="font-semibold">Como funciona a pontuação?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ao indicar: +{REFERRAL_BONUS_POINTS} pontos imediatos<br />
                  Ao converter: +30 a +400 pontos (depende do plano vendido)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
