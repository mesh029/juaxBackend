import { Suspense } from "react";
import ListingsPageInner from "./listings-client";

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading listings…</div>}>
      <ListingsPageInner />
    </Suspense>
  );
}
