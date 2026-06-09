"use client";

import { useEffect, useState } from "react";

// True on the beta/test deployment. Used to lock test users inside their app
// (hide "Back to hub" / "Choose a different account type" / "Register" /
// "Back to Main Site" escape hatches). Prefers the build-time flag
// NEXT_PUBLIC_APP_ENV=test (no flash); falls back to the annix-app-test host
// at runtime. Host check runs after mount so server + first client render
// match (no hydration mismatch).
export function useIsTestEnv(): boolean {
  const envIsTest = process.env.NEXT_PUBLIC_APP_ENV === "test";
  const [hostIsTest, setHostIsTest] = useState(false);

  useEffect(() => {
    setHostIsTest(window.location.hostname.startsWith("annix-app-test"));
  }, []);

  return envIsTest || hostIsTest;
}
