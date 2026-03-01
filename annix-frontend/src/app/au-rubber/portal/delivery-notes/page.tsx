"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeliveryNotesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/au-rubber/portal/delivery-notes/suppliers");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
