"use client";

import { AppAdminHub } from "@/app/components/admin/AppAdminHub";
import { orbitRecruiterCards } from "../orbitAdminCards";

export default function OrbitRecruiterAdminPage() {
  return (
    <AppAdminHub
      appKey="annix-orbit"
      title="Orbit Recruiter"
      subtitle="Recruiter access and shared account administration."
      cards={orbitRecruiterCards}
    />
  );
}
