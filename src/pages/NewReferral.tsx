import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Phone, User, Users, Link } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { registerLead, getAllBarbers, getAllClients, getAllLeadsAsReferrers, registerLeadByLead } from '@/services/referralService';
import { REFERRAL_BONUS_POINTS } from '@/config/plans';
import { isValidPhone } from '@/utils/whatsapp';
import type { Profile } from '@/types/database';

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
  const [selectedLeadReferrerId, setSelectedLeadReferrerId] = useState('');
  const [referrers, setReferrers] = useState<Profile[]>([]);
  const [leadReferrers, setLeadReferrers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(true);
  const [referrerType, setReferrerType] = useState<'user' | 'lead'>('user');

  useEffect(() => {
    async function loadReferrers() {
      if (!isAdmin) {
        setLoadingReferrers(false);
        return;
      }

      setLoadingReferrers(true);
      
      // Load barbers, clients, and existing leads as potential referrers
      const [barbersResult, clientsResult, leadsResult] = await Promise.all([
        getAllBarbers(),
        getAllClients(),
        getAllLeadsAsReferrers()
      ]);
      
      const allReferrers = [...barbersResult.data, ...clientsResult.data];
      setReferrers(allReferrers);
      setLeadReferrers(leadsResult.data);
      
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

    // If admin and referrer is a lead
    if (isAdmin && referrerType === 'lead') {
      if (!selectedLeadReferrerId) {
        toast.error('Selecione o lead que está indicando');
        setLoading(false);
        return;
      }

      const leadReferrer = leadReferrers.find(l => l.id === selectedLeadReferrerId);
      const result = await registerLeadByLead(selectedLeadReferrerId, {
        leadName: leadName.trim(),
        leadPhone: leadPhone.trim()
      });
      
      setLoading(false);
      
      if (result.success) {
        toast.success(
          `Lead registrado! ${leadReferrer?.name} ganhou +${REFERRAL_BONUS_POINTS} pontos`,
          { duration: 4000 }
        );
        navigate('/leads');
      } else {
        toast.error(result.error || 'Erro ao registrar lead');
      }
      return;
    }

    // Admin selecting a user referrer
    if (isAdmin && referrerType === 'user') {
      if (!selectedReferrerId) {
        toast.error('Selecione quem está indicando');
        setLoading(false);
        return;
      }
      
      const referrer = referrers.find(r => r.id === selectedReferrerId);
      if (!referrer) {
        toast.error('Indicador não encontrado');
        setLoading(false);
        return;
      }
      
      const result = await registerLead(selectedReferrerId, referrer.name, {
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
      return;
    }

    // Barber: auto-use their own profile
    if (!profile) {
      toast.error('Perfil não encontrado');
      setLoading(false);
      return;
    }
    
    const result = await registerLead(profile.id, profile.name, {
      leadName: leadName.trim(),
      leadPhone: leadPhone.trim()
    });
    
    setLoading(false);
    
    if (result.success) {
      toast.success(
        `Lead registrado! Você ganhou +${REFERRAL_BONUS_POINTS} pontos`,
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
                <div className="space-y-4">
                  <Label>Tipo de Indicador</Label>
                  <Tabs value={referrerType} onValueChange={(v) => setReferrerType(v as 'user' | 'lead')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="user" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Barbeiro/Cliente
                      </TabsTrigger>
                      <TabsTrigger value="lead" className="flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Lead existente
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="user" className="mt-4">
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
                    </TabsContent>
                    
                    <TabsContent value="lead" className="mt-4">
                      <Select
                        value={selectedLeadReferrerId}
                        onValueChange={setSelectedLeadReferrerId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o lead indicador" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingReferrers ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : leadReferrers.length === 0 ? (
                            <SelectItem value="empty" disabled>Nenhum lead cadastrado ainda</SelectItem>
                          ) : (
                            leadReferrers.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {lead.name} ({lead.phone})
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Barber view: show their name, no selector needed */}
              {!isAdmin && profile && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Indicando como</p>
                    <p className="font-semibold text-primary">{profile.name}</p>
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
                  disabled={loading || (isAdmin && referrerType === 'user' && (loadingReferrers || !selectedReferrerId)) || (isAdmin && referrerType === 'lead' && (loadingReferrers || !selectedLeadReferrerId))}
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
