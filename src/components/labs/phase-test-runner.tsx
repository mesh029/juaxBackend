"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { PHASE_SUITES, runPhaseTests, type PhaseTestResult } from "@/lib/labs/phase-tests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PhaseTestRunner() {
  const [running, setRunning] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, PhaseTestResult[]>>({});
  const [lastOtp, setLastOtp] = useState<string | null>(null);

  async function runPhase(phase: number) {
    setRunning(phase);
    try {
      const phaseResults = await runPhaseTests(phase, {
        onOtp: (code) => setLastOtp(code),
      });
      setResults((prev) => ({ ...prev, [phase]: phaseResults }));
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    for (const suite of PHASE_SUITES) {
      await runPhase(suite.phase);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runAll} disabled={running !== null}>
          {running !== null ? <Loader2 className="animate-spin" /> : <Play />}
          Run all phases
        </Button>
        {lastOtp && (
          <Badge variant="outline" className="font-mono">
            Last dev OTP: {lastOtp}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PHASE_SUITES.map((suite) => {
          const phaseResults = results[suite.phase] ?? [];
          const passed = phaseResults.filter((r) => r.passed).length;
          const total = phaseResults.length;
          const isRunning = running === suite.phase;

          return (
            <Card key={suite.phase}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      Phase {suite.phase} · {suite.title}
                    </CardTitle>
                    <CardDescription>{suite.description}</CardDescription>
                  </div>
                  {total > 0 && (
                    <Badge variant={passed === total ? "success" : "warning"}>
                      {passed}/{total}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={running !== null}
                  onClick={() => runPhase(suite.phase)}
                >
                  {isRunning ? <Loader2 className="animate-spin" /> : <Play />}
                  Run phase {suite.phase}
                </Button>

                {phaseResults.length > 0 && (
                  <ul className="space-y-2">
                    {phaseResults.map((r) => (
                      <li
                        key={r.name}
                        className="flex items-start gap-2 rounded-lg border bg-muted/20 p-2 text-xs"
                      >
                        {r.passed ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-medium", !r.passed && "text-destructive")}>
                            {r.name}
                          </p>
                          {r.detail && (
                            <p className="text-muted-foreground">{r.detail}</p>
                          )}
                          {r.error && <p className="text-destructive">{r.error}</p>}
                          <p className="text-muted-foreground">{r.durationMs}ms</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
