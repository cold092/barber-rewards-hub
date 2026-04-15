import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, Mail, Lock, User, Building2, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  barbershopName: z.string().min(2, 'Nome da barbearia deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupName, setSignupName] = useState('');
  const [signupBarbershopName, setSignupBarbershopName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  if (user) {
    navigate('/');
    return null;
  }

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
      toast.error(error.message.includes('Invalid login credentials')
        ? 'Email ou senha incorretos'
        : 'Erro ao fazer login. Tente novamente.');
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = signupSchema.safeParse({
      name: signupName,
      barbershopName: signupBarbershopName,
      email: signupEmail,
      password: signupPassword,
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: signupName,
            organization_name: signupBarbershopName,
            role: 'owner',
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(262_80%_65%/0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(285_65%_58%/0.06),transparent_50%)]" />
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-accent/5 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-center mb-8"
        >
          <motion.div
            className="inline-flex items-center justify-center w-18 h-18 rounded-2xl lavender-gradient lavender-glow mb-5 p-4"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Scissors className="w-9 h-9 text-primary-foreground" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold lavender-text tracking-tight">Growth Game</h1>
          <p className="text-muted-foreground mt-2 text-sm flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            Sistema de Crescimento
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="glass-card border-border/40 rounded-2xl overflow-hidden"
        >
          <div className="p-6 pb-4 text-center">
            <h2 className="text-lg font-display font-semibold text-foreground">Acesso ao Sistema</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'login'
                ? 'Entre com suas credenciais para continuar'
                : 'Crie sua conta e comece a crescer'}
            </p>
          </div>
          
          <div className="px-6 pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/40 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                  Cadastrar
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0">
                <motion.form
                  onSubmit={handleLogin}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10 h-11 bg-secondary/20 border-border/30 rounded-xl text-sm focus:border-primary/50 focus:bg-secondary/30 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 h-11 bg-secondary/20 border-border/30 rounded-xl text-sm focus:border-primary/50 focus:bg-secondary/30 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 lavender-gradient lavender-glow text-primary-foreground font-semibold rounded-xl text-sm group"
                    disabled={loading}
                  >
                    {loading ? (
                      <motion.div
                        className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <span className="flex items-center gap-2">
                        Entrar
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    )}
                  </Button>
                </motion.form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <motion.form
                  onSubmit={handleSignup}
                  className="space-y-4"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Seu Nome
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="pl-10 h-11 bg-secondary/20 border-border/30 rounded-xl text-sm focus:border-primary/50 focus:bg-secondary/30 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-barbershop" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nome da Barbearia
                    </Label>
                    <div className="relative group">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-barbershop"
                        type="text"
                        placeholder="Ex: Barbearia Premium"
                        value={signupBarbershopName}
                        onChange={(e) => setSignupBarbershopName(e.target.value)}
                        className="pl-10 h-11 bg-secondary/20 border-border/30 rounded-xl text-sm focus:border-primary/50 focus:bg-secondary/30 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-10 h-11 bg-secondary/20 border-border/30 rounded-xl text-sm focus:border-primary/50 focus:bg-secondary/30 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10 h-11 bg-secondary/20 border-border/30 rounded-xl text-sm focus:border-primary/50 focus:bg-secondary/30 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 lavender-gradient lavender-glow text-primary-foreground font-semibold rounded-xl text-sm group"
                    disabled={loading}
                  >
                    {loading ? (
                      <motion.div
                        className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <span className="flex items-center gap-2">
                        Criar Barbearia
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    )}
                  </Button>
                </motion.form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
        
        {/* Footer */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-center mt-6 space-y-3"
        >
          <p className="text-xs text-muted-foreground/50">
            Cadastre sua barbearia e comece a gerenciar indicações
          </p>
          <a
            href="/cliente"
            className="inline-flex items-center gap-1.5 text-sm text-primary/80 hover:text-primary font-medium transition-colors group"
          >
            Sou cliente — acessar meu portal
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
