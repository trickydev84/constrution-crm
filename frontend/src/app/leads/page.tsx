'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Plus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/app-sidebar';
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
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  convertLead,
  createLead,
  getMyPermissions,
  listLeads,
  updateLeadStatus,
  type Lead,
  type MyPermission,
} from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';

// Matches backend/src/common/contracts/index.ts's LeadStatus enum, in pipeline order. Not enum-validated
// by the backend (UpdateLeadStatusDto accepts any string) — this list is a frontend convenience for the
// picker, not an enforced contract.
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'SITE_VISIT', 'QUOTATION_SENT', 'NEGOTIATION', 'WON', 'LOST'];

// Lead.source has no backend enum (plain string in CreateLeadDto) — frontend-only constraint on the
// create form, matching the marketing channels in .ai/PRODUCT_SPEC.md.
const LEAD_SOURCES = ['Website', 'Referral', 'Google', 'Facebook', 'Instagram', 'WhatsApp', 'Walk-in', 'Other'];

function titleCase(value: string) {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function statusBadgeClass(status: string) {
  if (status === 'WON') return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400';
  if (status === 'LOST') return 'border-border bg-muted text-muted-foreground';
  if (status === 'NEGOTIATION' || status === 'QUOTATION_SENT') return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-400';
  return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400';
}

const EMPTY_LEAD_FORM = { name: '', phone: '', email: '', source: '', notes: '' };

export default function LeadsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [showNewLead, setShowNewLead] = useState(false);
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD_FORM);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setChecking(false);
    if (u.role === 'SUPERADMIN') {
      refreshLeads();
    } else {
      getMyPermissions()
        .then((rows) => {
          setPermissions(rows);
          if (rows.find((p) => p.resource === 'LEADS')?.canView) refreshLeads();
        })
        .catch(() => setPermissions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshLeads() {
    setLoadingLeads(true);
    try {
      const res = await listLeads();
      setLeads(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load leads');
    } finally {
      setLoadingLeads(false);
    }
  }

  async function handleCreateLead(e: FormEvent) {
    e.preventDefault();
    setSubmittingLead(true);
    try {
      await createLead({
        name: leadForm.name,
        phone: leadForm.phone,
        email: leadForm.email || undefined,
        source: leadForm.source || undefined,
        notes: leadForm.notes || undefined,
      });
      toast.success(`Lead "${leadForm.name}" created`);
      setLeadForm(EMPTY_LEAD_FORM);
      setShowNewLead(false);
      await refreshLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create lead');
    } finally {
      setSubmittingLead(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setChangingStatusId(id);
    try {
      await updateLeadStatus(id, status);
      toast.success(`Status updated to ${titleCase(status)}`);
      await refreshLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setChangingStatusId(null);
    }
  }

  async function handleConvert(id: string, name: string) {
    setConvertingId(id);
    try {
      await convertLead(id);
      toast.success(`"${name}" converted to a customer`);
      await refreshLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not convert lead');
    } finally {
      setConvertingId(null);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  const canView = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'LEADS')?.canView === true;
  const canWrite = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'LEADS')?.canWrite === true;

  if (permissions !== null && user.role !== 'SUPERADMIN' && !canView) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Access restricted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your role ({user.role}) doesn&apos;t have <code>LEADS:view</code> access. Ask a SUPERADMIN to
              grant it from the Permissions page.
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
            <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pipeline tracking, status updates, and conversion to customers.</p>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>All leads</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loadingLeads ? 'Loading…' : `${leads.length} lead${leads.length === 1 ? '' : 's'}`}
                </p>
              </div>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setShowNewLead(true)}>
                  <Plus />
                  New lead
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingLeads ? (
                <Skeleton className="h-32 w-full" />
              ) : leads.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No leads yet{canWrite ? ' — create one above.' : '.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      {canWrite && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((l) => (
                      <TableRow key={l._id}>
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell className="text-muted-foreground">{l.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{l.email || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{l.source || '—'}</TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Select
                              value={l.status}
                              onValueChange={(v) => v && handleStatusChange(l._id, v)}
                              disabled={changingStatusId === l._id}
                            >
                              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LEAD_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={statusBadgeClass(l.status)}>{titleCase(l.status)}</Badge>
                          )}
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            {l.status === 'WON' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={convertingId === l._id}
                                onClick={() => handleConvert(l._id, l.name)}
                                title="Convert to customer"
                              >
                                <ArrowRightLeft className="size-4" />
                                Convert
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
        <DialogContent>
          <form onSubmit={handleCreateLead}>
            <DialogHeader>
              <DialogTitle>New lead</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="lead-name">Name</Label>
                <Input id="lead-name" required value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input id="lead-phone" required value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-source">Source</Label>
                <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v ?? '' })}>
                  <SelectTrigger id="lead-source" className="w-full">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-notes">Notes</Label>
                <Input id="lead-notes" value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewLead(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingLead}>
                {submittingLead ? 'Creating…' : 'Create lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
