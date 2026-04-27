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
import { Logo } from '@/components/Logo';

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
    <div className="min-h-screen w-full bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full min-h-screen relative grid lg:grid-cols-2 overflow-hidden"
      >
        {/* ============= FORM PANEL ============= */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
          className={cn(
            'relative bg-gradient-to-br from-primary via-primary to-[hsl(var(--primary-glow))] text-primary-foreground p-8 sm:p-10 lg:p-12 flex flex-col z-30 overflow-hidden lg:overflow-visible',
            mode === 'login' ? 'lg:order-1' : 'lg:order-2'
          )}
        >
          {/* Organic overlap edge inspired by the reference */}
          <motion.div
            aria-hidden
            className={cn(
              'hidden lg:block absolute top-[7%] h-[86%] w-40 bg-gradient-to-br from-sidebar via-background to-sidebar pointer-events-none shadow-2xl shadow-background/40 border border-white/10',
              '[border-radius:48%_52%_50%_50%/22%_42%_58%_78%]',
              mode === 'login' ? '-right-20' : '-left-20 scale-x-[-1]'
            )}
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute top-12 right-8 h-20 w-20 rounded-full bg-primary/15 blur-sm" />
            <div className="absolute bottom-20 left-6 h-28 w-28 rounded-full bg-primary/10 blur-md" />
            <div className="absolute top-1/2 right-6 h-10 w-10 -translate-y-1/2 rounded-full border-[6px] border-primary/25" />
            <div className="absolute bottom-10 right-12 h-3.5 w-3.5 rounded-full bg-primary/35" />
          </motion.div>

          {/* Decorative blobs */}
          <div
            aria-hidden
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-accent/30 blur-3xl pointer-events-none"
          />

          {/* Brand */}
          <div className="relative flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center p-1">
              <Logo size={28} />
            </div>
            <span className="font-display font-semibold text-sm tracking-tight text-white">
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
                <h1 className="font-display font-bold text-[34px] sm:text-[40px] leading-[1.05] tracking-tight text-white">
                  {mode === 'login' ? (
                    <>
                      Bem-vindo
                      <br />
                      de volta
                    </>
                  ) : (
                    <>
                      Comece sua
                      <br />
                      jornada
                    </>
                  )}
                </h1>
                <p className="text-[13.5px] text-white/75 mt-3 max-w-[320px] leading-relaxed">
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
              className="relative grid grid-cols-2 p-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 max-w-[280px]"
            >
              <motion.div
                aria-hidden
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-lg"
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
                    mode === m ? 'text-primary' : 'text-white/80 hover:text-white'
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
                        className="text-[11px] text-white/80 hover:text-white font-medium underline-offset-2 hover:underline"
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
          <div className="relative mt-8 pt-5 border-t border-white/15 flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/65">
              <Sparkles className="h-3 w-3" />
              CRM de indicações para barbearias
            </span>
            <a
              href="/cliente"
              className="text-[11px] font-medium text-white/80 hover:text-white transition-colors"
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
            'hidden lg:block relative bg-gradient-to-br from-[hsl(var(--sidebar))] to-[hsl(var(--background))] overflow-visible z-10',
            mode === 'login' ? 'lg:order-2' : 'lg:order-1'
          )}
        >
          {/* Inner clip container so the main image stays inside the illustration panel */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.img
              src={authIllustration}
              alt="Ilustração abstrata com elementos de barbearia e CRM"
              width={1024}
              height={1024}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Decorative blob bleeding into the form side (no pointer events so inputs stay clickable) */}
          <motion.div
            aria-hidden
            className={cn(
              'absolute top-[15%] w-32 h-32 rounded-full bg-primary/40 blur-2xl pointer-events-none',
              mode === 'login' ? '-left-16' : '-right-16'
            )}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Floating shape that crosses the divider (decorative ring) */}
          <motion.div
            aria-hidden
            className={cn(
              'absolute top-[40%] w-20 h-20 rounded-full border-2 border-accent/60 pointer-events-none',
              mode === 'login' ? '-left-10' : '-right-10'
            )}
            animate={{ rotate: 360, y: [0, -8, 0] }}
            transition={{
              rotate: { duration: 24, repeat: Infinity, ease: 'linear' },
              y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
            }}
          />

          {/* Floating accent dots */}
          <motion.div
            aria-hidden
            className="absolute top-[12%] right-[10%] w-3 h-3 rounded-full bg-white/70 shadow-[0_0_18px_hsl(0_0%_100%/0.6)] pointer-events-none"
            animate={{ y: [0, -10, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-[18%] left-[12%] w-2 h-2 rounded-full bg-accent shadow-[0_0_14px_hsl(var(--accent)/0.7)] pointer-events-none"
            animate={{ y: [0, 8, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
          <motion.div
            aria-hidden
            className="absolute top-[55%] right-[18%] w-1.5 h-1.5 rounded-full bg-white/60 pointer-events-none"
            animate={{ y: [0, -6, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />

          {/* Bottom tagline overlay */}
          <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/50 to-transparent z-10">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
              Growth Game · CRM
            </p>
            <p className="text-white font-display font-semibold text-[18px] leading-snug max-w-[280px]">
              Cada indicação é um corte certeiro no crescimento.
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
      <Label htmlFor={id} className="text-[11px] font-medium text-white/70 uppercase tracking-wide">
        {label}
      </Label>
      <div className="relative group">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white transition-colors" />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 h-11 bg-white/10 backdrop-blur-sm border-white/20 rounded-xl text-[13.5px] text-white placeholder:text-white/45 focus-visible:ring-2 focus-visible:ring-white/40 focus:border-white/40 transition-all"
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
        <Label htmlFor={id} className="text-[11px] font-medium text-white/70 uppercase tracking-wide">
          Senha
        </Label>
        {trailing}
      </div>
      <div className="relative group">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white transition-colors" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-11 h-11 bg-white/10 backdrop-blur-sm border-white/20 rounded-xl text-[13.5px] text-white placeholder:text-white/45 focus-visible:ring-2 focus-visible:ring-white/40 focus:border-white/40 transition-all"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
      className="w-full h-11 bg-white hover:bg-white/95 text-primary font-semibold rounded-full text-[13.5px] group mt-2 shadow-lg shadow-black/10"
    >
      {loading ? (
        <motion.div
          className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full"
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
