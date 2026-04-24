import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Lucide icon to render in the glass chip */
  icon: LucideIcon;
  /** Plain title text — will be split: first word(s) white, last word gradient */
  title: string;
  /** Optional: render the entire title as gradient (instead of last word only) */
  gradientTitle?: boolean;
  /** Subtitle / description below the title */
  subtitle?: string;
  /** Right-side actions (buttons, filters) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Auth-inspired page header — navy surface, glow blobs, gradient display title.
 * Standardizes spacing and visual identity across the entire system.
 */
export function PageHeader({
  icon: Icon,
  title,
  gradientTitle = false,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  // Split title: last word gets the gradient (unless gradientTitle=true)
  const renderTitle = () => {
    if (gradientTitle) {
      return <span className="display-gradient">{title}</span>;
    }
    const words = title.trim().split(' ');
    if (words.length === 1) {
      return <span className="display-gradient">{title}</span>;
    }
    const last = words.pop();
    return (
      <>
        {words.join(' ')} <span className="display-gradient">{last}</span>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('hero-navy relative p-6 sm:p-8', className)}
    >
      {/* Decorative glows */}
      <motion.div
        aria-hidden
        className="glow-blob glow-blob-primary w-48 h-48 -top-12 -left-12"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="glow-blob glow-blob-accent w-56 h-56 -bottom-16 -right-10"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Subtle dot pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 rounded-2xl glass-on-dark shrink-0">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white truncate">
              {renderTitle()}
            </h1>
            {subtitle && (
              <p className="text-sm text-white/70 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </motion.div>
  );
}
