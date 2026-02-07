"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

const StraightPipeRfqOrchestrator = dynamic(
  () => import("@/app/components/rfq/StraightPipeRfqOrchestrator"),
  { ssr: false, loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg"></div> },
);

export default function CustomerCreateRfqPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRfqId = searchParams.get("edit");

  const handleSuccess = (rfqId: string) => {
    router.push(`/customer/portal/rfqs/${rfqId}`);
  };

  const handleCancel = () => {
    router.push("/customer/portal/rfqs");
  };

  return (
    <StraightPipeRfqOrchestrator
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      editRfqId={editRfqId ? Number(editRfqId) : undefined}
    />
  );
}
