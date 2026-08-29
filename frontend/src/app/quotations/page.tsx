'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Plus, ShieldAlert, Trash2 } from 'lucide-react';
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
  createQuotation,
  getMyPermissions,
  listLeads,
  listQuotations,
  type Lead,
  type MyPermission,
  type Quotation,
} from '@/lib/api';
import { getUser, type AuthUser } from '@/lib/auth';
import { formatINR } from '@/lib/format';

// Matches backend/src/modules/quotations/dto/quotation-line-item.dto.ts's @IsIn(['MATERIAL', 'LABOR']).
const QUOTATION_CATEGORIES = ['MATERIAL', 'LABOR'];

type LineItemFormRow = { description: string; category: string; quantity: string; unitPrice: string };
const EMPTY_LINE_ITEM: LineItemFormRow = { description: '', category: 'MATERIAL', quantity: '', unitPrice: '' };

function titleCase(value: string) {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

// Client-side mirror of QuotationsService.computeTotals() — discount applied before tax, same as the
// backend. Preview only: the authoritative totals always come from the server response after POST.
function previewQuotationTotals(lineItems: LineItemFormRow[], taxPercent: string, discountPercent: string) {
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0);
  const discountAmount = subtotal * ((Number(discountPercent) || 0) / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * ((Number(taxPercent) || 0) / 100);
  const total = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
}

const EMPTY_QUOTATION_FORM = {
  leadId: '',
  lineItems: [EMPTY_LINE_ITEM] as LineItemFormRow[],
  taxPercent: '',
  discountPercent: '',
  notes: '',
  terms: '',
};

export default function QuotationsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showNewQuotation, setShowNewQuotation] = useState(false);
  const [quotationForm, setQuotationForm] = useState(EMPTY_QUOTATION_FORM);
  const [submittingQuotation, setSubmittingQuotation] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

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
          if (rows.find((p) => p.resource === 'QUOTATIONS')?.canView) refreshAll();
        })
        .catch(() => setPermissions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshAll() {
    refreshQuotations();
    refreshLeads();
  }

  async function refreshQuotations() {
    setLoadingQuotations(true);
    try {
      const res = await listQuotations();
      setQuotations(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load quotations');
    } finally {
      setLoadingQuotations(false);
    }
  }

  // Fetched for two things: resolving Quotation.leadId -> lead name (not a Mongoose ref, same
  // client-side join pattern as the dashboard), and populating the "New quotation" lead picker.
  async function refreshLeads() {
    try {
      const res = await listLeads();
      setLeads(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load leads');
    }
  }

  function updateLineItem(index: number, field: keyof LineItemFormRow, value: string) {
    setQuotationForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li, i) => (i === index ? { ...li, [field]: value } : li)),
    }));
  }

  function addLineItem() {
    setQuotationForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, { ...EMPTY_LINE_ITEM }] }));
  }

  function removeLineItem(index: number) {
    setQuotationForm((prev) => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== index) }));
  }

  async function handleCreateQuotation(e: FormEvent) {
    e.preventDefault();
    const touchedItems = quotationForm.lineItems.filter((li) => li.description || li.quantity || li.unitPrice);
    if (touchedItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    const invalid = touchedItems.some((li) => !li.description || !(Number(li.quantity) > 0) || Number(li.unitPrice) < 0);
    if (invalid) {
      toast.error('Each line item needs a description, a quantity greater than 0, and a unit price');
      return;
    }
    setSubmittingQuotation(true);
    try {
      await createQuotation({
        leadId: quotationForm.leadId,
        lineItems: touchedItems.map((li) => ({
          description: li.description,
          category: li.category,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
        })),
        taxPercent: quotationForm.taxPercent ? Number(quotationForm.taxPercent) : undefined,
        discountPercent: quotationForm.discountPercent ? Number(quotationForm.discountPercent) : undefined,
        notes: quotationForm.notes || undefined,
        terms: quotationForm.terms || undefined,
      });
      toast.success('Quotation created');
      setQuotationForm(EMPTY_QUOTATION_FORM);
      setShowNewQuotation(false);
      await refreshQuotations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create quotation');
    } finally {
      setSubmittingQuotation(false);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  const canView = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'QUOTATIONS')?.canView === true;
  const canWrite = user.role === 'SUPERADMIN' || permissions?.find((p) => p.resource === 'QUOTATIONS')?.canWrite === true;

  if (permissions !== null && user.role !== 'SUPERADMIN' && !canView) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Access restricted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your role ({user.role}) doesn&apos;t have <code>QUOTATIONS:view</code> access. Ask a SUPERADMIN
              to grant it from the Permissions page.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>Back to dashboard</Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const leadNameById = new Map(leads.map((l) => [l._id, l.name]));
  const totalQuotedValue = quotations.reduce((sum, q) => sum + q.total, 0);
  const preview = previewQuotationTotals(quotationForm.lineItems, quotationForm.taxPercent, quotationForm.discountPercent);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b p-6">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
            <p className="mt-1 text-sm text-muted-foreground">Line-item quotes against leads, with server-computed totals.</p>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>All quotations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loadingQuotations ? 'Loading…' : `${quotations.length} quotation${quotations.length === 1 ? '' : 's'} · ${formatINR(totalQuotedValue)} total quoted value`}
                </p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewQuotation(true)}
                  disabled={leads.length === 0}
                >
                  <Plus />
                  New quotation
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingQuotations ? (
                <Skeleton className="h-32 w-full" />
              ) : quotations.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No quotations yet{canWrite ? ' — create one above against an existing lead.' : '.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Line items</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Tax / Discount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((q) => (
                      <TableRow key={q._id}>
                        <TableCell className="font-medium">{leadNameById.get(q.leadId) ?? 'Unknown lead'}</TableCell>
                        <TableCell className="text-muted-foreground">{q.lineItems.length} item{q.lineItems.length === 1 ? '' : 's'}</TableCell>
                        <TableCell className="font-mono tabular-nums">{formatINR(q.subtotal)}</TableCell>
                        <TableCell className="font-mono tabular-nums text-muted-foreground">{q.taxPercent}% / {q.discountPercent}%</TableCell>
                        <TableCell className="font-mono font-medium tabular-nums">{formatINR(q.total)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => setViewingQuotation(q)} title="View details">
                            <Eye className="size-4" />
                          </Button>
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

      <Dialog open={showNewQuotation} onOpenChange={setShowNewQuotation}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleCreateQuotation}>
            <DialogHeader>
              <DialogTitle>New quotation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="quotation-lead">Lead</Label>
                <Select
                  value={quotationForm.leadId}
                  onValueChange={(v) => setQuotationForm({ ...quotationForm, leadId: v ?? '' })}
                  disabled={leads.length === 0}
                >
                  <SelectTrigger id="quotation-lead" className="w-full">
                    <SelectValue placeholder={leads.length === 0 ? 'No leads yet' : 'Select lead'} />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Line items</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={addLineItem}>
                    <Plus />
                    Add item
                  </Button>
                </div>
                <div className="space-y-3">
                  {quotationForm.lineItems.map((li, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          className="col-span-2"
                          placeholder="Description"
                          value={li.description}
                          onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                        />
                        <Select value={li.category} onValueChange={(v) => updateLineItem(i, 'category', v ?? 'MATERIAL')}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {QUOTATION_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>{titleCase(c)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={li.quantity}
                            onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="Unit price"
                            value={li.unitPrice}
                            onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={quotationForm.lineItems.length === 1}
                        onClick={() => removeLineItem(i)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quotation-tax">Tax %</Label>
                  <Input
                    id="quotation-tax"
                    type="number"
                    min="0"
                    max="100"
                    value={quotationForm.taxPercent}
                    onChange={(e) => setQuotationForm({ ...quotationForm, taxPercent: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quotation-discount">Discount %</Label>
                  <Input
                    id="quotation-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={quotationForm.discountPercent}
                    onChange={(e) => setQuotationForm({ ...quotationForm, discountPercent: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quotation-notes">Notes</Label>
                <Input id="quotation-notes" value={quotationForm.notes} onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quotation-terms">Terms</Label>
                <Input id="quotation-terms" value={quotationForm.terms} onChange={(e) => setQuotationForm({ ...quotationForm, terms: e.target.value })} />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="mb-1 text-xs text-muted-foreground">
                  Preview — computed the same way the backend will; the numbers it actually saves win.
                </p>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono tabular-nums">{formatINR(preview.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono tabular-nums">−{formatINR(preview.discountAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-mono tabular-nums">+{formatINR(preview.taxAmount)}</span></div>
                <div className="mt-1 flex justify-between border-t pt-1 font-medium"><span>Total</span><span className="font-mono tabular-nums">{formatINR(preview.total)}</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewQuotation(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingQuotation || !quotationForm.leadId}>
                {submittingQuotation ? 'Creating…' : 'Create quotation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingQuotation} onOpenChange={(open) => !open && setViewingQuotation(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quotation for {viewingQuotation ? (leadNameById.get(viewingQuotation.leadId) ?? 'Unknown lead') : ''}</DialogTitle>
          </DialogHeader>
          {viewingQuotation && (
            <div className="space-y-4 py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingQuotation.lineItems.map((li, i) => (
                    <TableRow key={i}>
                      <TableCell>{li.description}</TableCell>
                      <TableCell><Badge variant="secondary">{titleCase(li.category)}</Badge></TableCell>
                      <TableCell className="font-mono tabular-nums">{li.quantity}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatINR(li.unitPrice)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatINR(li.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono tabular-nums">{formatINR(viewingQuotation.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discount ({viewingQuotation.discountPercent}%)</span><span className="font-mono tabular-nums">−{formatINR(viewingQuotation.discountAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax ({viewingQuotation.taxPercent}%)</span><span className="font-mono tabular-nums">+{formatINR(viewingQuotation.taxAmount)}</span></div>
                <div className="mt-1 flex justify-between border-t pt-1 font-medium"><span>Total</span><span className="font-mono tabular-nums">{formatINR(viewingQuotation.total)}</span></div>
              </div>
              {(viewingQuotation.notes || viewingQuotation.terms) && (
                <div className="space-y-2 text-sm">
                  {viewingQuotation.notes && (
                    <p><span className="font-medium">Notes: </span><span className="text-muted-foreground">{viewingQuotation.notes}</span></p>
                  )}
                  {viewingQuotation.terms && (
                    <p><span className="font-medium">Terms: </span><span className="text-muted-foreground">{viewingQuotation.terms}</span></p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
