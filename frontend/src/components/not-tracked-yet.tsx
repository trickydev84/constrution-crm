import { CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Enforces this project's "never silently mix real and fake data" rule: a dashboard band or panel
 * whose real data source doesn't exist yet (in the current phase) renders this instead of a mock
 * number or a placeholder zero. Once the backing endpoint ships, replace the usage — don't leave it
 * wired to fabricated data in the meantime.
 */
export function NotTrackedYet({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-text-subtle',
        className,
      )}
    >
      <CircleDashed className="size-4 shrink-0" />
      <span>{label} isn&apos;t tracked yet</span>
    </div>
  );
}
