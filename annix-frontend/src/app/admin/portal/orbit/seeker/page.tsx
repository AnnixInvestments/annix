"use client";

import { AppAdminHub } from "@/app/components/admin/AppAdminHub";
import { useAdminOrbitDelistReportCount } from "@/app/lib/query/hooks";
import { orbitSeekerCards } from "../orbitAdminCards";

export default function OrbitSeekerAdminPage() {
  const delistCountQuery = useAdminOrbitDelistReportCount();
  const delistCountData = delistCountQuery.data;
  const delistCount = delistCountData ? delistCountData.count : 0;

  return (
    <AppAdminHub
      appKey="annix-orbit"
      title="Orbit Seeker"
      subtitle="Job seeker accounts, job feed controls, credentials and beta testing."
      cards={orbitSeekerCards(delistCount)}
    />
  );
}
