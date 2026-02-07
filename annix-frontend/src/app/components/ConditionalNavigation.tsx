"use client";

import { usePathname } from "next/navigation";
import { shouldShowGlobalNavigation } from "../lib/navigation-utils";
import Navigation from "./Navigation";

export default function ConditionalNavigation() {
  const pathname = usePathname();

  if (!shouldShowGlobalNavigation(pathname)) {
    return null;
  }

  return <Navigation />;
}
