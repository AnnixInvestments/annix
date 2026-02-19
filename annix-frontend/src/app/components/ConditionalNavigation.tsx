"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { shouldShowGlobalNavigation } from "../lib/navigation-utils";

const Navigation = dynamic(() => import("./Navigation"), { ssr: false });

export default function ConditionalNavigation() {
  const pathname = usePathname();

  if (!shouldShowGlobalNavigation(pathname)) {
    return null;
  }

  return <Navigation />;
}
