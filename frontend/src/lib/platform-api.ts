import { clearPlatformSession, getPlatformToken, type PlatformAdmin } from './platform-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type Organization = {
  _id: string;
  name: string;
  slug: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  contactEmail: string;
  contactPhone?: string;
  ownerUserId?: string;
  trialStartsAt?: string;
  trialEndsAt?: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationUsage = {
  organizationId: string;
  users: number;
  leads: number;
  customers: number;
  projects: number;
  quotations: number;
  workers: number;
  materials: number;
  materialRequests: number;
  lastActivityAt: string | null;
};

export type PlatformStats = { total: number; pending: number; active: number; suspended: number; rejected: number };
export type PlatformLoginResponse = { accessToken: string; admin: PlatformAdmin };

export class PlatformApiError extends Error {}

// Deliberately separate from lib/api.ts's request() — that function reads the org token and
// redirects 401s to /login. Reusing it here would let an expired platform session get redirected
// into the org login flow (or vice versa), quietly mixing the two identities on the frontend the
// same way the backend's two JWT secrets keep them apart on the server.
async function platformRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPlatformToken();
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

    const isAuthEndpoint = path.startsWith('/platform/auth/');
    if (res.status === 401 && token && !isAuthEndpoint) {
      clearPlatformSession();
      if (typeof window !== 'undefined') window.location.assign('/platform/login');
    }

    throw new PlatformApiError(message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (null as T) : res.json();
}

export function platformLogin(email: string, password: string) {
  return platformRequest<PlatformLoginResponse>('/platform/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function getPlatformStats() {
  return platformRequest<PlatformStats>('/platform/stats');
}

export function listOrganizations(status?: string, q?: string) {
  const params = new URLSearchParams({ page: '1', limit: '200' });
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  return platformRequest<{ data: Organization[]; meta: { page: number; limit: number; total: number } }>(`/platform/organizations?${params}`);
}

export function approveOrganization(id: string) {
  return platformRequest<Organization>(`/platform/organizations/${id}/approve`, { method: 'PATCH' });
}

export function rejectOrganization(id: string, reason?: string) {
  return platformRequest<Organization>(`/platform/organizations/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });
}

export function suspendOrganization(id: string, reason?: string) {
  return platformRequest<Organization>(`/platform/organizations/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) });
}

export function reactivateOrganization(id: string) {
  return platformRequest<Organization>(`/platform/organizations/${id}/reactivate`, { method: 'PATCH' });
}

export function getOrganizationUsage(id: string) {
  return platformRequest<OrganizationUsage>(`/platform/organizations/${id}/usage`);
}
