"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CvAssistantRegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cv-assistant");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7373c2]" />
    </div>
  );
}
