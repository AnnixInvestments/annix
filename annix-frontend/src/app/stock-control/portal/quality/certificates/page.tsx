"use client";

import { CertificatesPanel } from "@/app/stock-control/components/quality/CertificatesPanel";

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Supplier Certificates</h1>
      <CertificatesPanel />
    </div>
  );
}
