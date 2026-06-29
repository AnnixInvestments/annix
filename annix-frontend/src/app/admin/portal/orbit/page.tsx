"use client";

import { AppAdminHub } from "@/app/components/admin/AppAdminHub";
import { orbitModuleCards, orbitSharedCards } from "./orbitAdminCards";

export default function OrbitAdminHubPage() {
  return (
    <AppAdminHub
      appKey="annix-orbit"
      title="Annix Orbit — Admin Hub"
      subtitle="Choose a module or shared tool to manage Orbit setup, testing and operations."
      cards={[...orbitModuleCards, ...orbitSharedCards]}
    />
  );
}
