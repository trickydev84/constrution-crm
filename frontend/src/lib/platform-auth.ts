export type PlatformAdmin = { id: string; name: string; email: string };

// Separate storage keys from lib/auth.ts's ccrm.token/ccrm.user — an org session and a platform
// admin session coexist in the same browser without colliding.
const TOKEN_KEY = 'ccrm.platform.token';
const ADMIN_KEY = 'ccrm.platform.admin';

export function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getPlatformAdmin(): PlatformAdmin | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_KEY);
  return raw ? (JSON.parse(raw) as PlatformAdmin) : null;
}

export function setPlatformSession(token: string, admin: PlatformAdmin) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearPlatformSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
}
