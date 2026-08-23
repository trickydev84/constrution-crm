'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  HardHat,
  IndianRupee,
  Package,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  getMyPermissions,
  listCustomers,
  listLeads,
  listMaterials,
  listProjects,
  listQuotations,
  listWorkers,
  type Customer,
  type Lead,
  type Material,
  type MyPermission,
  type Project,
  type Quotation,
  type Worker,
} from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';

// Displays a subset of LeadStatus (backend/src/common/contracts/index.ts) — matches the
// original mock's 5 stages; CONTACTED and LOST aren't shown on this chart.
const PIPELINE_STAGES: Array<[string, string]> = [
  ['NEW', 'New'],
  ['SITE_VISIT', 'Site visit'],
  ['QUOTATION_SENT', 'Quotation sent'],
  ['NEGOTIATION', 'Negotiation'],
  ['WON', 'Won'],
];

// Matches backend/src/common/contracts/index.ts's ProjectStage enum, in pipeline order.
const PROJECT_STAGES = ['PLANNING', 'FOUNDATION', 'STRUCTURE', 'BRICKWORK', 'PLUMBING', 'ELECTRICAL', 'FLOORING', 'PAINTING', 'INTERIOR', 'INSPECTION', 'HANDOVER'];

// Matches backend/src/modules/workers/worker.constants.ts's WORKER_AVAILABILITY_STATUSES.
const WORKER_AVAILABILITY_STATUSES = ['AVAILABLE', 'ASSIGNED', 'ON_LEAVE', 'INACTIVE'];

const CHART_PALETTE = ['#38bdf8', '#fbbf24', '#a78bfa', '#fb923c', '#34d399', '#f472b6', '#60a5fa', '#facc15', '#4ade80', '#f87171', '#c084fc'];

