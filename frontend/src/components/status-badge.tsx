import { cn } from '@/lib/utils';

export type StatusTone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

const TONE_CLASS: Record<StatusTone, string> = {
  good: 'bg-status-good-bg text-status-good-fg',
  warn: 'bg-status-warn-bg text-status-warn-fg',
  bad: 'bg-status-bad-bg text-status-bad-fg',
  info: 'bg-status-info-bg text-status-info-fg',
  neutral: 'bg-muted text-muted-foreground',
};

/**
 * The design system's status vocabulary made concrete: green=good, amber=needs attention,
 * red=critical, blue=info. Never use these colors decoratively — every use should map to a real
 * status field.
 */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
