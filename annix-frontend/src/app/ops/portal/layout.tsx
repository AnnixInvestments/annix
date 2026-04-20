"use client";

import React, { useState } from "react";
import { OpsHeader } from "../components/OpsHeader";
import { OpsSidebar } from "../components/OpsSidebar";
import { OpsModuleProvider } from "../context/OpsModuleContext";

function OpsPortalShell(props: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const companyId = null;
  const userName = null;
  const companyName = null;
  const permissions: string[] = [];
  const isAdmin = true;

  return (
    <OpsModuleProvider companyId={companyId}>
      <div className="flex h-screen bg-gray-50">
        <OpsSidebar
          permissions={permissions}
          isAdmin={isAdmin}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <OpsHeader
            userName={userName}
            companyName={companyName}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
            onLogout={() => {}}
          />

          <main className="flex-1 overflow-y-auto px-4 py-3 sm:p-6">{props.children}</main>
        </div>
      </div>
    </OpsModuleProvider>
  );
}

export default function OpsPortalLayout(props: { children: React.ReactNode }) {
  return <OpsPortalShell>{props.children}</OpsPortalShell>;
}
