"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DataSheetsListPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/portal/marketing/au/data-sheets");
  }, [router]);
  return null;
}
