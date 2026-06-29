"use client";

import { AppAdminHub } from "@/app/components/admin/AppAdminHub";
import { orbitCompanyCards } from "../orbitAdminCards";

export default function OrbitCompanyAdminPage() {
  return (
    <AppAdminHub
      appKey="annix-orbit"
      title="Orbit Company"
      subtitle="Employer account controls, job distribution and compliance setup."
      cards={orbitCompanyCards}
    />
  );
}
