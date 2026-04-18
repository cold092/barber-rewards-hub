import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from './PageTransition';
import { GlobalFilterBar } from '@/components/filters/GlobalFilterBar';
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Scissors, 
  Filter,
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
  ChevronDown,
  Sun,
  Moon,
  Crown,
  Shield,
  Briefcase,
  Eye,
  Gift,
  ClipboardPlus,
  Contact,
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
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/clientes', label: 'Clientes', icon: UserCheck },
  { 
    path: '/cadastro', 
    label: 'Cadastro', 
    icon: ClipboardPlus,
    children: [
      { path: '/cadastro/cliente', label: 'Cliente', icon: Contact },
      { path: '/cadastro/lead', label: 'Lead', icon: UserPlus },
    ],
  },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/resgates', label: 'Resgates', icon: Gift },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
  { path: '/equipe', label: 'Gerenciar Equipe', icon: Users, adminOnly: true },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, signOut, isAdmin } = useAuth();
  const { isViewingAs, viewAsProfile, clearViewAs } = useViewAs();
  const { hasActiveFilters } = useGlobalFilter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showGlobalFilter, setShowGlobalFilter] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.children?.some(child => location.pathname === child.path)) {
        initial[item.path] = true;
      }
    });
    return initial;
  });
  const { theme, toggleTheme } = useTheme();

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
  };
  
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
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 relative", (showGlobalFilter || hasActiveFilters) && "text-primary")}
              onClick={() => setShowGlobalFilter(!showGlobalFilter)}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
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
          <div className={cn("p-3 pb-2", collapsed && "lg:px-2.5")}>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "shrink-0 rounded-lg lavender-gradient lavender-glow flex items-center justify-center transition-all",
                collapsed ? "w-9 h-9 lg:w-10 lg:h-10" : "w-9 h-9"
              )}>
                <Scissors className="w-[18px] h-[18px] text-primary-foreground" />
              </div>
              <div className={cn("min-w-0 transition-opacity duration-200", collapsed && "lg:hidden")}>
                <h1 className="font-display font-bold lavender-text text-base leading-tight">Growth Game</h1>
                <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide uppercase">Sistema de Crescimento</p>
              </div>
            </div>
          </div>

          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:flex px-3 mb-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")} />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

          {/* Navigation */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3 space-y-0.5">
            <TooltipProvider delayDuration={0}>
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const hasChildren = item.children && item.children.length > 0;
                const isChildActive = hasChildren && item.children!.some(child => location.pathname === child.path);
                const isExpanded = expandedMenus[item.path] || false;

                if (hasChildren) {
                  const parentButton = (
                    <button
                      key={item.path}
                      className={cn(
                        "nav-item w-full flex items-center gap-2.5 text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200",
                        collapsed ? "lg:justify-center lg:px-0 lg:py-2 px-2.5 py-2" : "px-2.5 py-2",
                        isChildActive && "text-sidebar-primary"
                      )}
                      onClick={() => {
                        if (collapsed) {
                          navigate(item.children![0].path);
                          setSidebarOpen(false);
                        } else {
                          toggleMenu(item.path);
                        }
                      }}
                    >
                      <item.icon className={cn(
                        "shrink-0 transition-colors",
                        collapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
                        isChildActive ? "text-primary" : "text-sidebar-foreground/50"
                      )} />
                      <span className={cn("truncate flex-1 text-left", collapsed && "lg:hidden")}>{item.label}</span>
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-sidebar-foreground/40",
                        isExpanded && "rotate-180",
                        collapsed && "lg:hidden"
                      )} />
                    </button>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>
                          {parentButton}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="hidden lg:block font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <div key={item.path}>
                      {parentButton}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-4 pl-3 border-l border-sidebar-border/40 space-y-0.5 py-1">
                              {item.children!.map(child => {
                                const childActive = location.pathname === child.path;
                                return (
                                  <button
                                    key={child.path}
                                    className={cn(
                                      "nav-item w-full flex items-center gap-2.5 text-[13px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 px-2.5 py-2 rounded-lg",
                                      childActive && "nav-item-active text-sidebar-primary bg-sidebar-accent"
                                    )}
                                    onClick={() => {
                                      navigate(child.path);
                                      setSidebarOpen(false);
                                    }}
                                  >
                                    <child.icon className={cn(
                                      "h-4 w-4 shrink-0",
                                      childActive ? "text-primary" : "text-sidebar-foreground/40"
                                    )} />
                                    <span className="truncate">{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                const navButton = (
                  <button
                    key={item.path}
                    className={cn(
                      "nav-item w-full flex items-center gap-2.5 text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200",
                      collapsed ? "lg:justify-center lg:px-0 lg:py-2 px-2.5 py-2" : "px-2.5 py-2",
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
                      "w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 rounded-lg transition-colors duration-200",
                      collapsed && "lg:justify-center lg:px-0"
                    )}
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-[17px] w-[17px] shrink-0" />
                    ) : (
                      <Moon className="h-[17px] w-[17px] shrink-0" />
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

        {/* Desktop filter toggle bar */}
        <div className="hidden lg:flex items-center justify-end px-6 pt-3 pb-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 text-xs font-medium relative",
              (showGlobalFilter || hasActiveFilters) && "text-primary"
            )}
            onClick={() => setShowGlobalFilter(!showGlobalFilter)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros globais
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        {/* Global Filter Bar */}
        <AnimatePresence>
          {showGlobalFilter && <GlobalFilterBar />}
        </AnimatePresence>

        <div className="p-3 lg:px-6 lg:pb-6 lg:pt-3 max-w-[1600px]">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
