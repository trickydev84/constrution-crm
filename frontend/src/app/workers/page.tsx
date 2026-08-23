'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ShieldAlert, Star } from 'lucide-react';
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
  createWorker,
  getMyPermissions,
  listProjects,
  listWorkers,
  updateWorkerAvailability,
  type MyPermission,
  type Project,
  type Worker,
} from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';

// Matches backend/src/modules/workers/worker.constants.ts's WORKER_SKILL_CATEGORIES — not
// PRD-specified, invented for this module. Update both if either changes.
const WORKER_SKILL_CATEGORIES = ['MASON', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'PAINTER', 'MARBLE_WORKER', 'WELDER'];
const WORKER_AVAILABILITY_STATUSES = ['AVAILABLE', 'ASSIGNED', 'ON_LEAVE', 'INACTIVE'];

function titleCase(value: string) {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function availabilityBadgeClass(status: string) {
  if (status === 'AVAILABLE') return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400';
  if (status === 'ASSIGNED') return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-400';
  if (status === 'ON_LEAVE') return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400';
  return 'border-border bg-muted text-muted-foreground';
}

const EMPTY_WORKER_FORM = { name: '', phone: '', skillCategory: 'MASON', dailyWage: '', assignedProjectId: '', rating: '', notes: '' };

export default function WorkersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewWorker, setShowNewWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState(EMPTY_WORKER_FORM);
  const [submittingWorker, setSubmittingWorker] = useState(false);
  const [changingAvailabilityId, setChangingAvailabilityId] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setChecking(false);
    if (u.role === 'SUPERADMIN') {
      refreshAll();
    } else {
      getMyPermissions()
        .then((rows) => {
          setPermissions(rows);
          if (rows.find((p) => p.resource === 'WORKERS')?.canView) refreshAll();
        })
        .catch(() => setPermissions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshAll() {
    refreshWorkers();
    refreshProjects();
  }

  async function refreshWorkers() {
    setLoadingWorkers(true);
    try {
      const res = await listWorkers();
      setWorkers(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load workers');
    } finally {
      setLoadingWorkers(false);
    }
  }

  // Fetched for two things: resolving Worker.assignedProjectId -> project name (not validated/not a
  // Mongoose ref — same client-side join pattern used everywhere else), and populating the "New worker"
  // project picker.
  async function refreshProjects() {
    try {
      const res = await listProjects();
      setProjects(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load projects');
    }
  }

  async function handleCreateWorker(e: FormEvent) {
    e.preventDefault();
    setSubmittingWorker(true);
    try {
      await createWorker({
        name: workerForm.name,
        phone: workerForm.phone,
        skillCategory: workerForm.skillCategory,
        dailyWage: workerForm.dailyWage ? Number(workerForm.dailyWage) : undefined,
        assignedProjectId: workerForm.assignedProjectId || undefined,
        rating: workerForm.rating ? Number(workerForm.rating) : undefined,
        notes: workerForm.notes || undefined,
      });
      toast.success(`Worker "${workerForm.name}" added`);
      setWorkerForm(EMPTY_WORKER_FORM);
      setShowNewWorker(false);
      await refreshWorkers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add worker');
    } finally {
      setSubmittingWorker(false);
    }
  }

  async function handleAvailabilityChange(id: string, availabilityStatus: string) {
    setChangingAvailabilityId(id);
    try {
      await updateWorkerAvailability(id, availabilityStatus);
      toast.success(`Availability updated to ${titleCase(availabilityStatus)}`);
      await refreshWorkers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update availability');
    } finally {
      setChangingAvailabilityId(null);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  const canView = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'WORKERS')?.canView === true;
  const canWrite = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'WORKERS')?.canWrite === true;

  if (permissions !== null && user.role !== 'SUPERADMIN' && !canView) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Access restricted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your role ({user.role}) doesn&apos;t have <code>WORKERS:view</code> access. Ask a SUPERADMIN
              to grant it from the Permissions page.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>Back to dashboard</Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const projectNameById = new Map(projects.map((p) => [p._id, p.name]));

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b p-6">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workers</h1>
            <p className="mt-1 text-sm text-muted-foreground">Roster, skills, project assignment, and availability.</p>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>All workers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loadingWorkers ? 'Loading…' : `${workers.length} worker${workers.length === 1 ? '' : 's'}`}
                </p>
              </div>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setShowNewWorker(true)}>
                  <Plus />
                  New worker
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingWorkers ? (
                <Skeleton className="h-32 w-full" />
              ) : workers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No workers yet{canWrite ? ' — add one above.' : '.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Skill</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Daily wage</TableHead>
                      <TableHead>Assigned project</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Availability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((w) => (
                      <TableRow key={w._id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell><Badge variant="secondary">{titleCase(w.skillCategory)}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{w.phone}</TableCell>
                        <TableCell>{w.dailyWage != null ? formatINR(w.dailyWage) : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-muted-foreground">{w.assignedProjectId ? (projectNameById.get(w.assignedProjectId) ?? 'Unknown project') : '—'}</TableCell>
                        <TableCell>
                          {w.rating != null ? (
                            <span className="flex items-center gap-1">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              {w.rating}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Select
                              value={w.availabilityStatus}
                              onValueChange={(v) => v && handleAvailabilityChange(w._id, v)}
                              disabled={changingAvailabilityId === w._id}
                            >
                              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {WORKER_AVAILABILITY_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={availabilityBadgeClass(w.availabilityStatus)}>{titleCase(w.availabilityStatus)}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={showNewWorker} onOpenChange={setShowNewWorker}>
        <DialogContent>
          <form onSubmit={handleCreateWorker}>
            <DialogHeader>
              <DialogTitle>New worker</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="worker-name">Name</Label>
                <Input id="worker-name" required value={workerForm.name} onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="worker-phone">Phone</Label>
                  <Input id="worker-phone" required value={workerForm.phone} onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="worker-skill">Skill category</Label>
                  <Select value={workerForm.skillCategory} onValueChange={(v) => setWorkerForm({ ...workerForm, skillCategory: v ?? 'MASON' })}>
                    <SelectTrigger id="worker-skill" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORKER_SKILL_CATEGORIES.map((s) => (
                        <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="worker-wage">Daily wage (₹)</Label>
                  <Input id="worker-wage" type="number" min="0" value={workerForm.dailyWage} onChange={(e) => setWorkerForm({ ...workerForm, dailyWage: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="worker-rating">Rating (1–5)</Label>
                  <Input id="worker-rating" type="number" min="1" max="5" value={workerForm.rating} onChange={(e) => setWorkerForm({ ...workerForm, rating: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="worker-project">Assigned project</Label>
                <Select
                  value={workerForm.assignedProjectId}
                  onValueChange={(v) => setWorkerForm({ ...workerForm, assignedProjectId: v ?? '' })}
                  disabled={projects.length === 0}
                >
                  <SelectTrigger id="worker-project" className="w-full">
                    <SelectValue placeholder={projects.length === 0 ? 'No projects yet' : 'Unassigned'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="worker-notes">Notes</Label>
                <Input id="worker-notes" value={workerForm.notes} onChange={(e) => setWorkerForm({ ...workerForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewWorker(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingWorker}>
                {submittingWorker ? 'Adding…' : 'Add worker'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
