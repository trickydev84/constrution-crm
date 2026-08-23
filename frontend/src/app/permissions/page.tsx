'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { deletePermission, listPermissions, updatePermission, type Permission } from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';

// Mirrors backend/src/common/contracts/index.ts's Role/Resource enums. SUPERADMIN is deliberately
// excluded from this grid — PermissionsGuard bypasses it entirely, so any row shown for it here would
// be cosmetic only and could misleadingly suggest it's configurable when it isn't.
const ROLES = ['ADMIN', 'SALES', 'PROJECT_MANAGER', 'SUPERVISOR', 'ACCOUNTANT', 'CUSTOMER'];
const RESOURCES = ['LEADS', 'CUSTOMERS', 'PROJECTS', 'QUOTATIONS', 'WORKERS', 'MATERIALS', 'PERMISSIONS'];

function titleCase(value: string) {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export default function PermissionsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setChecking(false);
    if (u.role === 'SUPERADMIN') refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listPermissions();
      setPermissions(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load permissions');
    } finally {
      setLoading(false);
    }
  }

  function entryFor(role: string, resource: string) {
    return permissions.find((p) => p.role === role && p.resource === resource);
  }

  async function handleToggle(role: string, resource: string, field: 'canView' | 'canWrite' | 'canDelete', value: boolean) {
    const key = `${role}:${resource}`;
    setSavingKey(key);
    try {
      await updatePermission(role, resource, { [field]: value });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update permission');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleReset(role: string, resource: string) {
    const key = `${role}:${resource}`;
    setSavingKey(key);
    try {
      await deletePermission(role, resource);
      toast.success(`Cleared ${titleCase(role)} → ${titleCase(resource)}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not clear permission');
    } finally {
      setSavingKey(null);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  if (user.role !== 'SUPERADMIN') {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Access restricted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Permissions management is SUPERADMIN-only. Your role ({user.role}) doesn&apos;t have access to
              this page — the backend would reject these calls with a 403 even if you could see this UI.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>Back to dashboard</Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b p-6">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure which roles can view/write/delete each resource. Changes take effect immediately —
              no restart, no deploy. SUPERADMIN always has full access and isn&apos;t shown below.
            </p>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Role × resource matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead className="text-center">View</TableHead>
                        <TableHead className="text-center">Write</TableHead>
                        <TableHead className="text-center">Delete</TableHead>
                        <TableHead className="text-right">Clear</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ROLES.map((role) =>
                        RESOURCES.map((resource, i) => {
                          const entry = entryFor(role, resource);
                          const key = `${role}:${resource}`;
                          const isSaving = savingKey === key;
                          const hasGrant = !!(entry?.canView || entry?.canWrite || entry?.canDelete);
                          return (
                            <TableRow key={key} className={i === 0 ? 'border-t-2' : undefined}>
                              <TableCell className="font-medium">{i === 0 ? titleCase(role) : ''}</TableCell>
                              <TableCell className="text-muted-foreground">{titleCase(resource)}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={entry?.canView ?? false}
                                  disabled={isSaving}
                                  onCheckedChange={(checked) => handleToggle(role, resource, 'canView', checked === true)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={entry?.canWrite ?? false}
                                  disabled={isSaving}
                                  onCheckedChange={(checked) => handleToggle(role, resource, 'canWrite', checked === true)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={entry?.canDelete ?? false}
                                  disabled={isSaving}
                                  onCheckedChange={(checked) => handleToggle(role, resource, 'canDelete', checked === true)}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={isSaving || !hasGrant}
                                  onClick={() => handleReset(role, resource)}
                                  title="Remove this row entirely (same effect as clearing all three, but tidier)"
                                >
                                  <X className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        }),
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
