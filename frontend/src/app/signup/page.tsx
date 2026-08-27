'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signupOrganization } from '@/lib/api';

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export default function SignupPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setOrganizationName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signupOrganization({
        organizationName,
        slug,
        adminName,
        adminEmail,
        adminPassword,
        contactPhone: contactPhone || undefined,
      });
      router.push('/pending');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  const slugValid = slug.length === 0 || SLUG_PATTERN.test(slug);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <CardTitle className="text-xl">Create your organization</CardTitle>
          <CardDescription>Your account will be reviewed by the platform administrator before it's active.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input id="org-name" required value={organizationName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Builders Pvt Ltd" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                required
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }}
                placeholder="acme-builders"
              />
              <p className="text-xs text-muted-foreground">
                {slugValid ? 'Lowercase letters, digits, and hyphens — this becomes your permanent account id.' : 'Lowercase letters, digits, and hyphens only.'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Your name</Label>
              <Input id="admin-name" required value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Ramesh Yadav" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="ramesh@acmebuilders.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" required minLength={8} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Phone (optional)</Label>
              <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="9998887777" />
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={loading || !slugValid}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Creating…' : 'Create organization'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
