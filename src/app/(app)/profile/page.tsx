"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api/client";
import type { UserProfile } from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    county: "",
    bio: "",
    avatarUrl: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.meProfile().then((res) => {
      setProfile(res.user);
      setForm({
        displayName: res.user.displayName ?? "",
        email: res.user.email ?? "",
        county: res.user.county ?? "",
        bio: res.user.bio ?? "",
        avatarUrl: res.user.avatarUrl ?? "",
      });
    });
  }, [user]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateProfile({
        displayName: form.displayName.trim(),
        email: form.email.trim() || null,
        county: form.county.trim() || null,
        bio: form.bio.trim() || null,
        avatarUrl: form.avatarUrl.trim() || null,
      });
      await refreshUser();
      const res = await api.meProfile();
      setProfile(res.user);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
          <p className="text-sm text-muted-foreground">
            Same fields the mobile app reads from <code>GET /api/v1/me/profile</code>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              {profile?.phone} · signed up{" "}
              {profile?.signedUpAt ? new Date(profile.signedUpAt).toLocaleDateString() : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="capitalize">{profile?.role ?? user.role}</Badge>
              {profile?.stats && (
                <>
                  <Badge variant="outline">{profile.stats.laundryOrders} FUA orders</Badge>
                  <Badge variant="outline">{profile.stats.feedback} feedback</Badge>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                value={form.county}
                onChange={(e) => setForm({ ...form, county: e.target.value })}
                placeholder="kisumu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                placeholder="A short intro for hosts and riders"
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
