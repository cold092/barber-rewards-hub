import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logo.png';

interface LogoProps {
  size?: number;
  className?: string;
  /** Adds a subtle glow shadow behind the mark */
  glow?: boolean;
}

/**
 * Brand logo mark for Growth Game.
 * Used in sidebar, mobile header, and Auth screen.
 */
export function Logo({ size = 36, className, glow = false }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Growth Game"
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        'object-contain shrink-0',
        glow && 'drop-shadow-[0_4px_18px_hsl(var(--primary)/0.45)]',
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
