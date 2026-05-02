"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CvAssistantRegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cv-assistant");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
    </div>
  );
}
