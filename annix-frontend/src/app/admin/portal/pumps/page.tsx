"use client";

import Link from "next/link";
import { PUMP_MANUFACTURERS, PUMPS_MODULE, SA_PUMP_SUPPLIERS } from "@product-data/pumps";

interface StatCard {
  title: string;
  value: string | number;
  href: string;
  color: string;
  icon: string;
}

const SERVICE_TYPE_ICONS: Record<string, string> = {
  new_pump: "M12 6v6m0 0v6m0-6h6m-6 0H6",
  spare_parts:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  repair_service:
    "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z",
  rental: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function PumpsDashboard() {
  const stats: StatCard[] = [
    {
      title: "Products",
      value: "View Catalog",
      href: "/admin/portal/pumps/products",
      color: "bg-purple-500",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    },
    {
      title: "Orders",
      value: "Manage Orders",
      href: "/admin/portal/pumps/orders",
      color: "bg-blue-500",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
      title: "Suppliers",
      value: `${SA_PUMP_SUPPLIERS.length} Listed`,
      href: "/admin/portal/pumps/suppliers",
      color: "bg-green-500",
      icon: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125v-3.375m11.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 1.362 1.362 0 00-1.096-.478H14.25m-6 0V6.615c0-.568-.422-1.048-.986-1.106A49.027 49.027 0 008.25 5.25a49.026 49.026 0 00-5.013.26c-.565.057-.987.538-.987 1.106v7.635m12-4.501v4.501m0 0H2.25m12 0v4.5",
    },
    {
      title: "Manufacturers",
      value: `${PUMP_MANUFACTURERS.length} Brands`,
      href: "/admin/portal/pumps/suppliers",
      color: "bg-orange-500",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pumps & Pump Parts Portal</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage pump products, quotes, orders, and suppliers
          </p>
        </div>
        <Link
          href="/admin/portal/pumps/products"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-blue-500 transition-all"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-md ${stat.color} flex items-center justify-center`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={stat.icon}
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Service Types</h3>
            <p className="mt-1 text-sm text-gray-500">Available pump services</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {PUMPS_MODULE.categories.map((category) => (
                <div
                  key={category.value}
                  className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={SERVICE_TYPE_ICONS[category.value] || "M12 6v6m0 0v6m0-6h6m-6 0H6"}
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{category.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pump Types</h3>
            <p className="mt-1 text-sm text-gray-500">Available pump categories</p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {PUMPS_MODULE.categories.map((category) => (
                <div
                  key={category.value}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{category.label}</p>
                    <p className="text-xs text-gray-500">{category.description}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                    {category.value}
                  </span>
                </div>
              ))}
              {PUMPS_MODULE.categories.length > 8 && (
                <Link
                  href="/admin/portal/pumps/products"
                  className="block text-center text-sm text-blue-600 hover:text-blue-800 py-2"
                >
                  View all {PUMPS_MODULE.categories.length} pump categories &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Featured Manufacturers</h3>
          <p className="mt-1 text-sm text-gray-500">Global pump manufacturers we work with</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {PUMP_MANUFACTURERS.map((manufacturer) => (
              <div
                key={manufacturer.name}
                className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center"
              >
                <p className="text-sm font-medium text-gray-900">{manufacturer.name}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {manufacturer.description}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {(manufacturer.productsOffered ?? []).slice(0, 2).map((product) => (
                    <span
                      key={product}
                      className="px-1.5 py-0.5 text-xs rounded bg-blue-50 text-blue-600"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
            <h3 className="text-sm font-medium text-blue-800">Module Features</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Pump selection guide with 13 application profiles</li>
                <li>API 610 classification (OH, BB, VS types)</li>
                <li>Lifecycle cost calculator</li>
                <li>Quote comparison tools</li>
                <li>Spare parts catalog with OEM cross-reference</li>
                <li>Engineering calculations (NPSH, Cv, affinity laws)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
