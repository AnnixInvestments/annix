"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

const StraightPipeRfqOrchestrator = dynamic(
  () => import("@/app/components/rfq/StraightPipeRfqOrchestrator"),
  { ssr: false, loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg"></div> },
);

export default function AdminEditRfqPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const handleSuccess = (rfqId: string) => {
    // Navigate back to admin RFQ detail page after successful save
    router.push(`/admin/portal/rfqs/${rfqId}`);
  };

  const handleCancel = () => {
    // Navigate back to admin RFQ list
    router.push("/admin/portal/rfqs");
  };

  if (!id) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Invalid RFQ ID</p>
      </div>
    );
  }

  return (
    <StraightPipeRfqOrchestrator
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      editRfqId={Number(id)}
    />
  );
}
