"use client";

import { useMemo, useState } from "react";
import {
  PARTS_SUPPLIERS,
  PUMP_MANUFACTURERS,
  PUMP_STANDARDS,
  SA_PUMP_SUPPLIERS,
} from "@/app/lib/config/pumps";
import { Breadcrumb } from "../components/Breadcrumb";

type TabId = "manufacturers" | "sa_suppliers" | "parts_suppliers" | "standards";

interface Tab {
  id: TabId;
  label: string;
  count: number;
}

export default function PumpSuppliersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("manufacturers");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs: Tab[] = [
    { id: "manufacturers", label: "Global Manufacturers", count: PUMP_MANUFACTURERS.length },
    { id: "sa_suppliers", label: "SA Suppliers", count: SA_PUMP_SUPPLIERS.length },
    { id: "parts_suppliers", label: "Parts Suppliers", count: PARTS_SUPPLIERS.length },
    { id: "standards", label: "Industry Standards", count: PUMP_STANDARDS.length },
  ];

  const filteredManufacturers = useMemo(() => {
    if (!searchQuery) return PUMP_MANUFACTURERS;
    const query = searchQuery.toLowerCase();
    return PUMP_MANUFACTURERS.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        (m.productsOffered ?? []).some((p) => p.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  const filteredSaSuppliers = useMemo(() => {
    if (!searchQuery) return SA_PUMP_SUPPLIERS;
    const query = searchQuery.toLowerCase();
    return SA_PUMP_SUPPLIERS.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        (s.productsOffered ?? []).some((p) => p.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  const filteredPartsSuppliers = useMemo(() => {
    if (!searchQuery) return PARTS_SUPPLIERS;
    const query = searchQuery.toLowerCase();
    return PARTS_SUPPLIERS.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        (s.productsOffered ?? []).some((p) => p.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  const filteredStandards = useMemo(() => {
    if (!searchQuery) return PUMP_STANDARDS;
    const query = searchQuery.toLowerCase();
    return PUMP_STANDARDS.filter(
      (s) => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Suppliers & Standards" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pump Suppliers & Standards</h1>
          <p className="mt-1 text-sm text-gray-600">
            Browse manufacturers, suppliers, and industry standards
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "manufacturers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredManufacturers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No manufacturers found matching your search.
            </div>
          ) : (
            filteredManufacturers.map((mfr) => (
              <div
                key={mfr.name}
                className="bg-white shadow rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{mfr.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{mfr.description}</p>
                  </div>
                  {mfr.url && (
                    <a
                      href={mfr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
                {mfr.productsOffered && mfr.productsOffered.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Products</p>
                    <div className="flex flex-wrap gap-1">
                      {mfr.productsOffered.map((product) => (
                        <span
                          key={product}
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "sa_suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSaSuppliers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No suppliers found matching your search.
            </div>
          ) : (
            filteredSaSuppliers.map((supplier) => (
              <div
                key={supplier.name}
                className="bg-white shadow rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{supplier.description}</p>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0 ml-2">
                    {supplier.url && (
                      <a
                        href={supplier.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="Website"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
                {supplier.productsOffered && supplier.productsOffered.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Products & Services
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {supplier.productsOffered.map((product) => (
                        <span
                          key={product}
                          className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "parts_suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartsSuppliers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No parts suppliers found matching your search.
            </div>
          ) : (
            filteredPartsSuppliers.map((supplier) => (
              <div
                key={supplier.name}
                className="bg-white shadow rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{supplier.description}</p>
                  </div>
                  {supplier.url && (
                    <a
                      href={supplier.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
                {supplier.productsOffered && supplier.productsOffered.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Products</p>
                    <div className="flex flex-wrap gap-1">
                      {supplier.productsOffered.slice(0, 4).map((product) => (
                        <span
                          key={product}
                          className="px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-700"
                        >
                          {product}
                        </span>
                      ))}
                      {supplier.productsOffered.length > 4 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          +{supplier.productsOffered.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "standards" && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filteredStandards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No standards found matching your search.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Standard
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStandards.map((standard) => (
                  <tr key={standard.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-medium rounded bg-amber-100 text-amber-800">
                        {standard.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{standard.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {standard.url && (
                        <a
                          href={standard.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Reference Data</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This directory contains reference information for pump manufacturers, local
                suppliers, parts suppliers, and industry standards. Contact information is provided
                for convenience and should be verified before use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
