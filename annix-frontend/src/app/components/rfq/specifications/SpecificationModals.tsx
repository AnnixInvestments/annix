'use client';

import React from 'react';
import Link from 'next/link';
import type { MaterialLimits } from '@/app/lib/config/rfq';

export interface MaterialWarning {
  show: boolean;
  specName: string;
  specId: number | undefined;
  warnings: string[];
  recommendation?: string;
  limits?: MaterialLimits;
}

export interface ConfirmationWarning {
  show: boolean;
  warnings: string[];
}

export interface RestrictionPopupPosition {
  x: number;
  y: number;
}

export type FeatureType = 'coating-assistant' | 'lining-assistant';

const FEATURE_DESCRIPTIONS: Record<
  FeatureType,
  { title: string; description: string; benefits: string[] }
> = {
  'coating-assistant': {
    title: 'External Coating Assistant',
    description:
      'An intelligent coating recommendation system based on ISO 12944 and ISO 21809 standards.',
    benefits: [
      'Analyzes atmospheric conditions including marine influence, industrial pollution, and UV exposure',
      'Profiles installation environments (above ground, buried, submerged, splash zone)',
      'Recommends optimal coating systems based on corrosivity category',
      'Provides durability classifications and system specifications',
    ],
  },
  'lining-assistant': {
    title: 'Internal Lining Assistant',
    description:
      'A comprehensive lining recommendation system for material transfer applications based on ASTM and ISO standards.',
    benefits: [
      'Analyzes material properties including particle size, hardness, and silica content',
      'Evaluates chemical environment (pH levels, chloride exposure, operating temperatures)',
      'Considers flow characteristics (velocity, solids percentage, impact angles)',
      'Recommends appropriate lining systems (rubber, ceramic, polyurethane, HDPE) with thickness specifications',
    ],
  },
};

export interface MaterialWarningModalProps {
  warning: MaterialWarning;
  onClose: () => void;
  onProceed: () => void;
}

export function MaterialWarningModal({
  warning,
  onClose,
  onProceed,
}: MaterialWarningModalProps) {
  if (!warning.show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="bg-red-600 px-6 py-4">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-white mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-bold text-white">
              Material Not Recommended
            </h3>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-gray-800 font-medium mb-3">
            <span className="font-bold">{warning.specName}</span> is not
            recommended for the selected operating conditions:
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
              {warning.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>

          {warning.limits && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{warning.specName}</span> limits:
              </p>
              <ul className="text-sm text-gray-600 mt-1">
                <li>
                  Temperature: {warning.limits.minTempC}°C to{' '}
                  {warning.limits.maxTempC}°C
                </li>
                <li>Max Pressure: {warning.limits.maxPressureBar} bar</li>
                <li>Type: {warning.limits.type}</li>
              </ul>
            </div>
          )}

          {warning.recommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Recommendation:</span>{' '}
                {warning.recommendation}
              </p>
            </div>
          )}

          <p className="text-gray-600 text-sm">
            Do you want to proceed with this material anyway?
          </p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-sm"
          >
            Cancel - Select Different Material
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ConfirmationWarningModalProps {
  warning: ConfirmationWarning;
  onClose: () => void;
  onProceed: () => void;
}

export function ConfirmationWarningModal({
  warning,
  onClose,
  onProceed,
}: ConfirmationWarningModalProps) {
  if (!warning.show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="bg-amber-500 px-6 py-4">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-white mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-bold text-white">
              Nix has some concerns
            </h3>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-gray-800 font-medium mb-3">
            The following specifications are not recommended for your operating
            conditions:
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <ul className="list-disc list-inside text-amber-800 text-sm space-y-2">
              {warning.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>

          <p className="text-gray-600 text-sm">
            Do you want to proceed with these specifications anyway, or go back
            and make corrections?
          </p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Go Back and Correct
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export interface RestrictionPopupProps {
  position: RestrictionPopupPosition;
  onClose: () => void;
}

export function RestrictionPopup({ position, onClose }: RestrictionPopupProps) {
  return (
    <div
      className="fixed z-[100] bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-600 max-w-xs"
      style={{
        left: Math.min(position.x, window.innerWidth - 300),
        top: position.y + 10,
      }}
      onMouseLeave={onClose}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium">This option is restricted</p>
          <p className="text-xs text-gray-300 mt-1">
            Available on other pricing tiers.{' '}
            <Link
              href="/pricing"
              className="text-blue-400 hover:text-blue-300 underline"
              onClick={onClose}
            >
              View pricing
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export interface FeatureRestrictionPopupProps {
  feature: FeatureType;
  position: RestrictionPopupPosition;
  onClose: () => void;
}

export function FeatureRestrictionPopup({
  feature,
  position,
  onClose,
}: FeatureRestrictionPopupProps) {
  const info = FEATURE_DESCRIPTIONS[feature];
  return (
    <div
      className="fixed z-[100] bg-slate-800 text-white px-4 py-4 rounded-lg shadow-xl border border-slate-600 max-w-md"
      style={{
        left: Math.min(position.x - 150, window.innerWidth - 450),
        top: Math.min(position.y + 10, window.innerHeight - 300),
      }}
      onMouseLeave={onClose}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-400">{info.title}</p>
          <p className="text-xs text-gray-300 mt-1">{info.description}</p>
          <ul className="mt-2 space-y-1">
            {info.benefits.map((benefit, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-400 flex items-start gap-1.5"
              >
                <span className="text-emerald-400 mt-0.5">&bull;</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-slate-600">
            <p className="text-xs text-gray-300">
              This feature is available to registered users.{' '}
              <Link
                href="/register"
                className="text-blue-400 hover:text-blue-300 underline"
                onClick={onClose}
              >
                Create an account
              </Link>{' '}
              to access this assistant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
