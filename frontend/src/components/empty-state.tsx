import { cn } from '@/lib/utils';

/** Icon + message shown in place of a list/table when it has zero real rows. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center', className)}>
      {Icon && <Icon className="size-8 text-text-faint" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-text-subtle">{description}</p>}
      {action}
    </div>
  );
}
