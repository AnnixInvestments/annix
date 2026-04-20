"use client";

import { SortHeader } from "@/app/components/shared/TableComponents";
import { CellText, OpsTablePage, SageBadge } from "../../../components/OpsTablePage";
import { clientSort, useOpsTable } from "../../../hooks/useOpsTable";
import { platformContactsUrl } from "../../../lib/api";

interface Contact {
  id: number;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  sageContactId: number | null;
}

const COMPANY_ID = 1;

export default function CustomersPage() {
  const table = useOpsTable<Contact>({
    endpoint: platformContactsUrl(COMPANY_ID),
    defaultSort: { key: "name", direction: "asc" },
    extraParams: { contactType: "CUSTOMER" },
  });

  const sorted = clientSort(table.items, table.sort);

  return (
    <OpsTablePage
      title="Customers"
      itemName="customers"
      isLoading={table.isLoading}
      isEmpty={sorted.length === 0}
      total={table.total}
      page={table.page}
      limit={table.limit}
      search={table.search}
      onSearchChange={table.setSearch}
      onPageChange={table.setPage}
      onPageSizeChange={(size) => {
        table.setLimit(size);
        table.setPage(1);
      }}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader
              label="Name"
              sortKey="name"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Code"
              sortKey="code"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Contact Person"
              sortKey="contactPerson"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Phone"
              sortKey="phone"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Email"
              sortKey="email"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sage
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((contact) => {
            const hasSage = contact.sageContactId !== null;
            return (
              <tr key={contact.id} className="hover:bg-gray-50">
                <CellText value={contact.name} bold />
                <CellText value={contact.code} />
                <CellText value={contact.contactPerson} />
                <CellText value={contact.phone} />
                <CellText value={contact.email} />
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <SageBadge isMapped={hasSage} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </OpsTablePage>
  );
}