// Per-module accent for the metric cards' icon badges — purely visual, no meaning beyond consistency.
const METRIC_STYLES: Record<string, string> = {
  LEADS: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  CUSTOMERS: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  PROJECTS: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  QUOTATIONS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  WORKERS: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  MATERIALS: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// "FOUNDATION" -> "Foundation", "SITE_VISIT" -> "Site Visit"
function titleCase(value: string) {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const CHART_CONFIG: ChartConfig = { value: { label: 'Count' } };

export default function Dashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [totalQuotations, setTotalQuotations] = useState(0);
  const [loadingQuotations, setLoadingQuotations] = useState(true);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [totalWorkers, setTotalWorkers] = useState(0);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setChecking(false);
    if (u.role === 'SUPERADMIN') {
      fetchModules(['LEADS', 'CUSTOMERS', 'PROJECTS', 'QUOTATIONS', 'WORKERS', 'MATERIALS']);
    } else {
      getMyPermissions()
        .then((rows) => {
          setPermissions(rows);
          fetchModules(rows.filter((r) => r.canView).map((r) => r.resource));
        })
        .catch(() => setPermissions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fetchModules(visible: string[]) {
    if (visible.includes('LEADS')) refreshLeads();
    else setLoadingLeads(false);
    if (visible.includes('CUSTOMERS')) refreshCustomers();
    else setLoadingCustomers(false);
    if (visible.includes('PROJECTS')) refreshProjects();
    else setLoadingProjects(false);
    if (visible.includes('QUOTATIONS')) refreshQuotations();
    else setLoadingQuotations(false);
    if (visible.includes('WORKERS')) refreshWorkers();
    else setLoadingWorkers(false);
    if (visible.includes('MATERIALS')) refreshMaterials();
    else setLoadingMaterials(false);
  }

  async function refreshLeads() {
    setLoadingLeads(true);
    try {
      const res = await listLeads();
      setLeads(res.data);
      setTotalLeads(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load leads');
    } finally {
      setLoadingLeads(false);
    }
  }

  async function refreshCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await listCustomers();
      setCustomers(res.data);
      setTotalCustomers(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load customers');
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function refreshProjects() {
    setLoadingProjects(true);
    try {
      const res = await listProjects();
      setProjects(res.data);
      setTotalProjects(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load projects');
    } finally {
      setLoadingProjects(false);
    }
  }

  async function refreshQuotations() {
    setLoadingQuotations(true);
    try {
      const res = await listQuotations();
      setQuotations(res.data);
      setTotalQuotations(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load quotations');
    } finally {
      setLoadingQuotations(false);
    }
  }

  async function refreshWorkers() {
    setLoadingWorkers(true);
    try {
      const res = await listWorkers();
      setWorkers(res.data);
      setTotalWorkers(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load workers');
    } finally {
      setLoadingWorkers(false);
    }
  }

  async function refreshMaterials() {
    setLoadingMaterials(true);
    try {
      const res = await listMaterials();
      setMaterials(res.data);
      setTotalMaterials(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load materials');
    } finally {
      setLoadingMaterials(false);
    }
  }

  function comingSoon(label: string) {
    toast.info(`${label} isn't built yet`);
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Building2 className="size-5 animate-pulse" />
          <span className="text-sm">Loading…</span>
        </div>
      </main>
    );
  }

  function canSee(resource: string) {
    if (user!.role === 'SUPERADMIN') return true;
    if (!permissions) return false;
    return permissions.find((p) => p.resource === resource)?.canView ?? false;
  }

  const customerNameById = new Map(customers.map((c) => [c._id, c.name]));
  const leadNameById = new Map(leads.map((l) => [l._id, l.name]));

  const leadPipelineData = PIPELINE_STAGES.map(([value, label]) => ({ label, value: leads.filter((l) => l.status === value).length }));
  const projectStageData = PROJECT_STAGES.map((stage) => ({ label: titleCase(stage), value: projects.filter((p) => p.stage === stage).length }));
  const workerAvailabilityData = WORKER_AVAILABILITY_STATUSES.map((status) => ({ name: titleCase(status), value: workers.filter((w) => w.availabilityStatus === status).length }));

  const totalQuotedValue = quotations.reduce((sum, q) => sum + q.total, 0);
  const availableWorkers = workers.filter((w) => w.availabilityStatus === 'AVAILABLE').length;
  const lowStockMaterials = materials.filter((m) => m.stockQuantity <= m.reorderLevel);

  const metrics = [
    { resource: 'LEADS', icon: UserPlus, label: 'Total leads', value: String(totalLeads), sub: `${leads.length} loaded`, loading: loadingLeads },
    { resource: 'CUSTOMERS', icon: Users, label: 'Customers', value: String(totalCustomers), sub: `${customers.length} loaded`, loading: loadingCustomers },
    { resource: 'PROJECTS', icon: Building2, label: 'Active projects', value: String(totalProjects), sub: `${projects.length} loaded`, loading: loadingProjects },
    { resource: 'QUOTATIONS', icon: IndianRupee, label: 'Quoted value', value: formatINR(totalQuotedValue), sub: `${totalQuotations} quotation${totalQuotations === 1 ? '' : 's'}`, loading: loadingQuotations },
    { resource: 'WORKERS', icon: HardHat, label: 'Workers', value: String(totalWorkers), sub: `${availableWorkers} available`, loading: loadingWorkers },
    {
      resource: 'MATERIALS',
      icon: Package,
      label: 'Materials',
      value: String(totalMaterials),
      sub: lowStockMaterials.length > 0 ? `${lowStockMaterials.length} low stock` : 'stock healthy',
      warn: lowStockMaterials.length > 0,
      loading: loadingMaterials,
    },
  ].filter((m) => canSee(m.resource));

  // Real, not mock — merges the most recently created record across every module the caller can see,
  // sorted by createdAt. Replaces the previous fully-hardcoded activity feed.
  const activity = [
    ...(canSee('LEADS') ? leads.map((l) => ({ key: `lead-${l._id}`, icon: UserPlus, text: 'New lead', detail: l.name, createdAt: l.createdAt })) : []),
    ...(canSee('PROJECTS') ? projects.map((p) => ({ key: `project-${p._id}`, icon: Building2, text: 'New project', detail: p.name, createdAt: p.createdAt })) : []),
    ...(canSee('QUOTATIONS') ? quotations.map((q) => ({ key: `quotation-${q._id}`, icon: IndianRupee, text: 'New quotation', detail: `${leadNameById.get(q.leadId) ?? 'Unknown lead'} · ${formatINR(q.total)}`, createdAt: q.createdAt })) : []),
    ...(canSee('WORKERS') ? workers.map((w) => ({ key: `worker-${w._id}`, icon: HardHat, text: 'Worker added', detail: `${w.name} · ${titleCase(w.skillCategory)}`, createdAt: w.createdAt })) : []),
    ...(canSee('MATERIALS') ? materials.map((m) => ({ key: `material-${m._id}`, icon: Package, text: 'Material added', detail: m.name, createdAt: m.createdAt })) : []),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 7);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />

      <SidebarInset>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b p-6 lg:px-8">
          <div className="flex items-start gap-2">
            <SidebarTrigger className="mt-1 md:hidden" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{todayLabel()}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {greeting()}, {user.name.split(' ')[0]}{' '}
                <Sparkles className="inline size-5" style={{ color: 'var(--brand-gold)' }} />
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your business today.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => comingSoon('Search')}>
              <Search />
            </Button>
            <Button variant="outline" size="icon" onClick={() => comingSoon('Notifications')}>
              <Bell />
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-8 p-6 lg:p-8">
          {/* Metrics */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => (
              <Card key={m.resource}>
                <CardContent className="flex items-center gap-4">
                  <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${METRIC_STYLES[m.resource]}`}>
                    <m.icon className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    {m.loading ? (
                      <Skeleton className="mt-1 h-7 w-24" />
                    ) : (
                      <>
                        <p className="text-2xl font-semibold tracking-tight">{m.value}</p>
                        <p className={m.warn ? 'mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500' : 'mt-0.5 text-xs text-muted-foreground'}>
                          {m.warn && <AlertTriangle className="size-3" />}
                          {m.sub}
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-6 xl:grid-cols-2">
            {canSee('LEADS') && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Lead pipeline</CardTitle>
                    <p className="text-sm text-muted-foreground">Live from GET /api/leads · {leads.length} lead{leads.length === 1 ? '' : 's'} loaded</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => router.push('/leads')}>
                    View all
                    <ArrowRight />
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingLeads ? (
                    <Skeleton className="h-72 w-full" />
                  ) : (
                    <ChartContainer config={CHART_CONFIG} className="aspect-auto h-72 w-full">
                      <BarChart data={leadPipelineData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval={0} tickMargin={10} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                          {leadPipelineData.map((_, i) => (
                            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {canSee('WORKERS') && (
              <Card>
                <CardHeader>
                  <CardTitle>Worker availability</CardTitle>
                  <p className="text-sm text-muted-foreground">Live from GET /api/workers · {totalWorkers} total</p>
                </CardHeader>
                <CardContent>
                  {loadingWorkers ? (
                    <Skeleton className="h-72 w-full" />
                  ) : workers.length === 0 ? (
                    <p className="flex h-72 items-center justify-center text-center text-sm text-muted-foreground">No workers yet</p>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-60 w-full">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                          <Pie data={workerAvailabilityData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={2} strokeWidth={2}>
                            {workerAvailabilityData.map((_, i) => (
                              <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                        {workerAvailabilityData.map((d, i) => (
                          <span key={d.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                            {d.name} <span className="font-medium text-foreground">{d.value}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {canSee('PROJECTS') && (
            <Card>
              <CardHeader>
                <CardTitle>Project stages</CardTitle>
                <p className="text-sm text-muted-foreground">Live from GET /api/projects · {projects.length} project{projects.length === 1 ? '' : 's'} loaded, across all 11 pipeline stages</p>
              </CardHeader>
              <CardContent>
                {loadingProjects ? (
                  <Skeleton className="h-96 w-full" />
                ) : (
                  <ChartContainer config={CHART_CONFIG} className="aspect-auto h-96 w-full">
                    <BarChart data={projectStageData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={100} fontSize={13} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                        {projectStageData.map((_, i) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Module summaries */}
          <div className="grid gap-6 xl:grid-cols-2">
            {canSee('PROJECTS') && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Projects</CardTitle>
                    <p className="text-sm text-muted-foreground">{totalProjects} total</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => router.push('/projects')}>
                    View all
                    <ArrowRight />
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingProjects ? (
                    <Skeleton className="h-40 w-full" />
                  ) : projects.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {projects.slice(0, 5).map((p) => (
                        <div key={p._id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                            <Building2 className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{customerNameById.get(p.customerId) ?? 'Unknown customer'}</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">{titleCase(p.stage)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {canSee('QUOTATIONS') && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Quotations</CardTitle>
                    <p className="text-sm text-muted-foreground">{totalQuotations} total · {formatINR(totalQuotedValue)} quoted</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => router.push('/quotations')}>
                    View all
                    <ArrowRight />
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingQuotations ? (
                    <Skeleton className="h-40 w-full" />
                  ) : quotations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No quotations yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {quotations.slice(0, 5).map((q) => (
                        <div key={q._id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <IndianRupee className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{leadNameById.get(q.leadId) ?? 'Unknown lead'}</p>
                            <p className="truncate text-xs text-muted-foreground">{q.lineItems.length} item{q.lineItems.length === 1 ? '' : 's'}</p>
                          </div>
                          <span className="shrink-0 text-sm font-medium">{formatINR(q.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {canSee('MATERIALS') && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Materials
                      {lowStockMaterials.length > 0 && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                          <AlertTriangle className="size-3" />
                          {lowStockMaterials.length} low stock
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{totalMaterials} total</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => router.push('/materials')}>
                    View all
                    <ArrowRight />
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingMaterials ? (
                    <Skeleton className="h-40 w-full" />
                  ) : lowStockMaterials.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {materials.length === 0 ? 'No materials yet.' : 'All materials are well stocked.'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {lowStockMaterials.slice(0, 5).map((m) => (
                        <div key={m._id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                            <Package className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{titleCase(m.category)}</p>
                          </div>
                          <span className="shrink-0 text-sm font-medium text-amber-600 dark:text-amber-500">{m.stockQuantity} / {m.reorderLevel} {m.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {canSee('WORKERS') && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Workers</CardTitle>
                    <p className="text-sm text-muted-foreground">{totalWorkers} total · {availableWorkers} available</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => router.push('/workers')}>
                    View all
                    <ArrowRight />
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingWorkers ? (
                    <Skeleton className="h-40 w-full" />
                  ) : workers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No workers yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {workers.slice(0, 5).map((w) => (
                        <div key={w._id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                            <HardHat className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{w.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{titleCase(w.skillCategory)}</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">{titleCase(w.availabilityStatus)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent activity — real, merged across every visible module by createdAt */}
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <p className="text-sm text-muted-foreground">Latest records across your visible modules</p>
            </CardHeader>
            <CardContent className="divide-y">
              {loadingLeads && loadingProjects && loadingQuotations && loadingWorkers && loadingMaterials ? (
                <Skeleton className="h-40 w-full" />
              ) : activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                activity.map((a) => (
                  <div key={a.key} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <a.icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.text}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</time>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
