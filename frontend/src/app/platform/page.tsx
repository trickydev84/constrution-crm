'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  approveOrganization,
  getOrganizationUsage,
  getPlatformStats,
  listOrganizations,
  reactivateOrganization,
  rejectOrganization,
  suspendOrganization,
  type Organization,
  type OrganizationUsage,
  type PlatformStats,
} from '@/lib/platform-api';
import { clearPlatformSession, getPlatformAdmin, type PlatformAdmin } from '@/lib/platform-auth';

const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'] as const;

function statusBadgeClass(status: string) {
  if (status === 'ACTIVE') return 'border-status-good-fg/30 bg-status-good-bg text-status-good-fg';
  if (status === 'PENDING') return 'border-status-warn-fg/30 bg-status-warn-bg text-status-warn-fg';
  if (status === 'SUSPENDED') return 'border-status-bad-fg/30 bg-status-bad-bg text-status-bad-fg';
  return 'border-border bg-muted text-muted-foreground';
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [reasonDialog, setReasonDialog] = useState<{ org: Organization; action: 'reject' | 'suspend' } | null>(null);
  const [reason, setReason] = useState('');
  const [usageDialog, setUsageDialog] = useState<Organization | null>(null);
  const [usage, setUsage] = useState<OrganizationUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    const a = getPlatformAdmin();
    if (!a) {
      router.replace('/platform/login');
      return;
    }
    setAdmin(a);
    setChecking(false);
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checking) refreshOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function refreshAll() {
    refreshStats();
    refreshOrgs();
  }

  async function refreshStats() {
    try {
      setStats(await getPlatformStats());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load stats');
    }
  }

  async function refreshOrgs() {
    setLoadingOrgs(true);
    try {
      const res = await listOrganizations(statusFilter === 'ALL' ? undefined : statusFilter);
      setOrgs(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load organizations');
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function handleApprove(org: Organization) {
    setBusyId(org._id);
    try {
      await approveOrganization(org._id);
      toast.success(`${org.name} approved`);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve organization');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(org: Organization) {
    setBusyId(org._id);
    try {
      await reactivateOrganization(org._id);
      toast.success(`${org.name} reactivated`);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reactivate organization');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReasonSubmit() {
    if (!reasonDialog) return;
    const { org, action } = reasonDialog;
    setBusyId(org._id);
    try {
      if (action === 'reject') await rejectOrganization(org._id, reason || undefined);
      else await suspendOrganization(org._id, reason || undefined);
      toast.success(`${org.name} ${action === 'reject' ? 'rejected' : 'suspended'}`);
      setReasonDialog(null);
      setReason('');
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${action} organization`);
    } finally {
      setBusyId(null);
    }
  }

  async function openUsage(org: Organization) {
    setUsageDialog(org);
    setUsage(null);
    setLoadingUsage(true);
    try {
      setUsage(await getOrganizationUsage(org._id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load usage');
    } finally {
      setLoadingUsage(false);
    }
  }

  function handleLogout() {
    clearPlatformSession();
    router.push('/platform/login');
  }

  if (checking || !admin) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Platform Admin</p>
            <p className="text-xs text-muted-foreground">{admin.name}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleLogout}>
          <LogOut />
          Logout
        </Button>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {(['total', 'pending', 'active', 'suspended', 'rejected'] as const).map((key) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{key}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? <p className="font-mono text-2xl font-semibold tabular-nums">{stats[key]}</p> : <Skeleton className="h-8 w-12" />}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Organizations</CardTitle>
              <p className="text-sm text-muted-foreground">{loadingOrgs ? 'Loading…' : `${orgs.length} shown`}</p>
            </div>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>{s === 'ALL' ? 'All statuses' : titleCase(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loadingOrgs ? (
              <Skeleton className="h-32 w-full" />
            ) : orgs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No organizations in this status.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Trial ends</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org) => (
                    <TableRow key={org._id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">{org.slug}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(org.status)}>{titleCase(org.status)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">{new Date(org.createdAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">{org.trialEndsAt ? new Date(org.trialEndsAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" disabled={busyId === org._id} onClick={() => openUsage(org)}>
                            Usage
                          </Button>
                          {org.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="outline" disabled={busyId === org._id} onClick={() => handleApprove(org)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" disabled={busyId === org._id} onClick={() => setReasonDialog({ org, action: 'reject' })}>
                                Reject
                              </Button>
                            </>
                          )}
                          {org.status === 'ACTIVE' && (
                            <Button size="sm" variant="outline" disabled={busyId === org._id} onClick={() => setReasonDialog({ org, action: 'suspend' })}>
                              Suspend
                            </Button>
                          )}
                          {org.status === 'SUSPENDED' && (
                            <Button size="sm" variant="outline" disabled={busyId === org._id} onClick={() => handleReactivate(org)}>
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!reasonDialog} onOpenChange={(open) => { if (!open) { setReasonDialog(null); setReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialog?.action === 'reject' ? 'Reject' : 'Suspend'} {reasonDialog?.org.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setReasonDialog(null); setReason(''); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleReasonSubmit} disabled={busyId === reasonDialog?.org._id}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!usageDialog} onOpenChange={(open) => { if (!open) setUsageDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{usageDialog?.name} — usage</DialogTitle>
          </DialogHeader>
          {loadingUsage || !usage ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3 py-2 text-sm">
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Users</span><span className="font-mono font-medium tabular-nums">{usage.users}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Leads</span><span className="font-mono font-medium tabular-nums">{usage.leads}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Customers</span><span className="font-mono font-medium tabular-nums">{usage.customers}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Projects</span><span className="font-mono font-medium tabular-nums">{usage.projects}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Quotations</span><span className="font-mono font-medium tabular-nums">{usage.quotations}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Workers</span><span className="font-mono font-medium tabular-nums">{usage.workers}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Materials</span><span className="font-mono font-medium tabular-nums">{usage.materials}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Material requests</span><span className="font-mono font-medium tabular-nums">{usage.materialRequests}</span></div>
              <div className="col-span-2 flex justify-between pt-1">
                <span className="text-muted-foreground">Last activity</span>
                <span className="font-mono font-medium tabular-nums">{usage.lastActivityAt ? new Date(usage.lastActivityAt).toLocaleString('en-IN') : '—'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
