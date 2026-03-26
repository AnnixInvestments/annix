"use client";

import { Construction } from "lucide-react";
import { Breadcrumb } from "../../components/Breadcrumb";
import { RequirePermission } from "../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../config/pagePermissions";

export default function AuRubberOrdersPage() {
  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/orders"]}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Orders" }]} />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Construction className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Orders Coming Soon</h2>
            <p className="text-gray-500">This page is being rebuilt. Check back soon.</p>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
