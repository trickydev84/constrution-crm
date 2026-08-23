'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, ShieldAlert } from 'lucide-react';
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
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  createCustomer,
  getMyPermissions,
  listCustomers,
  updateCustomer,
  type Customer,
  type MyPermission,
} from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';

const EMPTY_CUSTOMER_FORM = { name: '', phone: '', email: '', address: '', notes: '' };

export default function CustomersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER_FORM);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_CUSTOMER_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setChecking(false);
    if (u.role === 'SUPERADMIN') {
      refreshCustomers();
    } else {
      getMyPermissions()
        .then((rows) => {
          setPermissions(rows);
          if (rows.find((p) => p.resource === 'CUSTOMERS')?.canView) refreshCustomers();
        })
        .catch(() => setPermissions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await listCustomers();
      setCustomers(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load customers');
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function handleCreateCustomer(e: FormEvent) {
    e.preventDefault();
    setSubmittingCustomer(true);
    try {
      await createCustomer({
        name: customerForm.name,
        phone: customerForm.phone,
        email: customerForm.email || undefined,
        address: customerForm.address || undefined,
        notes: customerForm.notes || undefined,
      });
      toast.success(`Customer "${customerForm.name}" created`);
      setCustomerForm(EMPTY_CUSTOMER_FORM);
      setShowNewCustomer(false);
      await refreshCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create customer');
    } finally {
      setSubmittingCustomer(false);
    }
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setEditForm({ name: c.name, phone: c.phone, email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '' });
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;
    setSavingEdit(true);
    try {
      await updateCustomer(editingCustomer._id, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || undefined,
        address: editForm.address || undefined,
        notes: editForm.notes || undefined,
      });
      toast.success(`"${editForm.name}" updated`);
      setEditingCustomer(null);
      await refreshCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update customer');
    } finally {
      setSavingEdit(false);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  const canView = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'CUSTOMERS')?.canView === true;
  const canWrite = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'CUSTOMERS')?.canWrite === true;

  if (permissions !== null && user.role !== 'SUPERADMIN' && !canView) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Access restricted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your role ({user.role}) doesn&apos;t have <code>CUSTOMERS:view</code> access. Ask a SUPERADMIN
              to grant it from the Permissions page.
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
            <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">Profiles for direct customers and leads converted to customers.</p>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>All customers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loadingCustomers ? 'Loading…' : `${customers.length} customer${customers.length === 1 ? '' : 's'}`}
                </p>
              </div>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setShowNewCustomer(true)}>
                  <Plus />
                  New customer
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingCustomers ? (
                <Skeleton className="h-32 w-full" />
              ) : customers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No customers yet{canWrite ? ' — add one above, or convert a WON lead from /leads.' : '.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Origin</TableHead>
                      {canWrite && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{c.email || '—'}</TableCell>
                        <TableCell className="max-w-48 truncate text-muted-foreground">{c.address || '—'}</TableCell>
                        <TableCell>
                          {c.leadId ? (
                            <Badge variant="secondary">Converted from lead</Badge>
                          ) : (
                            <Badge variant="outline">Direct</Badge>
                          )}
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                              <Pencil className="size-4" />
                            </Button>
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

      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent>
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader>
              <DialogTitle>New customer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="customer-name">Name</Label>
                <Input id="customer-name" required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-phone">Phone</Label>
                <Input id="customer-phone" required value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input id="customer-email" type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-address">Address</Label>
                <Input id="customer-address" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-notes">Notes</Label>
                <Input id="customer-notes" value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewCustomer(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingCustomer}>
                {submittingCustomer ? 'Creating…' : 'Create customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent>
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit customer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" required value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input id="edit-notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
