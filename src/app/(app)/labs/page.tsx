"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PhaseTestRunner } from "@/components/labs/phase-test-runner";
import { Badge } from "@/components/ui/badge";

export default function LabsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Badge className="mb-2">Developer</Badge>
          <h1 className="text-2xl font-bold tracking-tight">API Lab</h1>
          <p className="max-w-2xl text-muted-foreground">
            Run phase checks against the live API — same endpoints the Expo app will use.
            OTP codes appear in dev console and below when Phase 1 runs.
          </p>
        </div>
        <PhaseTestRunner />
      </div>
    </AppShell>
  );
}
