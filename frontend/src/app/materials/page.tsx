'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Package, Plus, ShieldAlert, X } from 'lucide-react';
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
  approveMaterialRequest,
  createMaterial,
  createMaterialRequest,
  fulfillMaterialRequest,
  getMyPermissions,
  listLowStockMaterials,
  listMaterialRequests,
  listMaterials,
  listProjects,
  rejectMaterialRequest,
  type Material,
  type MaterialRequest,
  type MyPermission,
  type Project,
} from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';

// Matches backend/src/modules/materials/material.constants.ts's MATERIAL_CATEGORIES exactly — not
// PRD-specified as a fixed list, invented for this module. Update both if either changes.
const MATERIAL_CATEGORIES = ['CEMENT', 'SAND', 'STEEL', 'BRICKS', 'MARBLE', 'TILES', 'PAINT', 'OTHER'];

function titleCase(value: string) {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function statusBadge(status: string) {
  if (status === 'FULFILLED') {
    return <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" variant="outline">Fulfilled</Badge>;
  }
  if (status === 'APPROVED') {
    return <Badge className="border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-400" variant="outline">Approved</Badge>;
  }
  if (status === 'REJECTED') {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary">Requested</Badge>;
}

const EMPTY_MATERIAL_FORM = { name: '', category: 'CEMENT', unit: '', unitPrice: '', stockQuantity: '', reorderLevel: '', notes: '' };
const EMPTY_REQUEST_FORM = { projectId: '', materialId: '', quantity: '', notes: '' };

export default function MaterialsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [lowStockIds, setLowStockIds] = useState<Set<string>>(new Set());
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL_FORM);
  const [submittingMaterial, setSubmittingMaterial] = useState(false);

  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST_FORM);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

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
          if (rows.find((p) => p.resource === 'MATERIALS')?.canView) refreshAll();
        })
        .catch(() => setPermissions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshAll() {
    refreshMaterials();
    refreshRequests();
    refreshProjects();
  }

  async function refreshMaterials() {
    setLoadingMaterials(true);
    try {
      const [res, lowStock] = await Promise.all([listMaterials(), listLowStockMaterials()]);
      setMaterials(res.data);
      setLowStockIds(new Set(lowStock.map((m) => m._id)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load materials');
    } finally {
      setLoadingMaterials(false);
    }
  }

  async function refreshRequests() {
    setLoadingRequests(true);
    try {
      const res = await listMaterialRequests();
      setRequests(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load material requests');
    } finally {
      setLoadingRequests(false);
    }
  }

  // Fetched for two things: resolving MaterialRequest.projectId -> project name (not a Mongoose ref,
  // same client-side join pattern as the dashboard's customerNameById), and populating the "New request"
  // project picker.
  async function refreshProjects() {
    try {
      const res = await listProjects();
      setProjects(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load projects');
    }
  }

  async function handleCreateMaterial(e: FormEvent) {
    e.preventDefault();
    setSubmittingMaterial(true);
    try {
      await createMaterial({
        name: materialForm.name,
        category: materialForm.category,
        unit: materialForm.unit,
        unitPrice: materialForm.unitPrice ? Number(materialForm.unitPrice) : undefined,
        stockQuantity: materialForm.stockQuantity ? Number(materialForm.stockQuantity) : undefined,
        reorderLevel: materialForm.reorderLevel ? Number(materialForm.reorderLevel) : undefined,
        notes: materialForm.notes || undefined,
      });
      toast.success(`Material "${materialForm.name}" added`);
      setMaterialForm(EMPTY_MATERIAL_FORM);
      setShowNewMaterial(false);
      await refreshMaterials();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add material');
    } finally {
      setSubmittingMaterial(false);
    }
  }

  async function handleCreateRequest(e: FormEvent) {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      await createMaterialRequest({
        projectId: requestForm.projectId,
        materialId: requestForm.materialId,
        quantity: Number(requestForm.quantity),
        notes: requestForm.notes || undefined,
      });
      toast.success('Material request created');
      setRequestForm(EMPTY_REQUEST_FORM);
      setShowNewRequest(false);
      await refreshRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create material request');
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject' | 'fulfill') {
    setActioningId(id);
    try {
      const fn = action === 'approve' ? approveMaterialRequest : action === 'reject' ? rejectMaterialRequest : fulfillMaterialRequest;
      await fn(id);
      toast.success(`Request ${action === 'fulfill' ? 'fulfilled' : action + 'd'}`);
      await Promise.all([refreshRequests(), action === 'fulfill' ? refreshMaterials() : Promise.resolve()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${action} request`);
    } finally {
      setActioningId(null);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  const canView = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'MATERIALS')?.canView === true;
  const canWrite = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'MATERIALS')?.canWrite === true;

  if (permissions !== null && user.role !== 'SUPERADMIN' && !canView) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Access restricted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your role ({user.role}) doesn&apos;t have <code>MATERIALS:view</code> access. Ask a SUPERADMIN
              to grant it from the Permissions page.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>Back to dashboard</Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const projectNameById = new Map(projects.map((p) => [p._id, p.name]));
  const materialNameById = new Map(materials.map((m) => [m._id, m.name]));

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b p-6">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Materials</h1>
            <p className="mt-1 text-sm text-muted-foreground">Catalog and stock, plus per-project material requests.</p>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Catalog
                  {lowStockIds.size > 0 && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                      <AlertTriangle className="size-3" />
                      {lowStockIds.size} low stock
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">Live from GET /api/materials</p>
              </div>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setShowNewMaterial(true)}>
                  <Plus />
                  New material
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingMaterials ? (
                <Skeleton className="h-32 w-full" />
              ) : materials.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No materials yet{canWrite ? ' — add one above.' : '.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Unit price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Reorder level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell><Badge variant="secondary">{titleCase(m.category)}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{m.unit}</TableCell>
                        <TableCell>₹{m.unitPrice}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {m.stockQuantity}
                            {lowStockIds.has(m._id) && (
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                                Low
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.reorderLevel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Material requests</CardTitle>
                <p className="text-sm text-muted-foreground">Live from GET /api/material-requests</p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewRequest(true)}
                  disabled={materials.length === 0 || projects.length === 0}
                >
                  <Plus />
                  New request
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <Skeleton className="h-32 w-full" />
              ) : requests.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No material requests yet{canWrite ? ' — request one above.' : '.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      {canWrite && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => {
                      const isActing = actioningId === r._id;
                      return (
                        <TableRow key={r._id}>
                          <TableCell className="font-medium">{projectNameById.get(r.projectId) ?? 'Unknown project'}</TableCell>
                          <TableCell>{materialNameById.get(r.materialId) ?? 'Unknown material'}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          {canWrite && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {r.status === 'REQUESTED' && (
                                  <>
                                    <Button size="icon" variant="ghost" disabled={isActing} onClick={() => handleAction(r._id, 'approve')} title="Approve">
                                      <Check className="size-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" disabled={isActing} onClick={() => handleAction(r._id, 'reject')} title="Reject">
                                      <X className="size-4" />
                                    </Button>
                                  </>
                                )}
                                {r.status === 'APPROVED' && (
                                  <>
                                    <Button size="icon" variant="ghost" disabled={isActing} onClick={() => handleAction(r._id, 'fulfill')} title="Fulfill">
                                      <Package className="size-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" disabled={isActing} onClick={() => handleAction(r._id, 'reject')} title="Reject">
                                      <X className="size-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={showNewMaterial} onOpenChange={setShowNewMaterial}>
        <DialogContent>
          <form onSubmit={handleCreateMaterial}>
            <DialogHeader>
              <DialogTitle>New material</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="material-name">Name</Label>
                <Input id="material-name" required value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="material-category">Category</Label>
                  <Select value={materialForm.category} onValueChange={(v) => setMaterialForm({ ...materialForm, category: v ?? 'CEMENT' })}>
                    <SelectTrigger id="material-category" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{titleCase(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="material-unit">Unit</Label>
                  <Input id="material-unit" required placeholder="bag, kg, ton…" value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="material-price">Unit price (₹)</Label>
                  <Input id="material-price" type="number" min="0" value={materialForm.unitPrice} onChange={(e) => setMaterialForm({ ...materialForm, unitPrice: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="material-stock">Stock</Label>
                  <Input id="material-stock" type="number" min="0" value={materialForm.stockQuantity} onChange={(e) => setMaterialForm({ ...materialForm, stockQuantity: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="material-reorder">Reorder level</Label>
                  <Input id="material-reorder" type="number" min="0" value={materialForm.reorderLevel} onChange={(e) => setMaterialForm({ ...materialForm, reorderLevel: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="material-notes">Notes</Label>
                <Input id="material-notes" value={materialForm.notes} onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewMaterial(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingMaterial || !materialForm.unit}>
                {submittingMaterial ? 'Adding…' : 'Add material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent>
          <form onSubmit={handleCreateRequest}>
            <DialogHeader>
              <DialogTitle>New material request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="request-project">Project</Label>
                <Select value={requestForm.projectId} onValueChange={(v) => setRequestForm({ ...requestForm, projectId: v ?? '' })}>
                  <SelectTrigger id="request-project" className="w-full">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="request-material">Material</Label>
                <Select value={requestForm.materialId} onValueChange={(v) => setRequestForm({ ...requestForm, materialId: v ?? '' })}>
                  <SelectTrigger id="request-material" className="w-full">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m._id} value={m._id}>{m.name} ({m.stockQuantity} {m.unit} in stock)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="request-quantity">Quantity</Label>
                <Input id="request-quantity" type="number" min="0" required value={requestForm.quantity} onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="request-notes">Notes</Label>
                <Input id="request-notes" value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewRequest(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingRequest || !requestForm.projectId || !requestForm.materialId}>
                {submittingRequest ? 'Requesting…' : 'Request material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
