"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BlogPostsListPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/portal/marketing/au/blog");
  }, [router]);
  return null;
}
