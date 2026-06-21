"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TestimonialEditorRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  useEffect(() => {
    router.replace(`/admin/portal/marketing/au/testimonials/${id}`);
  }, [router, id]);
  return null;
}
