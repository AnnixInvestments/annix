"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuMarketingPageEditorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/portal/marketing/au");
  }, [router]);

  return null;
}
