"use client";

import { AppAdminHub } from "@/app/components/admin/AppAdminHub";
import { orbitStudentCards } from "../orbitAdminCards";

export default function OrbitStudentAdminPage() {
  return (
    <AppAdminHub
      appKey="annix-orbit"
      title="Orbit Student"
      subtitle="FuturePath education setup, catalog and admissions controls."
      cards={orbitStudentCards}
    />
  );
}
