"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasskeyManagementSection } from "@/app/components/PasskeyManagementSection";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { stockControlTokenStore } from "@/app/lib/api/portalTokenStores";
import type { StockControlLocation } from "@/app/lib/api/stockControlApi";
import {
  useCompanyRoles,
  useInvalidateCompanyRoles,
  useSettingsTeamMembers,
} from "@/app/lib/query/hooks";
import { DepartmentsLocationsSection } from "./DepartmentsLocationsSection";
import { InboundEmailConfigSection } from "./InboundEmailConfigSection";
import { PermissionsSection } from "./PermissionsSection";
import { SupplierMappingsSection } from "./SupplierMappingsSection";
import { TeamManagementSection } from "./TeamManagementSection";
import { WorkflowConfigurationSection } from "./WorkflowConfigurationSection";
import { WorkflowPreviewSection } from "./WorkflowPreviewSection";

export default function StockControlSettingsPage() {
  const router = useRouter();
  const { user, profile } = useStockControlAuth();

  const isAdmin = user?.role === "admin";
  const { data: companyRoles = [], isLoading: companyRolesLoading } = useCompanyRoles();
  const invalidateCompanyRoles = useInvalidateCompanyRoles();
  const { data: teamMembers = [] } = useSettingsTeamMembers();
  const [locations, setLocations] = useState<StockControlLocation[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/stock-control/portal/dashboard");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <h1 className="text-2xl font-bold text-gray-900 lg:col-span-2">Settings</h1>

      <div className="lg:col-span-2">
        <PasskeyManagementSection
          authHeaders={stockControlTokenStore.authHeaders()}
          title="Your passkeys"
        />
      </div>

      <PermissionsSection
        roles={companyRoles}
        rolesLoading={companyRolesLoading}
        onRolesChanged={invalidateCompanyRoles}
      />

      <TeamManagementSection companyRoles={companyRoles} locations={locations} />

      <DepartmentsLocationsSection onLocationsLoaded={setLocations} />

      {profile?.workflowEnabled === true && (
        <div className="lg:col-span-2 space-y-6">
          <WorkflowConfigurationSection teamMembers={teamMembers} />
          <WorkflowPreviewSection />
        </div>
      )}
      <InboundEmailConfigSection />
      <SupplierMappingsSection />
    </div>
  );
}
