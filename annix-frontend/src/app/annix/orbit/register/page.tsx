"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AnnixOrbitRegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/annix/orbit");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7373c2]" />
    </div>
  );
}
