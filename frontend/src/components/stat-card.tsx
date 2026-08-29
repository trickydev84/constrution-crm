import { cn } from '@/lib/utils';
import type { StatusTone } from '@/components/status-badge';

const DELTA_TONE_CLASS: Record<StatusTone, string> = {
  good: 'text-status-good-fg',
  warn: 'text-status-warn-fg',
  bad: 'text-status-bad-fg',
  info: 'text-status-info-fg',
  neutral: 'text-text-subtle',
};

/** Dashboard/summary metric tile: micro-label, mono value, optional toned delta line. */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: StatusTone;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn('shadow-card rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="label-micro">{label}</span>
        {Icon && <Icon className="size-4 text-text-faint" />}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      {delta && <div className={cn('mt-1 text-xs font-medium', DELTA_TONE_CLASS[deltaTone])}>{delta}</div>}
    </div>
  );
}
