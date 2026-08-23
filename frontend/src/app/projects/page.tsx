'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ShieldAlert } from 'lucide-react';
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
  createProject,
  getMyPermissions,
  listCustomers,
  listProjects,
  updateProjectStage,
  type Customer,
  type MyPermission,
  type Project,
} from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';

// Matches backend/src/common/contracts/index.ts's ProjectStage enum exactly, in pipeline order.
// Not enum-validated by the backend (UpdateProjectStageDto accepts any string) — this list is a frontend
// convenience for the picker, not an enforced contract.
const PROJECT_STAGES = ['PLANNING', 'FOUNDATION', 'STRUCTURE', 'BRICKWORK', 'PLUMBING', 'ELECTRICAL', 'FLOORING', 'PAINTING', 'INTERIOR', 'INSPECTION', 'HANDOVER'];

function titleCase(value: string) {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const EMPTY_PROJECT_FORM = { name: '', customerId: '', budget: '', startDate: '', endDate: '', notes: '' };

export default function ProjectsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [changingStageId, setChangingStageId] = useState<string | null>(null);

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
          if (rows.find((p) => p.resource === 'PROJECTS')?.canView) refreshAll();
        })
        .catch(() => setPermissions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshAll() {
    refreshProjects();
    refreshCustomers();
  }

  async function refreshProjects() {
    setLoadingProjects(true);
    try {
      const res = await listProjects();
      setProjects(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load projects');
    } finally {
      setLoadingProjects(false);
    }
  }

  // Fetched for two things: resolving Project.customerId -> customer name (not a Mongoose ref, same
  // client-side join pattern as the dashboard), and populating the "New project" customer picker.
  async function refreshCustomers() {
    try {
      const res = await listCustomers();
      setCustomers(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load customers');
    }
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    setSubmittingProject(true);
    try {
      await createProject({
        name: projectForm.name,
        customerId: projectForm.customerId,
        budget: projectForm.budget ? Number(projectForm.budget) : undefined,
        startDate: projectForm.startDate || undefined,
        endDate: projectForm.endDate || undefined,
        notes: projectForm.notes || undefined,
      });
      toast.success(`Project "${projectForm.name}" created`);
      setProjectForm(EMPTY_PROJECT_FORM);
      setShowNewProject(false);
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setSubmittingProject(false);
    }
  }

  async function handleStageChange(id: string, stage: string) {
    setChangingStageId(id);
    try {
      await updateProjectStage(id, stage);
      toast.success(`Stage updated to ${titleCase(stage)}`);
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update stage');
    } finally {
      setChangingStageId(null);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  const canView = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'PROJECTS')?.canView === true;
  const canWrite = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'PROJECTS')?.canWrite === true;

  if (permissions !== null && user.role !== 'SUPERADMIN' && !canView) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Access restricted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your role ({user.role}) doesn&apos;t have <code>PROJECTS:view</code> access. Ask a SUPERADMIN
              to grant it from the Permissions page.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>Back to dashboard</Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const customerNameById = new Map(customers.map((c) => [c._id, c.name]));

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b p-6">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">All projects, stage tracking, and budgets.</p>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>All projects</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loadingProjects ? 'Loading…' : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
                </p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewProject(true)}
                  disabled={customers.length === 0}
                >
                  <Plus />
                  New project
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <Skeleton className="h-32 w-full" />
              ) : projects.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No projects yet{canWrite ? ' — create one above, or convert a WON lead into a customer first.' : '.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Start date</TableHead>
                      <TableHead>End date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{customerNameById.get(p.customerId) ?? 'Unknown customer'}</TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Select
                              value={p.stage}
                              onValueChange={(v) => v && handleStageChange(p._id, v)}
                              disabled={changingStageId === p._id}
                            >
                              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PROJECT_STAGES.map((s) => (
                                  <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">{titleCase(p.stage)}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.progressPercent != null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${p.progressPercent}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{p.progressPercent}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{p.budget != null ? formatINR(p.budget) : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-muted-foreground">{p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Name</Label>
                <Input id="project-name" required value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-customer">Customer</Label>
                <Select
                  value={projectForm.customerId}
                  onValueChange={(v) => setProjectForm({ ...projectForm, customerId: v ?? '' })}
                  disabled={customers.length === 0}
                >
                  <SelectTrigger id="project-customer" className="w-full">
                    <SelectValue placeholder={customers.length === 0 ? 'No customers yet' : 'Select customer'} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No customers yet — convert a WON lead into one first.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-budget">Budget (₹)</Label>
                <Input
                  id="project-budget"
                  type="number"
                  min="0"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-start">Start date</Label>
                  <Input
                    id="project-start"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-end">End date</Label>
                  <Input
                    id="project-end"
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-notes">Notes</Label>
                <Input id="project-notes" value={projectForm.notes} onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewProject(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingProject || !projectForm.customerId}>
                {submittingProject ? 'Creating…' : 'Create project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
