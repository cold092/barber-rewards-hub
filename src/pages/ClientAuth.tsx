import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, Lock, UserCheck, Search, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion } from 'framer-motion';

const phoneSearchSchema = z.object({
  phone: z.string().min(8, 'Telefone inválido'),
});

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

interface FoundRecord {
  type: 'referral' | 'client';
  id: string;
  name: string;
  phone: string;
  points: number;
}

export default function ClientAuth() {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  // Search step
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundRecord, setFoundRecord] = useState<FoundRecord | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Signup fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  if (user) {
    navigate('/portal');
    return null;
  }

  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = phoneSearchSchema.safeParse({ phone });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSearching(true);
    setFoundRecord(null);
    setNotFound(false);

    try {
      const { data, error } = await supabase.functions.invoke('client-phone-lookup', {
        body: { phone },
      });

      if (error) throw error;

      if (data.already_linked) {
        toast.info('Este número já está vinculado a uma conta. Faça login.');
      } else if (data.found) {
        setFoundRecord({
          type: 'referral',
          id: data.id,
          name: data.name,
          phone: data.phone,
          points: data.points,
        });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erro ao buscar cadastro');
    }
    setSearching(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundRecord) return;

    const validation = signupSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          data: {
            name: foundRecord.name,
            role: 'client',
            referral_id: foundRecord.id,
          },
        },
      });

      if (error) throw error;

      toast.success('Conta criada! Verifique seu email para confirmar.');
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      toast.error('Email ou senha incorretos');
    } else {
      toast.success('Login realizado!');
      navigate('/portal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <UserCheck className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Portal do Cliente</h1>
          <p className="text-muted-foreground mt-2">Acompanhe seus pontos e resgates</p>
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-display">Acesso ao Portal</CardTitle>
            <CardDescription>
              Use seu celular cadastrado para criar sua conta ou faça login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                <TabsTrigger value="login">Entrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                {!foundRecord ? (
                  <form onSubmit={handlePhoneSearch} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-search">Seu telefone cadastrado</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone-search"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {notFound && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <p className="text-xs text-destructive">
                          Nenhum cadastro encontrado com esse telefone. Verifique o número ou fale com sua barbearia.
                        </p>
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={searching}
                    >
                      {searching ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando...</>
                      ) : (
                        <><Search className="h-4 w-4 mr-2" /> Buscar meu cadastro</>
                      )}
                    </Button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Found record card */}
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/20">
                          <UserCheck className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{foundRecord.name}</p>
                          <p className="text-xs text-muted-foreground">{foundRecord.phone}</p>
                          <p className="text-xs text-success font-medium mt-0.5">
                            {foundRecord.points} pontos disponíveis
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Seu Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Crie uma senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-success hover:bg-success/90 text-success-foreground"
                        disabled={loading}
                      >
                        {loading ? 'Criando conta...' : 'Criar minha conta'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-xs"
                        onClick={() => {
                          setFoundRecord(null);
                          setPhone('');
                        }}
                      >
                        Buscar outro número
                      </Button>
                    </form>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <a href="/auth" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Área administrativa →
          </a>
        </div>
      </div>
    </div>
  );
}
