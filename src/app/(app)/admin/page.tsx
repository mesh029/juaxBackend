"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, CreditCard, Home, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api/client";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const { isAdmin, user } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    if (isAdmin) {
      api.adminUsers().then((r) => setUserCount(r.users.length)).catch(() => setUserCount(null));
    }
  }, [isAdmin]);

  if (!user) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Admin access</CardTitle>
            <CardDescription>Sign in with an admin account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Restricted</CardTitle>
            <CardDescription>
              Signed in as <strong>{user.role}</strong>. Admin role required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use seeded admin <code className="text-xs">+254700000001</code> in dev.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Badge className="mb-2">Admin</Badge>
          <h1 className="text-2xl font-bold">Operations</h1>
          <p className="text-muted-foreground">Manage users and service requests.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <Users className="mb-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Users</CardTitle>
              <CardDescription>{userCount ?? "—"} accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/users">
                  Manage
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <ClipboardList className="mb-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">FUA queue</CardTitle>
              <CardDescription>Process laundry tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/requests">
                  Open queue
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/stations">Mama Fua stations</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CreditCard className="mb-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Subscriptions</CardTitle>
              <CardDescription>Rental unlock memberships</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/subscriptions">
                  View subs
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Home className="mb-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Listing requests</CardTitle>
              <CardDescription>Viewings & BnB tours</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/listing-requests">
                  Open queue
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Feedback</CardTitle>
              <CardDescription>Ratings & complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/feedback">
                  View feedback
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Home className="mb-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Listings</CardTitle>
              <CardDescription>Rentals & BnB inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/listings">
                  Manage listings
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
