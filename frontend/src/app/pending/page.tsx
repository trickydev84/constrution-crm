'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMyOrganization, type MyOrganization } from '@/lib/api';
import { clearSession, getUser } from '@/lib/auth';

const CONTENT: Record<string, { icon: typeof Clock; title: string; body: (org: MyOrganization) => string }> = {
  PENDING: {
    icon: Clock,
    title: 'Pending approval',
    body: (org) => `Your organization "${org.name}" is awaiting review by the platform administrator${org.trialEndsAt ? ` — once approved, your ${Math.max(0, Math.round((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000))}-day trial begins counting down` : ''}.`,
  },
  SUSPENDED: {
    icon: ShieldAlert,
    title: 'Organization suspended',
    body: (org) => `"${org.name}" has been suspended. Contact the platform administrator for details.`,
  },
  REJECTED: {
    icon: XCircle,
    title: 'Signup rejected',
    body: (org) => `"${org.name}"'s signup was not approved. Contact the platform administrator for details.`,
  },
};

export default function PendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<MyOrganization | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    getMyOrganization()
      .then((o) => {
        setOrg(o);
        if (o.status === 'ACTIVE') router.replace('/');
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not load organization status'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  if (loading || !org) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </main>
    );
  }

  const content = CONTENT[org.status] ?? CONTENT.PENDING;
  const Icon = content.icon;

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <Icon className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.body(org)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut />
            Logout
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
