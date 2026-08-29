'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { getMyPermissions, type MyPermission } from '@/lib/api';
import { clearSession, type AuthUser } from '@/lib/auth';

// href: null means "no page built yet" — clicking shows a toast instead of navigating. resource: null
// means "not gated by the permission system" — either always-visible (Overview) or not backed by a real
// Resource yet (Finance is Phase 2, no backend module exists). Everything else is hidden unless the
// caller's role has view access on that resource — see canSee() below.
const NAV_ITEMS: Array<{ label: string; icon: typeof LayoutDashboard; href: string | null; resource: string | null }> = [
  { label: 'Overview', icon: LayoutDashboard, href: '/', resource: null },
  { label: 'Leads', icon: UserPlus, href: '/leads', resource: 'LEADS' },
  { label: 'Customers', icon: Users, href: '/customers', resource: 'CUSTOMERS' },
  { label: 'Projects', icon: Building2, href: '/projects', resource: 'PROJECTS' },
  { label: 'Quotations', icon: FileText, href: '/quotations', resource: 'QUOTATIONS' },
  { label: 'Workers', icon: HardHat, href: '/workers', resource: 'WORKERS' },
  { label: 'Materials', icon: Package, href: '/materials', resource: 'MATERIALS' },
  { label: 'Finance', icon: Wallet, href: null, resource: null },
];

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function AppSidebar({ user }: { user: AuthUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<MyPermission[] | null>(null);

  useEffect(() => {
    if (user.role === 'SUPERADMIN') return;
    getMyPermissions()
      .then(setPermissions)
      .catch(() => setPermissions([]));
  }, [user.role]);

  // SUPERADMIN always sees everything (matches the backend's unconditional bypass). For every other role,
  // a resource-gated item stays hidden until the permissions fetch resolves — briefly showing it and then
  // yanking it away reads worse than a short delay before it appears.
  function canSee(resource: string | null) {
    if (resource === null) return true;
    if (user.role === 'SUPERADMIN') return true;
    if (!permissions) return false;
    return permissions.find((p) => p.resource === resource)?.canView ?? false;
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => canSee(item.resource));

  function comingSoon(label: string) {
    toast.info(`${label} isn't built yet`);
  }

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Constructly
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {visibleNavItems.map((item) =>
              item.href ? (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="data-active:bg-sidebar-active data-active:text-sidebar-accent-foreground"
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton tooltip={item.label} onClick={() => comingSoon(item.label)}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
            {user.role === 'SUPERADMIN' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/permissions'}
                  tooltip="Permissions"
                  className="data-active:bg-sidebar-active data-active:text-sidebar-accent-foreground"
                  render={<Link href="/permissions" />}
                >
                  <ShieldCheck />
                  <span>Permissions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => comingSoon('Settings')}>
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-sidebar-accent">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.role}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOut />
                Logout
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
