import { cn } from '@/lib/utils';
import type { StatusTone } from '@/components/status-badge';

const TONE_FILL_CLASS: Record<StatusTone, string> = {
  good: 'bg-status-good-fg',
  warn: 'bg-status-warn-fg',
  bad: 'bg-status-bad-fg',
  info: 'bg-status-info-fg',
  neutral: 'bg-primary',
};

/** Compact horizontal proportion bar — cost-vs-quote breakdowns, aging-receivables rows. */
export function MiniBar({
  value,
  max,
  tone = 'neutral',
  className,
}: {
  value: number;
  max: number;
  tone?: StatusTone;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full', TONE_FILL_CLASS[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
