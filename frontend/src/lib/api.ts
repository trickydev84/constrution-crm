import { clearSession, getToken, type AuthUser } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type Lead = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  status: string;
  organizationId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  leadId?: string;
  organizationId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  _id: string;
  name: string;
  customerId: string;
  stage: string;
  projectManagerId?: string;
  supervisorId?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  progressPercent?: number;
  organizationId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuotationLineItem = { description: string; category: string; quantity: number; unitPrice: number; amount: number };

export type Quotation = {
  _id: string;
  leadId: string;
  lineItems: QuotationLineItem[];
  taxPercent: number;
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  notes?: string;
  terms?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type Worker = {
  _id: string;
  name: string;
  phone: string;
  skillCategory: string;
  dailyWage?: number;
  availabilityStatus: string;
  assignedProjectId?: string;
  rating?: number;
  organizationId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Material = {
  _id: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  organizationId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type MaterialRequest = {
  _id: string;
  projectId: string;
  materialId: string;
  quantity: number;
  status: string;
  requestedBy?: string;
  organizationId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Permission = {
  _id: string;
  role: string;
  resource: string;
  organizationId: string;
  canView: boolean;
  canWrite: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MyPermission = { resource: string; canView: boolean; canWrite: boolean; canDelete: boolean };

export type LoginOrganization = { name: string; slug: string; status: string; trialEndsAt: string | null };
export type LoginResponse = { accessToken: string; user: AuthUser; organization: LoginOrganization | null };

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;

    // A 401 on an authenticated call means the token is missing/invalid/expired — distinct from
    // login/register's own 401 ("wrong credentials"), which the caller shows as a form error, not
    // a session expiry. Without this, an expired token traps the user: every call fails with 401
    // and the only way back to /login was the (previously broken) Logout button.
    const isAuthEndpoint = path.startsWith('/auth/');
    if (res.status === 401 && token && !isAuthEndpoint) {
      clearSession();
      if (typeof window !== 'undefined') window.location.assign('/login');
    }

    // A pending/suspended/rejected organization's user can still log in (401 above doesn't apply —
    // the token is valid), but every other route 403s with a stable `code` so the FE can route to a
    // holding screen instead of showing a raw "Missing permission" toast on every call.
    if (res.status === 403 && typeof body.code === 'string' && body.code.startsWith('ORGANIZATION_')) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/pending') {
        window.location.assign('/pending');
      }
    }

    throw new ApiError(message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (null as T) : res.json();
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export type MyOrganization = { name: string; slug: string; status: string; trialStartsAt?: string; trialEndsAt: string | null };

export function getMyOrganization() {
  return request<MyOrganization>('/organizations/me');
}

export function signupOrganization(input: {
  organizationName: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  contactPhone?: string;
}) {
  return request<{ organization: { name: string; slug: string; status: string }; user: { id: string; name: string; email: string } }>(
    '/organizations/signup',
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function listLeads(page = 1, limit = 200) {
  return request<{ data: Lead[]; meta: { page: number; limit: number; total: number } }>(`/leads?page=${page}&limit=${limit}`);
}

export function createLead(input: { name: string; phone: string; email?: string; source?: string; notes?: string }) {
  return request<Lead>('/leads', { method: 'POST', body: JSON.stringify(input) });
}

export function updateLeadStatus(id: string, status: string) {
  return request<Lead>(`/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function convertLead(id: string) {
  return request<Customer>(`/leads/${id}/convert`, { method: 'POST' });
}

export function listCustomers(page = 1, limit = 200) {
  return request<{ data: Customer[]; meta: { page: number; limit: number; total: number } }>(`/customers?page=${page}&limit=${limit}`);
}

export function createCustomer(input: { name: string; phone: string; email?: string; address?: string; notes?: string }) {
  return request<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCustomer(id: string, input: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) {
  return request<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function listProjects(page = 1, limit = 200) {
  return request<{ data: Project[]; meta: { page: number; limit: number; total: number } }>(`/projects?page=${page}&limit=${limit}`);
}

export function createProject(input: { name: string; customerId: string; projectManagerId?: string; supervisorId?: string; budget?: number; startDate?: string; endDate?: string; notes?: string }) {
  return request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProjectStage(id: string, stage: string) {
  return request<Project>(`/projects/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) });
}

export function updateProject(id: string, input: { projectManagerId?: string | null; supervisorId?: string | null }) {
  return request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function listUsersByRole(role: string, page = 1, limit = 200) {
  return request<{ data: User[]; meta: { page: number; limit: number; total: number } }>(`/users?role=${role}&page=${page}&limit=${limit}`);
}

export function listQuotations(page = 1, limit = 200) {
  return request<{ data: Quotation[]; meta: { page: number; limit: number; total: number } }>(`/quotations?page=${page}&limit=${limit}`);
}

export function createQuotation(input: {
  leadId: string;
  lineItems: { description: string; category: string; quantity: number; unitPrice: number }[];
  taxPercent?: number;
  discountPercent?: number;
  notes?: string;
  terms?: string;
}) {
  return request<Quotation>('/quotations', { method: 'POST', body: JSON.stringify(input) });
}

export function listWorkers(page = 1, limit = 200) {
  return request<{ data: Worker[]; meta: { page: number; limit: number; total: number } }>(`/workers?page=${page}&limit=${limit}`);
}

export function createWorker(input: { name: string; phone: string; skillCategory: string; dailyWage?: number; assignedProjectId?: string; rating?: number; notes?: string }) {
  return request<Worker>('/workers', { method: 'POST', body: JSON.stringify(input) });
}

export function updateWorkerAvailability(id: string, availabilityStatus: string) {
  return request<Worker>(`/workers/${id}/availability`, { method: 'PATCH', body: JSON.stringify({ availabilityStatus }) });
}

export function listMaterials(page = 1, limit = 200) {
  return request<{ data: Material[]; meta: { page: number; limit: number; total: number } }>(`/materials?page=${page}&limit=${limit}`);
}

export function listLowStockMaterials() {
  return request<Material[]>('/materials/low-stock');
}

export function createMaterial(input: {
  name: string;
  category: string;
  unit: string;
  unitPrice?: number;
  stockQuantity?: number;
  reorderLevel?: number;
  notes?: string;
}) {
  return request<Material>('/materials', { method: 'POST', body: JSON.stringify(input) });
}

export function listMaterialRequests(page = 1, limit = 200) {
  return request<{ data: MaterialRequest[]; meta: { page: number; limit: number; total: number } }>(`/material-requests?page=${page}&limit=${limit}`);
}

export function createMaterialRequest(input: { projectId: string; materialId: string; quantity: number; notes?: string }) {
  return request<MaterialRequest>('/material-requests', { method: 'POST', body: JSON.stringify(input) });
}

export function approveMaterialRequest(id: string) {
  return request<MaterialRequest>(`/material-requests/${id}/approve`, { method: 'PATCH' });
}

export function rejectMaterialRequest(id: string) {
  return request<MaterialRequest>(`/material-requests/${id}/reject`, { method: 'PATCH' });
}

export function fulfillMaterialRequest(id: string) {
  return request<MaterialRequest>(`/material-requests/${id}/fulfill`, { method: 'PATCH' });
}

export function listPermissions() {
  return request<Permission[]>('/permissions');
}

export function getMyPermissions() {
  return request<MyPermission[]>('/permissions/me');
}

export function updatePermission(role: string, resource: string, dto: { canView?: boolean; canWrite?: boolean; canDelete?: boolean }) {
  return request<Permission>(`/permissions/${role}/${resource}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function deletePermission(role: string, resource: string) {
  return request<Permission | null>(`/permissions/${role}/${resource}`, { method: 'DELETE' });
}
