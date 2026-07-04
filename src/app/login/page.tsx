"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, User, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DEV_ACCOUNTS, type DevLoginRole } from "@/lib/auth/dev-accounts";
import { ApiError } from "@/lib/api/errors";

const ROLE_ICONS = {
  admin: Shield,
  agent: UserCog,
  user: User,
} as const;

export default function LoginPage() {
  const router = useRouter();
  const { devLogin, user } = useAuth();
  const [role, setRole] = useState<DevLoginRole>("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user) return null;

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await devLogin(role);
      router.push(
        role === "admin" ? "/admin" : role === "agent" ? "/admin/listings" : "/",
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const selected = DEV_ACCOUNTS.find((a) => a.role === role)!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle>Sign in to Jua X</CardTitle>
          <CardDescription>
            Pick a role and sign in with one click. Phone OTP comes later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Sign in as</p>
            <div className="grid gap-2">
              {DEV_ACCOUNTS.map((account) => {
                const Icon = ROLE_ICONS[account.role];
                const active = role === account.role;
                return (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => setRole(account.role)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                        active ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.label}</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {account.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{account.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        +254 {account.phoneShort}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleSignIn} disabled={loading}>
            {loading ? "Signing in…" : `Sign in as ${selected.label}`}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Dev shortcut only — real OTP sign-in will replace this before launch.
          </p>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
              {error.includes("Dev login is off") && (
                <p className="mt-2 text-xs text-muted-foreground">
                  On Vercel → Settings → Environment Variables → add{" "}
                  <code className="text-foreground">OTP_DEV_MODE=true</code> then redeploy.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
