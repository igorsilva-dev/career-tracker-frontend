import { Suspense } from "react";

import AnalysisPageClient from "./AnalysisPageClient";

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="muted">Loading analysis...</div>}>
      <AnalysisPageClient />
    </Suspense>
  );
}
