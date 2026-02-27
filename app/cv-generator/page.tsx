import { Suspense } from "react";

import CVGeneratorClient from "./CVGeneratorClient";

export default function CVGeneratorPage() {
  return (
    <Suspense fallback={<div className="muted">Loading tailored CV...</div>}>
      <CVGeneratorClient />
    </Suspense>
  );
}
