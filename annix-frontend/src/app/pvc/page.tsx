"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PVC_TYPES, PvcStandard, pvcApi } from "@/app/lib/pvc";
import { PvcFittingCalculator, PvcPipeCalculator, PvcSpecsTable } from "./components";

type TabType = "specifications" | "pipe-calculator" | "fitting-calculator";

const DEFAULT_PRICE_PER_KG = 35;
const DEFAULT_CEMENT_JOINT_PRICE = 5;

export default function PvcPage() {
  const [activeTab, setActiveTab] = useState<TabType>("specifications");
  const [pricePerKg, setPricePerKg] = useState(DEFAULT_PRICE_PER_KG);
  const [cementJointPrice, setCementJointPrice] = useState(DEFAULT_CEMENT_JOINT_PRICE);
  const [standards, setStandards] = useState<PvcStandard[]>([]);

  useEffect(() => {
    document.title = "PVC Pipes | Annix";
  }, []);

  useEffect(() => {
    pvcApi.standards
      .getAll()
      .then(setStandards)
      .catch(() => setStandards([]));
  }, []);

  const tabs = [
    { id: "specifications" as const, label: "Specifications", icon: "📋" },
    { id: "pipe-calculator" as const, label: "Pipe Calculator", icon: "📏" },
    { id: "fitting-calculator" as const, label: "Fitting Calculator", icon: "🔧" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="text-4xl">⚪</div>
              <div>
                <h1 className="text-3xl font-bold text-white">PVC Pipes Module</h1>
                <p className="text-gray-200 mt-1">
                  PVC-U pipe specifications per EN 1452, calculators, and costing tools
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price per kg (R)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cement Joint Price (R)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cementJointPrice}
                  onChange={(e) => setCementJointPrice(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 dark:border-slate-600">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "specifications" && <PvcSpecsTable />}

            {activeTab === "pipe-calculator" && (
              <PvcPipeCalculator pricePerKg={pricePerKg} cementJointPrice={cementJointPrice} />
            )}

            {activeTab === "fitting-calculator" && (
              <PvcFittingCalculator pricePerKg={pricePerKg} cementJointPrice={cementJointPrice} />
            )}
          </div>

          {standards.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supported Standards
              </h3>
              <div className="flex flex-wrap gap-2">
                {standards.map((std) => (
                  <span
                    key={std.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-gray-200"
                    title={std.description ?? undefined}
                  >
                    {std.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              PVC-U Material
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unplasticized PVC (PVC-U) per EN 1452 is rigid, chemically resistant, and ideal for
              cold water pressure applications.
            </p>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Density: {PVC_TYPES["PVC-U"].density} kg/m³
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Pressure Ratings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PN (Nominal Pressure) values range from PN 6 to PN 25 bar. Higher PN = thicker wall =
              higher pressure capacity.
            </p>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Common: PN 6, 10, 16
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Solvent Cement Joints
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PVC pipes are typically joined using solvent cement (socket fusion), creating
              permanent, leak-proof connections.
            </p>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Joint costs added per connection
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
