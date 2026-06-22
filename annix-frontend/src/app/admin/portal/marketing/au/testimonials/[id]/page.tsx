"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuMarketingTestimonialEditorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/portal/marketing/au/testimonials");
  }, [router]);

  return null;
}
