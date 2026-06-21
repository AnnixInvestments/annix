"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BlogPostEditorRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  useEffect(() => {
    router.replace(`/admin/portal/marketing/au/blog/${id}`);
  }, [router, id]);
  return null;
}
