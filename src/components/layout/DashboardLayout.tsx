import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
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
  { path: '/nova-indicacao', label: 'Nova Indicação', icon: UserPlus },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { path: '/equipe', label: 'Gerenciar Equipe', icon: Settings, adminOnly: true },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Filter nav items based on role
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);
  const showReports = isAdmin;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold gold-text">Growth Game</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gold-gradient gold-glow flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold gold-text text-lg">Growth Game</h1>
                <p className="text-xs text-muted-foreground">Sistema de Crescimento</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-4">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    isActive && "bg-sidebar-accent text-primary"
                  )}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {item.label}
                </Button>
              );
            })}
            {showReports && (
              <div className="space-y-2">
                <p className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Relatórios
                </p>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    location.pathname === '/relatorios' && "bg-sidebar-accent text-primary"
                  )}
                  onClick={() => {
                    navigate('/relatorios');
                    setSidebarOpen(false);
                  }}
                >
                  <UserCheck className={cn("h-5 w-5", location.pathname === '/relatorios' && "text-primary")} />
                  Visualizar relatórios
                </Button>
              </div>
            )}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="mb-4 p-3 rounded-lg bg-sidebar-accent/50">
              <p className="font-medium text-sm truncate">{profile?.name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {role === 'admin' ? 'Administrador' : role === 'barber' ? 'Barbeiro' : 'Cliente'}
              </p>
              {profile && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Saldo:</span>
                  <span className="text-sm font-semibold text-primary">{profile.wallet_balance} pts</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
