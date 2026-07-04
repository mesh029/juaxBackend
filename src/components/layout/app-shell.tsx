"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Beaker,
  FlaskConical,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/listings", label: "Listings", icon: Home },
  { href: "/explore", label: "Map", icon: MapPin },
];

const adminNav = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/listings", label: "Listings", icon: Home },
  { href: "/admin/stations", label: "Mama Fua", icon: MapPin },
  { href: "/admin/requests", label: "FUA queue", icon: FlaskConical },
  { href: "/admin/feedback", label: "Feedback", icon: Sparkles },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar/50 backdrop-blur md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Jua X</p>
            <p className="text-xs text-muted-foreground">Ops Console</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Platform
          </p>
          {mainNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <Separator className="my-4" />
              <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
              {adminNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}

          <Separator className="my-4" />
          <Link
            href="/labs"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === "/labs"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <Beaker className="h-4 w-4" />
            API Lab
          </Link>
        </nav>

        <div className="border-t p-4">
          {user ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="truncate text-sm font-medium">{user.displayName ?? "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.phone}</p>
                <Badge variant="secondary" className="mt-2 capitalize">
                  {user.role}
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <Button asChild className="w-full" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-8">
          <div className="md:hidden">
            <span className="font-semibold">Jua X</span>
          </div>
          <p className="hidden text-sm text-muted-foreground md:block">
            Kisumu pilot · API simulator
          </p>
          <div className="flex items-center gap-2 md:hidden">
            <Button asChild variant="ghost" size="sm">
              <Link href="/labs">Lab</Link>
            </Button>
            {!user && (
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
