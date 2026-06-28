"use client";

import { useRouter } from "next/navigation";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";

export default function CorePortalNotFound() {
  const router = useRouter();
  const notFoundError = new Error("This page could not be found.");

  return (
    <BrandedErrorScreen
      area="your workspace"
      error={notFoundError}
      reset={() => router.replace("/core/portal")}
      backHref="/core/portal"
      backLabel="Back to workspace"
      brandButtonClass="bg-[#FF8A00] hover:bg-[#e67c00]"
    />
  );
}
