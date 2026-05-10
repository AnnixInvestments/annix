"use client";

import { useEffect } from "react";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";

export default function DeliveryNoteDetailError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;
  useEffect(() => {
    console.error("DeliveryNote detail error:", error);
  }, [error]);

  return (
    <BrandedErrorScreen
      area="Delivery Notes"
      error={error}
      reset={reset}
      backHref="/au-rubber/portal/delivery-notes"
      backLabel="Back to Delivery Notes"
      brandButtonClass="bg-yellow-600 hover:bg-yellow-700"
    />
  );
}
