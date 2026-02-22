"use client";

import { Suspense } from "react";
import StraightPipeRfqOrchestrator from "../StraightPipeRfqOrchestrator";

interface Props {
  onSuccess: (rfqId: string) => void;
  onCancel: () => void;
}

function FormLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function UnifiedMultiStepRfqForm({ onSuccess, onCancel }: Props) {
  return (
    <div className="max-w-full mx-auto">
      <Suspense fallback={<FormLoading />}>
        <StraightPipeRfqOrchestrator onSuccess={onSuccess} onCancel={onCancel} />
      </Suspense>
    </div>
  );
}
