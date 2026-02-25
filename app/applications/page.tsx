import { Suspense } from "react";

import ApplicationsPageClient from "./ApplicationsPageClient";

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="muted">Loading applications...</div>}>
      <ApplicationsPageClient />
    </Suspense>
  );
}
