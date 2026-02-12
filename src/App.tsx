import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TagFilterProvider } from "@/contexts/TagFilterContext";
import { LeadTagConfigProvider, ClientTagConfigProvider } from "@/contexts/TagConfigContext";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Leads from "./pages/Leads";
import Clients from "./pages/Clients";
import NewReferral from "./pages/NewReferral";
import Ranking from "./pages/Ranking";
import ManageTeam from "./pages/ManageTeam";
import Reports from "./pages/Reports";
import WhatsApp from "./pages/WhatsApp";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}


// Admin-only route component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Auth route - redirects to dashboard if logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <LeadTagConfigProvider>
            <Dashboard />
          </LeadTagConfigProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/leads"
      element={
        <ProtectedRoute>
          <LeadTagConfigProvider>
            <Leads />
          </LeadTagConfigProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/clientes"
      element={
        <ProtectedRoute>
          <ClientTagConfigProvider>
            <Clients />
          </ClientTagConfigProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/nova-indicacao"
      element={
        <ProtectedRoute>
          <LeadTagConfigProvider>
            <NewReferral />
          </LeadTagConfigProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/ranking"
      element={
        <ProtectedRoute>
          <Ranking />
        </ProtectedRoute>
      }
    />
    <Route
      path="/relatorios"
      element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp"
      element={
        <AdminRoute>
          <LeadTagConfigProvider>
            <WhatsApp />
          </LeadTagConfigProvider>
        </AdminRoute>
      }
    />
    <Route
      path="/configuracoes"
      element={
        <ProtectedRoute>
          <LeadTagConfigProvider>
            <SettingsPage />
          </LeadTagConfigProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/equipe"
      element={
        <ProtectedRoute>
          <ManageTeam />
        </ProtectedRoute>
      }
    />
    <Route
      path="/auth"
      element={
        <AuthRoute>
          <Auth />
        </AuthRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TagFilterProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TagFilterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
