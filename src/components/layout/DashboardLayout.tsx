import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from './PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  ChevronLeft,
  Sun,
  Moon,
  Crown,
  Shield,
  Briefcase,
  Eye,
} from 'lucide-react';
import { ViewAsSelector } from './ViewAsSelector';
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
  const { isViewingAs, viewAsProfile, clearViewAs } = useViewAs();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

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
          "fixed top-0 left-0 z-40 h-screen bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/40 transition-all duration-300 ease-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0",
          `lg:${sidebarWidth}`
        )}
        style={{ width: sidebarOpen ? 260 : undefined }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={cn("p-4 pb-3", collapsed && "lg:px-3")}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "shrink-0 rounded-xl lavender-gradient lavender-glow flex items-center justify-center transition-all",
                collapsed ? "w-10 h-10 lg:w-11 lg:h-11" : "w-10 h-10"
              )}>
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className={cn("min-w-0 transition-opacity duration-200", collapsed && "lg:hidden")}>
                <h1 className="font-display font-bold lavender-text text-lg leading-tight">Growth Game</h1>
                <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide uppercase">Sistema de Crescimento</p>
              </div>
            </div>
          </div>

          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:flex px-3 mb-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

          {/* Navigation */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
            <TooltipProvider delayDuration={0}>
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const navButton = (
                  <button
                    key={item.path}
                    className={cn(
                      "nav-item w-full flex items-center gap-3 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200",
                      collapsed ? "lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5" : "px-3 py-2.5",
                      isActive && "nav-item-active text-sidebar-primary bg-sidebar-accent"
                    )}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className={cn(
                      "shrink-0 transition-colors",
                      collapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
                      isActive ? "text-primary" : "text-sidebar-foreground/50"
                    )} />
                    <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        {navButton}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="hidden lg:block font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navButton;
              })}
            </TooltipProvider>
          </nav>

          {/* Theme Toggle */}
          <div className="px-3">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 rounded-lg transition-colors duration-200",
                      collapsed && "lg:justify-center lg:px-0"
                    )}
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-[18px] w-[18px] shrink-0" />
                    ) : (
                      <Moon className="h-[18px] w-[18px] shrink-0" />
                    )}
                    <span className={cn("truncate", collapsed && "lg:hidden")}>
                      {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                    </span>
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="hidden lg:block font-medium">
                    {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* View As Selector (admin only) */}
          {isAdmin && (
            <div className="px-3 pb-2">
              <ViewAsSelector collapsed={collapsed} />
            </div>
          )}

          {/* User Info & Logout */}
          <div className="p-3">
            <div className="mx-1 mb-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
            <div className={cn(
              "p-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30",
              collapsed && "lg:p-2"
            )}>
              <div className="flex items-center gap-2.5">
                <Avatar className={cn(
                  "shrink-0 border-2",
                  role === 'owner' ? "border-amber-400/50" : role === 'admin' ? "border-blue-400/50" : "border-primary/30",
                  collapsed ? "h-9 w-9" : "h-9 w-9"
                )}>
                  <AvatarFallback className={cn(
                    "text-xs font-semibold",
                    role === 'owner' ? "bg-amber-500/15 text-amber-400" : role === 'admin' ? "bg-blue-500/15 text-blue-400" : "bg-primary/15 text-primary"
                  )}>
                    {getInitials(profile?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
                  <p className="font-medium text-sm truncate text-sidebar-foreground">{profile?.name || 'Usuário'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {role === 'owner' ? (
                      <>
                        <Crown className="h-3 w-3 text-amber-400" />
                        <span className="text-[11px] text-amber-400 font-semibold">Dono</span>
                      </>
                    ) : role === 'admin' ? (
                      <>
                        <Shield className="h-3 w-3 text-blue-400" />
                        <span className="text-[11px] text-blue-400 font-semibold">Admin</span>
                      </>
                    ) : role === 'barber' ? (
                      <>
                        <Briefcase className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[11px] text-muted-foreground/60 font-medium">Colaborador</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60 font-medium">Cliente</span>
                    )}
                  </div>
                </div>
                <div className={cn(collapsed && "lg:hidden")}>
                  <NotificationCenter />
                </div>
              </div>
              {profile && !collapsed && (
                <div className="mt-2 flex items-center gap-2 lg:flex">
                  <span className="text-[11px] text-muted-foreground/50 font-medium">Saldo:</span>
                  <span className="text-sm font-semibold text-primary">{profile.wallet_balance} pts</span>
                </div>
              )}
            </div>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 mt-1 text-sm font-medium text-muted-foreground/60 hover:text-destructive rounded-lg transition-colors duration-200",
                      collapsed && "lg:justify-center lg:px-0"
                    )}
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                    <span className={cn(collapsed && "lg:hidden")}>Sair</span>
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="hidden lg:block font-medium">
                    Sair
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
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
      <main 
        className={cn(
          "pt-16 lg:pt-0 min-h-screen transition-all duration-300",
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        )}
      >
        {isViewingAs && (
          <div className="sticky top-0 lg:top-0 z-20 bg-amber-500/15 border-b border-amber-500/25 px-4 py-2 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Visualizando como <strong>{viewAsProfile?.name}</strong>
              </span>
            </div>
            <button
              onClick={clearViewAs}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Voltar à minha visão
            </button>
          </div>
        )}
        <div className="p-4 lg:p-8 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
