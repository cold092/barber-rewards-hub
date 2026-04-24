import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Scissors,
  Mail,
  Lock,
  User,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import authIllustration from '@/assets/auth-illustration.jpg';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  barbershopName: z.string().min(2, 'Nome do negócio deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type Mode = 'login' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);

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
      toast.error(
        error.message.includes('Invalid login credentials')
          ? 'Email ou senha incorretos'
          : 'Erro ao fazer login. Tente novamente.'
      );
    } else {
      toast.success('Bem-vindo de volta!');
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      {/* Ambient background — matches dashboard glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />
      <div
        aria-hidden
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[1100px] rounded-3xl overflow-hidden border border-border/60 bg-card relative grid lg:grid-cols-2 lg:min-h-[640px]"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* ============= FORM PANEL ============= */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
          className={cn(
            'relative bg-card text-foreground p-8 sm:p-10 lg:p-12 flex flex-col z-10',
            mode === 'login' ? 'lg:order-1' : 'lg:order-2'
          )}
        >
          {/* Brand */}
          <div className="relative flex items-center gap-2.5 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground"
              style={{ background: 'var(--gradient-blue)', boxShadow: 'var(--shadow-blue)' }}
            >
              <Scissors className="w-4 h-4" />
            </div>
            <span className="font-display font-semibold text-sm tracking-tight text-foreground">
              Growth Game
            </span>
          </div>

          {/* Greeting */}
          <div className="relative mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="font-display font-bold text-[34px] sm:text-[40px] leading-[1.05] tracking-tight text-foreground">
                  {mode === 'login' ? (
                    <>
                      Bem-vindo
                      <br />
                      <span className="blue-text">de volta</span>
                    </>
                  ) : (
                    <>
                      Comece sua
                      <br />
                      <span className="blue-text">jornada</span>
                    </>
                  )}
                </h1>
                <p className="text-[13.5px] text-muted-foreground mt-3 max-w-[320px] leading-relaxed">
                  {mode === 'login'
                    ? 'Acesse o painel da sua unidade e acompanhe leads, indicações e resultados em tempo real.'
                    : 'Crie sua conta e ative o programa de indicações da sua barbearia em minutos.'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Segmented switcher */}
          <div className="relative mb-6">
            <div
              role="tablist"
              aria-label="Modo de autenticação"
              className="relative grid grid-cols-2 p-1 rounded-full bg-secondary border border-border/60 max-w-[280px]"
            >
              <motion.div
                aria-hidden
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full"
                style={{ background: 'var(--gradient-blue)', boxShadow: 'var(--shadow-blue)' }}
                animate={{ x: mode === 'login' ? '0%' : '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'relative z-10 h-8 text-[12px] font-semibold rounded-full transition-colors',
                    mode === m ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>
          </div>

          {/* Forms */}
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  onSubmit={handleLogin}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <FieldEmail id="login-email" value={loginEmail} onChange={setLoginEmail} />
                  <FieldPassword
                    id="login-password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((s) => !s)}
                    trailing={
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:text-primary/80 font-medium underline-offset-2 hover:underline"
                        onClick={() =>
                          toast.info('Entre em contato com o administrador da sua unidade.')
                        }
                      >
                        Esqueci a senha
                      </button>
                    }
                  />
                  <SubmitButton loading={loading} label="Entrar" />
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  onSubmit={handleSignup}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3.5"
                >
                  <Field
                    id="signup-name"
                    label="Seu nome"
                    icon={User}
                    placeholder="Nome completo"
                    value={signupName}
                    onChange={setSignupName}
                  />
                  <Field
                    id="signup-barbershop"
                    label="Negócio / Unidade"
                    icon={Building2}
                    placeholder="Ex: Barbearia Premium"
                    value={signupBarbershopName}
                    onChange={setSignupBarbershopName}
                  />
                  <FieldEmail id="signup-email" value={signupEmail} onChange={setSignupEmail} />
                  <FieldPassword
                    id="signup-password"
                    value={signupPassword}
                    onChange={setSignupPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((s) => !s)}
                  />
                  <SubmitButton loading={loading} label="Criar conta" />
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="relative mt-8 pt-5 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              CRM de indicações para barbearias
            </span>
            <a
              href="/cliente"
              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sou cliente →
            </a>
          </div>
        </motion.div>

        {/* ============= ILLUSTRATION PANEL ============= */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
          className={cn(
            'hidden lg:block relative overflow-hidden',
            mode === 'login' ? 'lg:order-2' : 'lg:order-1'
          )}
          style={{ background: 'var(--gradient-blue-soft)' }}
        >
          {/* Soft ambient gradient overlay matching system */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--gradient-glow)' }}
          />

          <motion.img
            src={authIllustration}
            alt="Ilustração com gráficos, métricas e elementos do CRM"
            width={1024}
            height={1024}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Floating accent dots — using design tokens */}
          <motion.div
            aria-hidden
            className="absolute top-[12%] right-[10%] w-3 h-3 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.6)]"
            animate={{ y: [0, -10, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-[18%] left-[12%] w-2 h-2 rounded-full bg-accent shadow-[0_0_14px_hsl(var(--accent)/0.7)]"
            animate={{ y: [0, 8, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
          <motion.div
            aria-hidden
            className="absolute top-[55%] right-[18%] w-1.5 h-1.5 rounded-full bg-primary/60"
            animate={{ y: [0, -6, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />

          {/* Bottom tagline overlay */}
          <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-card via-card/70 to-transparent">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Growth Game · CRM
            </p>
            <p className="text-foreground font-display font-semibold text-[18px] leading-snug max-w-[280px]">
              Cada indicação é um corte certeiro no <span className="blue-text">crescimento</span>.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ===================== Subcomponents ===================== */

interface FieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

function Field({ id, label, icon: Icon, placeholder, value, onChange, type = 'text' }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="relative group">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 h-11 bg-secondary/60 border-border rounded-xl text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary/40 transition-all"
          required
        />
      </div>
    </div>
  );
}

function FieldEmail({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field
      id={id}
      label="Email"
      icon={Mail}
      placeholder="seu@email.com"
      value={value}
      onChange={onChange}
      type="email"
    />
  );
}

interface FieldPasswordProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}

function FieldPassword({ id, value, onChange, show, onToggle, trailing }: FieldPasswordProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Senha
        </Label>
        {trailing}
      </div>
      <div className="relative group">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-11 h-11 bg-secondary/60 border-border rounded-xl text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary/40 transition-all"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="btn-bank w-full h-11 rounded-full text-[13.5px] group mt-2"
    >
      {loading ? (
        <motion.div
          className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        <span className="flex items-center gap-2">
          {label}
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </span>
      )}
    </Button>
  );
}
