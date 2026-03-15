"use client";

import Link from "next/link";
import { Breadcrumb } from "../../components/Breadcrumb";

export default function CompaniesPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "Companies" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your supplier and customer companies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/au-rubber/portal/companies/suppliers"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow border-l-4 border-orange-500"
        >
          <div className="flex items-center mb-3">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Suppliers</h2>
          </div>
          <p className="text-sm text-gray-600">
            Manage supplier companies, configure email addresses for COCs, STIs, and purchase
            orders
          </p>
        </Link>

        <Link
          href="/au-rubber/portal/companies/customers"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500"
        >
          <div className="flex items-center mb-3">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
          </div>
          <p className="text-sm text-gray-600">
            Manage customer companies, configure email addresses for POs, COCs, CTIs, and
            statements
          </p>
        </Link>
      </div>
    </div>
  );
}
