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
  ShieldCheck,
  TrendingUp,
  Users,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: 'Cresça com indicações',
    desc: 'Programa de recompensas que multiplica sua base de clientes.',
  },
  {
    icon: Users,
    title: 'Gestão de equipe',
    desc: 'CRM completo, Kanban e ranking dos colaboradores.',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-unidade seguro',
    desc: 'Cada unidade isolada, com seus próprios dados e clientes.',
  },
];

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
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col lg:flex-row overflow-hidden">
      {/* ============= LEFT — Brand panel ============= */}
      <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between overflow-hidden p-10 xl:p-14 border-r border-border/40">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/40 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.12),transparent_60%)]" />

        {/* Floating orbs */}
        <motion.div
          aria-hidden
          className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl"
          animate={{ y: [0, 24, 0], x: [0, 12, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-32 -right-20 w-[32rem] h-[32rem] rounded-full bg-accent/10 blur-3xl"
          animate={{ y: [0, -18, 0], x: [0, -10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Top — Brand */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl lavender-gradient flex items-center justify-center shadow-lg shadow-primary/25">
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-none tracking-tight">Growth Game</p>
            <p className="text-[11px] text-muted-foreground mt-1 tracking-wide uppercase">
              Sistema de Crescimento
            </p>
          </div>
        </motion.div>

        {/* Middle — Headline + benefits */}
        <div className="relative z-10 space-y-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              Plataforma all-in-one
            </span>
            <h1 className="mt-5 font-display font-bold text-4xl xl:text-[2.75rem] leading-[1.1] tracking-tight">
              Transforme indicações em{' '}
              <span className="lavender-text">crescimento previsível</span>.
            </h1>
            <p className="mt-4 text-muted-foreground text-base leading-relaxed">
              CRM, programa de recompensas e gestão de equipe — tudo em um único
              painel pensado para barbearias modernas.
            </p>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
            }}
            className="space-y-4"
          >
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <motion.li
                  key={h.title}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
                  }}
                  className="flex items-start gap-3"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-card border border-border/50 flex items-center justify-center text-primary shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{h.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {h.desc}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>

        {/* Bottom — Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 flex items-center justify-between text-[11px] text-muted-foreground/70"
        >
          <p>© {new Date().getFullYear()} Growth Game</p>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Conexão segura
          </span>
        </motion.div>
      </aside>

      {/* ============= RIGHT — Form panel ============= */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile background accent */}
        <div className="lg:hidden absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)] pointer-events-none" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl lavender-gradient flex items-center justify-center shadow-md shadow-primary/20">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Growth Game</span>
          </div>

          {/* Heading */}
          <motion.div
            key={mode + '-heading'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-7"
          >
            <h2 className="font-display font-bold text-2xl tracking-tight">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {mode === 'login'
                ? 'Entre com seu email e senha para continuar.'
                : 'Cadastre sua barbearia em menos de um minuto.'}
            </p>
          </motion.div>

          {/* Segmented switcher */}
          <div
            role="tablist"
            aria-label="Modo de autenticação"
            className="relative grid grid-cols-2 p-1 rounded-xl bg-secondary/40 border border-border/40 mb-6"
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-card shadow-sm border border-border/50"
              style={{ left: mode === 'login' ? 4 : 'calc(50% + 0px)' }}
            />
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'relative z-10 h-9 text-sm font-medium rounded-lg transition-colors',
                  mode === m ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form
                key="login"
                onSubmit={handleLogin}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <FieldEmail
                  id="login-email"
                  value={loginEmail}
                  onChange={setLoginEmail}
                />
                <FieldPassword
                  id="login-password"
                  value={loginPassword}
                  onChange={setLoginPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                  trailing={
                    <button
                      type="button"
                      className="text-[11px] text-primary/80 hover:text-primary font-medium"
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>
                <FieldEmail
                  id="signup-email"
                  value={signupEmail}
                  onChange={setSignupEmail}
                />
                <FieldPassword
                  id="signup-password"
                  value={signupPassword}
                  onChange={setSignupPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                  hint="Use ao menos 6 caracteres."
                />

                <SubmitButton loading={loading} label="Criar conta" />

                <p className="text-[11px] text-muted-foreground/80 text-center leading-relaxed">
                  Ao criar uma conta, você concorda com nossos termos de uso e
                  política de privacidade.
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Divider + client portal link */}
          <div className="mt-7">
            <div className="relative flex items-center text-[11px] text-muted-foreground/70">
              <span className="flex-1 h-px bg-border/50" />
              <span className="px-3 uppercase tracking-wider">ou</span>
              <span className="flex-1 h-px bg-border/50" />
            </div>
            <a
              href="/cliente"
              className="mt-4 flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 text-sm font-medium text-foreground transition-all group"
            >
              Sou cliente — acessar meu portal
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </a>
          </div>
        </div>

        {/* Mobile footer */}
        <p className="lg:hidden mt-8 text-[11px] text-muted-foreground/60">
          © {new Date().getFullYear()} Growth Game · Conexão segura
        </p>
      </main>
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
  trailing?: React.ReactNode;
  hint?: string;
}

function Field({ id, label, icon: Icon, placeholder, value, onChange, type = 'text', hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative group">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 h-11 bg-secondary/20 border-border/40 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 transition-all"
          required
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground/70 pl-1">{hint}</p>}
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
  hint?: string;
}

function FieldPassword({ id, value, onChange, show, onToggle, trailing, hint }: FieldPasswordProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Senha
        </Label>
        {trailing}
      </div>
      <div className="relative group">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-11 h-11 bg-secondary/20 border-border/40 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 transition-all"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground/70 pl-1">{hint}</p>}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="w-full h-11 lavender-gradient lavender-glow text-primary-foreground font-semibold rounded-xl text-sm group mt-2"
    >
      {loading ? (
        <motion.div
          className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
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
