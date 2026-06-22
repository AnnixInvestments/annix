"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuMarketingBlogEditorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/portal/marketing/au/blog");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
    </div>
  );
}
