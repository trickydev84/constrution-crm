import { cn } from '@/lib/utils';

/** Pill-style view toggle (e.g. list/kanban, guided/sheet) — a controlled alternative to tabs. */
export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            opt.value === value
              ? 'bg-card text-foreground shadow-card'
              : 'text-text-subtle hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
