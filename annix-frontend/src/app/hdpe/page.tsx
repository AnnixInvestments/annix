'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HdpePipeCalculator, HdpeFittingCalculator, HdpeSpecsTable } from './components';
import { hdpeApi, HdpeStandard } from '@/app/lib/hdpe';

type TabType = 'specifications' | 'pipe-calculator' | 'fitting-calculator';

const DEFAULT_PRICE_PER_KG = 45;
const DEFAULT_BUTTWELD_PRICE = 150;
const DEFAULT_STUB_PRICE = 75;

export default function HdpePage() {
  const [activeTab, setActiveTab] = useState<TabType>('specifications');
  const [pricePerKg, setPricePerKg] = useState(DEFAULT_PRICE_PER_KG);
  const [buttweldPrice, setButtweldPrice] = useState(DEFAULT_BUTTWELD_PRICE);
  const [stubPrice, setStubPrice] = useState(DEFAULT_STUB_PRICE);
  const [standards, setStandards] = useState<HdpeStandard[]>([]);

  useEffect(() => {
    document.title = 'HDPE Pipes | Annix';
  }, []);

  useEffect(() => {
    hdpeApi.standards.getAll().then(setStandards).catch(() => setStandards([]));
  }, []);

  const tabs = [
    { id: 'specifications' as const, label: 'Specifications', icon: '📋' },
    { id: 'pipe-calculator' as const, label: 'Pipe Calculator', icon: '📏' },
    { id: 'fitting-calculator' as const, label: 'Fitting Calculator', icon: '🔧' },
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🔵</div>
              <div>
                <h1 className="text-3xl font-bold text-white">HDPE Pipes Module</h1>
                <p className="text-blue-100 mt-1">
                  High-Density Polyethylene pipe specifications, calculators, and costing tools
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
                  Buttweld Price (R)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={buttweldPrice}
                  onChange={(e) => setButtweldPrice(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stub Flange Price (R)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stubPrice}
                  onChange={(e) => setStubPrice(Number(e.target.value))}
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
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'specifications' && <HdpeSpecsTable />}

            {activeTab === 'pipe-calculator' && (
              <HdpePipeCalculator
                pricePerKg={pricePerKg}
                buttweldPrice={buttweldPrice}
              />
            )}

            {activeTab === 'fitting-calculator' && (
              <HdpeFittingCalculator
                pricePerKg={pricePerKg}
                buttweldPrice={buttweldPrice}
                stubPrice={stubPrice}
              />
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
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
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
              PE100 Material
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PE100 is the highest grade of HDPE with MRS (Minimum Required Strength) of 10 MPa.
              Ideal for pressure pipe applications.
            </p>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Density: 955 kg/m³
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              SDR Values
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Standard Dimension Ratio (SDR) determines wall thickness and pressure rating.
              Lower SDR = thicker wall = higher pressure.
            </p>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              PN = 20 / (SDR - 1) bar
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Buttweld Joints
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              HDPE pipes are joined by butt fusion welding, creating monolithic joints
              as strong as the pipe itself.
            </p>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Weld costs added per joint
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
