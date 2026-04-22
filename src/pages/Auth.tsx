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
  CheckCircle2,
  HelpCircle,
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
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* ============= TOP BAR ============= */}
      <header className="h-14 border-b border-border/40 bg-card/40 backdrop-blur-sm flex items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md lavender-gradient flex items-center justify-center">
            <Scissors className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sm tracking-tight">Growth Game</span>
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 ml-2 px-1.5 py-0.5 rounded border border-border/40">
            CRM
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href="/cliente"
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
          >
            Sou cliente
          </a>
          <button
            type="button"
            onClick={() =>
              toast.info('Suporte: contato via administrador da sua unidade.')
            }
            className="hidden sm:inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Ajuda
          </button>
        </div>
      </header>

      {/* ============= MAIN ============= */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 relative">
        {/* Subtle grid background */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />

        <div className="w-full max-w-[400px] relative z-10">
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-border/50 bg-card shadow-xl shadow-background/40 overflow-hidden"
          >
            {/* Card header */}
            <div className="px-6 pt-6 pb-5 border-b border-border/40">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Sistema online
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                  v1.0
                </span>
              </div>
              <h1 className="font-display font-semibold text-[22px] leading-tight tracking-tight">
                {mode === 'login' ? 'Acesso ao painel' : 'Criar nova conta'}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {mode === 'login'
                  ? 'Entre com suas credenciais corporativas.'
                  : 'Cadastre sua unidade para começar a operar.'}
              </p>
            </div>

            {/* Segmented switcher */}
            <div className="px-6 pt-5">
              <div
                role="tablist"
                aria-label="Modo de autenticação"
                className="relative grid grid-cols-2 p-1 rounded-lg bg-secondary/40 border border-border/40"
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-card shadow-sm border border-border/50"
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
                      'relative z-10 h-8 text-[12.5px] font-medium rounded-md transition-colors',
                      mode === m ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {m === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>
            </div>

            {/* Forms */}
            <div className="px-6 py-5">
              <AnimatePresence mode="wait">
                {mode === 'login' ? (
                  <motion.form
                    key="login"
                    onSubmit={handleLogin}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3.5"
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
                          className="text-[11px] text-primary/80 hover:text-primary font-medium"
                          onClick={() =>
                            toast.info('Entre em contato com o administrador da sua unidade.')
                          }
                        >
                          Esqueci a senha
                        </button>
                      }
                    />
                    <SubmitButton loading={loading} label="Entrar no painel" />
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
                      hint="Use ao menos 6 caracteres."
                    />
                    <SubmitButton loading={loading} label="Criar conta" />
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Card footer */}
            <div className="px-6 py-3.5 border-t border-border/40 bg-secondary/20 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                Conexão criptografada
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-success" />
                Multi-unidade
              </span>
            </div>
          </motion.div>

          {/* Below card meta */}
          <p className="mt-5 text-center text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} Growth Game · Todos os direitos reservados
          </p>
        </div>
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
  hint?: string;
}

function Field({ id, label, icon: Icon, placeholder, value, onChange, type = 'text', hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative group">
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 h-10 bg-background border-border/60 rounded-lg text-[13px] focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 transition-all"
          required
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground/70 pl-0.5">{hint}</p>}
    </div>
  );
}

function FieldEmail({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field
      id={id}
      label="Email corporativo"
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
        <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
          Senha
        </Label>
        {trailing}
      </div>
      <div className="relative group">
        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10 h-10 bg-background border-border/60 rounded-lg text-[13px] focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 transition-all"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground/70 pl-0.5">{hint}</p>}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="w-full h-10 lavender-gradient text-primary-foreground font-medium rounded-lg text-[13px] group mt-1.5"
    >
      {loading ? (
        <motion.div
          className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        <span className="flex items-center gap-1.5">
          {label}
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      )}
    </Button>
  );
}
