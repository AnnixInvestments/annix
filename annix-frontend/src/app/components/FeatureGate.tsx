"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFeatureGate } from "@/app/hooks/useFeatureGate";

interface FeatureGateProps {
  featureFlag: string;
  fallbackPath: string;
  children: React.ReactNode;
}

export function FeatureGate({ featureFlag, fallbackPath, children }: FeatureGateProps) {
  const router = useRouter();
  const { isFeatureEnabled, isLoading, isTestEnv } = useFeatureGate();

  const isEnabled = isFeatureEnabled(featureFlag);

  useEffect(() => {
    if (!isLoading && isTestEnv && !isEnabled) {
      router.replace(fallbackPath);
    }
  }, [isLoading, isTestEnv, isEnabled, fallbackPath, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isTestEnv && !isEnabled) {
    return null;
  }

  return <>{children}</>;
}
