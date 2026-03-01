import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { 
  Scissors, 
  LayoutDashboard, 
  Users, 
  Trophy, 
  UserPlus,
  LogOut,
  Menu,
  X,
  Settings,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/clientes', label: 'Clientes', icon: UserCheck },
  { path: '/nova-indicacao', label: 'Nova Indicação', icon: UserPlus },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
  { path: '/equipe', label: 'Gerenciar Equipe', icon: Users, adminOnly: true },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar/90 backdrop-blur-xl border-b border-sidebar-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg lavender-gradient flex items-center justify-center shadow-sm">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold lavender-text text-sm">Growth Game</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-[260px] bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/40 transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl lavender-gradient lavender-glow flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold lavender-text text-lg leading-tight">Growth Game</h1>
                <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide uppercase">Sistema de Crescimento</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

          {/* Navigation */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  className={cn(
                    "nav-item w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                    isActive && "nav-item-active text-sidebar-primary bg-sidebar-accent"
                  )}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground/50"
                  )} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-3">
            <div className="mx-1 mb-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
            <div className="p-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate text-sidebar-foreground">{profile?.name || 'Usuário'}</p>
                  <p className="text-[11px] text-muted-foreground/60 capitalize font-medium">
                    {role === 'owner' ? 'Dono' : role === 'admin' ? 'Administrador' : role === 'barber' ? 'Colaborador' : 'Cliente'}
                  </p>
                </div>
                <NotificationCenter />
              </div>
              {profile && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground/50 font-medium">Saldo:</span>
                  <span className="text-sm font-semibold text-primary">{profile.wallet_balance} pts</span>
                </div>
              )}
            </div>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 text-sm font-medium text-muted-foreground/60 hover:text-destructive rounded-lg transition-colors duration-200"
              onClick={handleSignOut}
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-[260px] pt-16 lg:pt-0 min-h-screen">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="p-4 lg:p-8 max-w-[1600px]"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
