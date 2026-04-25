import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/clientes': 'Clientes',
  '/cadastro': 'Cadastro',
  '/cadastro/cliente': 'Cliente',
  '/cadastro/lead': 'Lead',
  '/ranking': 'Ranking',
  '/resgates': 'Resgates',
  '/relatorios': 'Relatórios',
  '/whatsapp': 'WhatsApp',
  '/configuracoes': 'Configurações',
  '/equipe': 'Gerenciar Equipe',
};

const buildCrumbs = (pathname: string) => {
  if (pathname === '/') {
    return [{ path: '/', label: routeLabels['/'] }];
  }

  const segments = pathname.split('/').filter(Boolean);
  return segments.map((_, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    return {
      path,
      label: routeLabels[path] ?? segments[index].replace(/-/g, ' '),
    };
  });
};

export function AppBreadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="gap-1 text-xs sm:text-sm">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
            <Link to="/">
              <Home className="h-3.5 w-3.5" />
              <span>CRM</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <BreadcrumbItem key={crumb.path} className="min-w-0">
              <BreadcrumbSeparator className="text-muted-foreground/50">
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              {isLast ? (
                <BreadcrumbPage className="truncate font-display font-semibold display-gradient">
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild className="truncate text-muted-foreground hover:text-primary">
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}