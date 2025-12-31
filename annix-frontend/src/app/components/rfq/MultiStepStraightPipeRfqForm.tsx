'use client';

import React, { useEffect, useState, useRef } from 'react';
import { StraightPipeEntry, useRfqForm } from '@/app/lib/hooks/useRfqForm';
import { masterDataApi, rfqApi, rfqDocumentApi, minesApi, pipeScheduleApi, SaMine, MineWithEnvironmentalData } from '@/app/lib/api/client';
import {
  validatePage1RequiredFields,
  validatePage2Specifications,
  validatePage3Items
} from '@/app/lib/utils/validation';
import {
  generateClientItemNumber,
  generateSystemReferenceNumber,
  getPipeEndConfigurationDetails
} from '@/app/lib/utils/systemUtils';
import {
  calculateMaxAllowablePressure,
  calculateMinWallThickness,
  validateScheduleForPressure,
  findRecommendedSchedule,
  MATERIAL_ALLOWABLE_STRESS
} from '@/app/lib/utils/pipeCalculations';
import {
  recommendWallThicknessCarbonPipe,
  WeldThicknessRecommendation
} from '@/app/lib/utils/weldThicknessLookup';
import GoogleMapLocationPicker from '@/app/components/GoogleMapLocationPicker';
import { useEnvironmentalIntelligence } from '@/app/lib/hooks/useEnvironmentalIntelligence';
import RfqDocumentUpload from '@/app/components/rfq/RfqDocumentUpload';
import { AutoFilledInput, AutoFilledSelect, AutoFilledDisplay } from '@/app/components/rfq/AutoFilledField';
import AddMineModal from '@/app/components/rfq/AddMineModal';
import { useCustomerAuth } from '@/app/context/CustomerAuthContext';
import dynamic from 'next/dynamic';

// Dynamically import 3D components (client-side only, no SSR)
const Pipe3DPreview = dynamic(() => import('@/app/components/rfq/Pipe3DPreview'), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />
});

const Bend3DPreview = dynamic(() => import('@/app/components/rfq/Bend3DPreview'), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />
});

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface Props {
  onSuccess: (rfqId: string) => void;
  onCancel: () => void;
}

// Pending document for upload
interface PendingDocument {
  file: File;
  id: string;
}

// Master data structure for API integration
interface MasterData {
  steelSpecs: Array<{ id: number; steelSpecName: string }>;
  flangeStandards: Array<{ id: number; code: string }>;
  pressureClasses: Array<{ id: number; designation: string }>;
  nominalBores?: Array<{ id: number; nominal_diameter_mm?: number; outside_diameter_mm?: number; nominalDiameterMm?: number; outsideDiameterMm?: number }>;
}

// Pipe end configuration options with weld counts
const PIPE_END_OPTIONS = [
  { value: 'PE', label: 'PE - Plain ended (0 welds)', weldCount: 0 },
  { value: 'FOE', label: 'FOE - Flanged one end (1 weld)', weldCount: 1 },
  { value: 'FBE', label: 'FBE - Flanged both ends (2 flange welds)', weldCount: 2 },
  { value: 'FOE_LF', label: 'FOE + L/F - Flanged one end + loose flange (1 flange weld)', weldCount: 1 },
  { value: 'FOE_RF', label: 'FOE + R/F - Flanged one end + rotating flange (2 flange welds)', weldCount: 2 },
  { value: '2X_RF', label: '2 x R/F - Rotating flanges both ends (2 flange welds)', weldCount: 2 },
] as const;

// Helper function to get weld count per pipe based on pipe end configuration
const getWeldCountPerPipe = (pipeEndConfig: string): number => {
  const config = PIPE_END_OPTIONS.find(opt => opt.value === pipeEndConfig);
  return config?.weldCount ?? 0;
};

// Helper function to calculate number of flanges required based on pipe end configuration
const getFlangesPerPipe = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case 'PE':  // Plain ended - no flanges
      return 0;
    case 'FOE': // Flanged one end - 1 flange
      return 1;
    case 'FBE': // Flanged both ends - 2 flanges
      return 2;
    case 'FOE_LF': // Flanged one end + loose flange - 2 flanges (1 fixed + 1 loose)
      return 2;
    case 'FOE_RF': // Flanged one end + rotating flange - 2 flanges
      return 2;
    case '2X_RF': // 2 rotating flanges - 2 flanges
      return 2;
    default:
      return 0;
  }
};

// OD lookup table for nominal bore sizes (in mm)
const NB_TO_OD_LOOKUP: Record<number, number> = {
  15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9,
  100: 114.3, 125: 139.7, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
  350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6, 700: 711.2,
  750: 762.0, 800: 812.8, 900: 914.4, 1000: 1016.0, 1050: 1066.8, 1200: 1219.2
};

// Flange weight lookup table by pressure class (kg per flange including bolts and gaskets)
// Based on BS4504/SABS1123/ASME B16.5 standards
// Weights increase significantly with pressure class
const FLANGE_WEIGHT_BY_PRESSURE_CLASS: Record<string, Record<number, number>> = {
  // PN10 / Class 150 (lightest)
  'PN10': {
    15: 0.6, 20: 0.8, 25: 1.0, 32: 1.3, 40: 1.6, 50: 2.0, 65: 2.8, 80: 3.6,
    100: 4.8, 125: 6.8, 150: 8.8, 200: 12.8, 250: 19.2, 300: 28.0, 350: 36.0,
    400: 44.0, 450: 56.0, 500: 72.0, 600: 96.0, 700: 120.0, 750: 136.0,
    800: 152.0, 900: 192.0, 1000: 240.0, 1050: 280.0, 1200: 400.0
  },
  // PN16 / 1600kPa (standard - default)
  'PN16': {
    15: 0.8, 20: 1.0, 25: 1.2, 32: 1.6, 40: 2.0, 50: 2.5, 65: 3.5, 80: 4.5,
    100: 6.0, 125: 8.5, 150: 11.0, 200: 16.0, 250: 24.0, 300: 35.0, 350: 45.0,
    400: 55.0, 450: 70.0, 500: 90.0, 600: 120.0, 700: 150.0, 750: 170.0,
    800: 190.0, 900: 240.0, 1000: 300.0, 1050: 350.0, 1200: 500.0
  },
  // PN25 / 2500kPa
  'PN25': {
    15: 1.0, 20: 1.3, 25: 1.5, 32: 2.0, 40: 2.5, 50: 3.2, 65: 4.4, 80: 5.6,
    100: 7.5, 125: 10.6, 150: 13.8, 200: 20.0, 250: 30.0, 300: 43.8, 350: 56.3,
    400: 68.8, 450: 87.5, 500: 112.5, 600: 150.0, 700: 187.5, 750: 212.5,
    800: 237.5, 900: 300.0, 1000: 375.0, 1050: 437.5, 1200: 625.0
  },
  // PN40 / 4000kPa / Class 300
  'PN40': {
    15: 1.2, 20: 1.5, 25: 1.8, 32: 2.4, 40: 3.0, 50: 3.8, 65: 5.3, 80: 6.8,
    100: 9.0, 125: 12.8, 150: 16.5, 200: 24.0, 250: 36.0, 300: 52.5, 350: 67.5,
    400: 82.5, 450: 105.0, 500: 135.0, 600: 180.0, 700: 225.0, 750: 255.0,
    800: 285.0, 900: 360.0, 1000: 450.0, 1050: 525.0, 1200: 750.0
  },
  // PN64 / 6400kPa (heavy duty)
  'PN64': {
    15: 1.6, 20: 2.0, 25: 2.4, 32: 3.2, 40: 4.0, 50: 5.0, 65: 7.0, 80: 9.0,
    100: 12.0, 125: 17.0, 150: 22.0, 200: 32.0, 250: 48.0, 300: 70.0, 350: 90.0,
    400: 110.0, 450: 140.0, 500: 180.0, 600: 240.0, 700: 300.0, 750: 340.0,
    800: 380.0, 900: 480.0, 1000: 600.0, 1050: 700.0, 1200: 1000.0
  },
  // Class 150 (ASME) - similar to PN16
  'Class 150': {
    15: 0.8, 20: 1.0, 25: 1.2, 32: 1.6, 40: 2.0, 50: 2.5, 65: 3.5, 80: 4.5,
    100: 6.0, 125: 8.5, 150: 11.0, 200: 16.0, 250: 24.0, 300: 35.0, 350: 45.0,
    400: 55.0, 450: 70.0, 500: 90.0, 600: 120.0, 700: 150.0, 750: 170.0,
    800: 190.0, 900: 240.0, 1000: 300.0, 1050: 350.0, 1200: 500.0
  },
  // Class 300 (ASME) - similar to PN40
  'Class 300': {
    15: 1.2, 20: 1.5, 25: 1.8, 32: 2.4, 40: 3.0, 50: 3.8, 65: 5.3, 80: 6.8,
    100: 9.0, 125: 12.8, 150: 16.5, 200: 24.0, 250: 36.0, 300: 52.5, 350: 67.5,
    400: 82.5, 450: 105.0, 500: 135.0, 600: 180.0, 700: 225.0, 750: 255.0,
    800: 285.0, 900: 360.0, 1000: 450.0, 1050: 525.0, 1200: 750.0
  },
  // Class 600 (ASME) - heavy
  'Class 600': {
    15: 2.0, 20: 2.5, 25: 3.0, 32: 4.0, 40: 5.0, 50: 6.3, 65: 8.8, 80: 11.3,
    100: 15.0, 125: 21.3, 150: 27.5, 200: 40.0, 250: 60.0, 300: 87.5, 350: 112.5,
    400: 137.5, 450: 175.0, 500: 225.0, 600: 300.0, 700: 375.0, 750: 425.0,
    800: 475.0, 900: 600.0, 1000: 750.0, 1050: 875.0, 1200: 1250.0
  },
};

// Default flange weight lookup (PN16) - for backward compatibility
const NB_TO_FLANGE_WEIGHT_LOOKUP = FLANGE_WEIGHT_BY_PRESSURE_CLASS['PN16'];

// Number of bolt holes per flange by NB and pressure class (SABS1123/BS4504)
const BOLT_HOLES_BY_NB_AND_PRESSURE: Record<string, Record<number, number>> = {
  'PN6': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 8,
    100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 12, 350: 16,
    400: 16, 450: 20, 500: 20, 600: 20, 700: 24, 800: 24,
    900: 28, 1000: 28, 1200: 32
  },
  'PN10': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 8,
    100: 8, 125: 8, 150: 8, 200: 8, 250: 12, 300: 12, 350: 16,
    400: 16, 450: 20, 500: 20, 600: 20, 700: 24, 800: 24,
    900: 28, 1000: 28, 1200: 32
  },
  'PN16': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 8,
    100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 12, 350: 16,
    400: 16, 450: 20, 500: 20, 600: 20, 700: 24, 800: 24,
    900: 28, 1000: 28, 1200: 32
  },
  'PN25': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 8, 80: 8,
    100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 16, 350: 16,
    400: 16, 450: 20, 500: 20, 600: 20
  },
  'PN40': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 8, 80: 8,
    100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 16, 350: 16,
    400: 16, 450: 20, 500: 20
  },
  'PN64': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 8, 65: 8, 80: 8,
    100: 8, 125: 8, 150: 12, 200: 12, 250: 16, 300: 20, 350: 20,
    400: 20, 450: 24, 500: 24, 600: 24, 700: 28, 800: 32,
    900: 36, 1000: 36, 1200: 44
  },
  'Class 150': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 4,
    100: 8, 125: 8, 150: 8, 200: 8, 250: 12, 300: 12, 350: 12,
    400: 16, 450: 16, 500: 20, 600: 20, 700: 28, 800: 28,
    900: 32, 1000: 36, 1200: 40
  },
  'Class 300': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 8, 65: 8, 80: 8,
    100: 8, 125: 8, 150: 12, 200: 12, 250: 16, 300: 16, 350: 20,
    400: 20, 450: 24, 500: 24, 600: 24, 700: 28, 800: 28,
    900: 32, 1000: 32, 1200: 32
  },
  'Class 600': {
    15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 8, 65: 8, 80: 8,
    100: 8, 125: 8, 150: 12, 200: 16, 250: 16, 300: 20, 350: 20,
    400: 20, 450: 20, 500: 24, 600: 24, 700: 28
  }
};

// Bolt/Nut/Washer set weight per hole (kg) - from Piping Calculations V2.xlsm
const BNW_SET_WEIGHT_PER_HOLE: Record<string, Record<number, { boltSize: string; weight: number }>> = {
  'PN6': {
    15: { boltSize: 'M12x50', weight: 0.056 }, 20: { boltSize: 'M12x50', weight: 0.056 },
    25: { boltSize: 'M12x50', weight: 0.056 }, 32: { boltSize: 'M16x55', weight: 0.113 },
    40: { boltSize: 'M16x55', weight: 0.113 }, 50: { boltSize: 'M16x60', weight: 0.123 },
    65: { boltSize: 'M16x60', weight: 0.123 }, 80: { boltSize: 'M16x65', weight: 0.131 },
    100: { boltSize: 'M16x65', weight: 0.131 }, 125: { boltSize: 'M16x70', weight: 0.138 },
    150: { boltSize: 'M20x80', weight: 0.256 }, 200: { boltSize: 'M20x85', weight: 0.268 },
    250: { boltSize: 'M24x95', weight: 0.436 }, 300: { boltSize: 'M24x110', weight: 0.487 },
    350: { boltSize: 'M24x110', weight: 0.487 }, 400: { boltSize: 'M24x120', weight: 0.522 },
    450: { boltSize: 'M24x130', weight: 0.554 }, 500: { boltSize: 'M30x140', weight: 0.984 },
    600: { boltSize: 'M30x160', weight: 1.092 }, 700: { boltSize: 'M30x170', weight: 1.146 },
    800: { boltSize: 'M36x200', weight: 1.961 }, 900: { boltSize: 'M36x210', weight: 2.027 },
    1000: { boltSize: 'M36x220', weight: 2.105 }, 1200: { boltSize: 'M42x250', weight: 2.55 }
  },
  'PN10': {
    15: { boltSize: 'M12x50', weight: 0.056 }, 20: { boltSize: 'M12x50', weight: 0.056 },
    25: { boltSize: 'M12x50', weight: 0.056 }, 32: { boltSize: 'M16x55', weight: 0.113 },
    40: { boltSize: 'M16x55', weight: 0.113 }, 50: { boltSize: 'M16x55', weight: 0.113 },
    65: { boltSize: 'M16x60', weight: 0.123 }, 80: { boltSize: 'M16x60', weight: 0.123 },
    100: { boltSize: 'M16x60', weight: 0.123 }, 125: { boltSize: 'M16x65', weight: 0.131 },
    150: { boltSize: 'M20x75', weight: 0.244 }, 200: { boltSize: 'M20x80', weight: 0.256 },
    250: { boltSize: 'M20x80', weight: 0.256 }, 300: { boltSize: 'M20x85', weight: 0.268 },
    350: { boltSize: 'M20x90', weight: 0.28 }, 400: { boltSize: 'M24x95', weight: 0.436 },
    450: { boltSize: 'M24x110', weight: 0.487 }, 500: { boltSize: 'M24x110', weight: 0.487 },
    600: { boltSize: 'M24x130', weight: 0.554 }, 700: { boltSize: 'M24x140', weight: 0.588 },
    800: { boltSize: 'M30x160', weight: 1.092 }, 900: { boltSize: 'M30x170', weight: 1.146 },
    1000: { boltSize: 'M30x180', weight: 1.201 }, 1200: { boltSize: 'M36x210', weight: 2.027 }
  },
  'PN16': {
    15: { boltSize: 'M12x60', weight: 0.067 }, 20: { boltSize: 'M12x65', weight: 0.071 },
    25: { boltSize: 'M12x65', weight: 0.071 }, 32: { boltSize: 'M16x70', weight: 0.138 },
    40: { boltSize: 'M16x70', weight: 0.138 }, 50: { boltSize: 'M16x75', weight: 0.146 },
    65: { boltSize: 'M16x75', weight: 0.146 }, 80: { boltSize: 'M16x75', weight: 0.146 },
    100: { boltSize: 'M16x75', weight: 0.146 }, 125: { boltSize: 'M16x80', weight: 0.153 },
    150: { boltSize: 'M20x85', weight: 0.268 }, 200: { boltSize: 'M20x90', weight: 0.28 },
    250: { boltSize: 'M24x100', weight: 0.453 }, 300: { boltSize: 'M24x110', weight: 0.487 },
    350: { boltSize: 'M24x110', weight: 0.487 }, 400: { boltSize: 'M27x130', weight: 0.73 },
    450: { boltSize: 'M27x130', weight: 0.73 }, 500: { boltSize: 'M30x150', weight: 1.038 },
    600: { boltSize: 'M33x170', weight: 1.416 }, 700: { boltSize: 'M33x180', weight: 1.482 },
    800: { boltSize: 'M36x200', weight: 1.961 }, 900: { boltSize: 'M36x210', weight: 2.027 },
    1000: { boltSize: 'M39x230', weight: 2.624 }, 1200: { boltSize: 'M45x270', weight: 4.095 }
  },
  'PN25': {
    15: { boltSize: 'M12x60', weight: 0.067 }, 20: { boltSize: 'M12x60', weight: 0.067 },
    25: { boltSize: 'M12x65', weight: 0.071 }, 32: { boltSize: 'M16x75', weight: 0.146 },
    40: { boltSize: 'M16x75', weight: 0.146 }, 50: { boltSize: 'M16x75', weight: 0.146 },
    65: { boltSize: 'M16x80', weight: 0.153 }, 80: { boltSize: 'M16x80', weight: 0.153 },
    100: { boltSize: 'M20x90', weight: 0.28 }, 125: { boltSize: 'M24x110', weight: 0.487 },
    150: { boltSize: 'M24x110', weight: 0.487 }, 200: { boltSize: 'M24x110', weight: 0.487 },
    250: { boltSize: 'M24x110', weight: 0.487 }, 300: { boltSize: 'M24x110', weight: 0.487 },
    350: { boltSize: 'M30x130', weight: 0.929 }, 400: { boltSize: 'M30x140', weight: 0.984 },
    450: { boltSize: 'M30x150', weight: 1.038 }, 500: { boltSize: 'M30x160', weight: 1.092 },
    600: { boltSize: 'M36x190', weight: 1.882 }
  },
  'PN40': {
    15: { boltSize: 'M12x60', weight: 0.067 }, 20: { boltSize: 'M12x60', weight: 0.067 },
    25: { boltSize: 'M12x65', weight: 0.071 }, 32: { boltSize: 'M16x75', weight: 0.146 },
    40: { boltSize: 'M16x75', weight: 0.146 }, 50: { boltSize: 'M16x75', weight: 0.146 },
    65: { boltSize: 'M16x80', weight: 0.153 }, 80: { boltSize: 'M16x80', weight: 0.153 },
    100: { boltSize: 'M20x90', weight: 0.28 }, 125: { boltSize: 'M24x110', weight: 0.487 },
    150: { boltSize: 'M24x110', weight: 0.487 }, 200: { boltSize: 'M24x110', weight: 0.487 },
    250: { boltSize: 'M30x140', weight: 0.984 }, 300: { boltSize: 'M30x140', weight: 0.984 },
    350: { boltSize: 'M30x150', weight: 1.038 }, 400: { boltSize: 'M36x170', weight: 1.725 },
    450: { boltSize: 'M36x190', weight: 1.882 }, 500: { boltSize: 'M36x210', weight: 2.027 }
  },
  'PN64': {
    15: { boltSize: 'M16x65', weight: 0.18 }, 20: { boltSize: 'M16x70', weight: 0.20 },
    25: { boltSize: 'M16x75', weight: 0.22 }, 32: { boltSize: 'M20x80', weight: 0.35 },
    40: { boltSize: 'M20x85', weight: 0.38 }, 50: { boltSize: 'M20x90', weight: 0.40 },
    65: { boltSize: 'M24x95', weight: 0.55 }, 80: { boltSize: 'M24x100', weight: 0.58 },
    100: { boltSize: 'M27x110', weight: 0.80 }, 125: { boltSize: 'M30x120', weight: 1.08 },
    150: { boltSize: 'M33x130', weight: 1.40 }, 200: { boltSize: 'M36x150', weight: 1.90 },
    250: { boltSize: 'M39x170', weight: 2.50 }, 300: { boltSize: 'M42x190', weight: 3.20 },
    350: { boltSize: 'M45x210', weight: 3.90 }, 400: { boltSize: 'M48x230', weight: 4.70 },
    450: { boltSize: 'M52x250', weight: 5.75 }, 500: { boltSize: 'M56x275', weight: 7.00 },
    600: { boltSize: 'M60x305', weight: 8.60 }, 700: { boltSize: 'M64x340', weight: 10.50 },
    800: { boltSize: 'M72x385', weight: 14.00 }, 900: { boltSize: 'M76x425', weight: 16.50 },
    1000: { boltSize: 'M80x470', weight: 19.50 }, 1200: { boltSize: 'M90x560', weight: 27.00 }
  },
  'Class 150': {
    15: { boltSize: '1/2"x55', weight: 0.061 }, 20: { boltSize: '1/2"x60', weight: 0.067 },
    25: { boltSize: '1/2"x60', weight: 0.067 }, 32: { boltSize: '1/2"x65', weight: 0.071 },
    40: { boltSize: '1/2"x65', weight: 0.071 }, 50: { boltSize: '5/8"x75', weight: 0.146 },
    65: { boltSize: '5/8"x80', weight: 0.153 }, 80: { boltSize: '5/8"x85', weight: 0.161 },
    100: { boltSize: '5/8"x85', weight: 0.161 }, 125: { boltSize: '3/4"x90', weight: 0.28 },
    150: { boltSize: '3/4"x95', weight: 0.292 }, 200: { boltSize: '3/4"x100', weight: 0.304 },
    250: { boltSize: '7/8"x110', weight: 0.399 }, 300: { boltSize: '7/8"x110', weight: 0.399 },
    350: { boltSize: '1"x120', weight: 0.522 }, 400: { boltSize: '1"x120', weight: 0.522 },
    450: { boltSize: '1 1/8"x130', weight: 0.73 }, 500: { boltSize: '1 1/8"x140', weight: 0.774 },
    600: { boltSize: '1 1/4"x160', weight: 1.092 }, 700: { boltSize: '1 1/4"x200', weight: 1.309 },
    800: { boltSize: '1 1/2"x230', weight: 2.184 }, 900: { boltSize: '1 1/2"x250', weight: 2.34 },
    1000: { boltSize: '1 1/2"x250', weight: 2.34 }, 1200: { boltSize: '1 1/2"x270', weight: 2.497 }
  },
  'Class 300': {
    15: { boltSize: '1/2"x60', weight: 0.067 }, 20: { boltSize: '5/8"x70', weight: 0.138 },
    25: { boltSize: '5/8"x70', weight: 0.138 }, 32: { boltSize: '5/8"x75', weight: 0.146 },
    40: { boltSize: '3/4"x85', weight: 0.268 }, 50: { boltSize: '5/8"x80', weight: 0.153 },
    65: { boltSize: '3/4"x95', weight: 0.292 }, 80: { boltSize: '3/4"x100', weight: 0.304 },
    100: { boltSize: '3/4"x110', weight: 0.328 }, 125: { boltSize: '3/4"x110', weight: 0.328 },
    150: { boltSize: '3/4"x120', weight: 0.352 }, 200: { boltSize: '7/8"x130', weight: 0.455 },
    250: { boltSize: '1"x150', weight: 0.623 }, 300: { boltSize: '1 1/8"x160', weight: 0.862 },
    350: { boltSize: '1 1/8"x160', weight: 0.862 }, 400: { boltSize: '1 1/4"x170', weight: 1.146 },
    450: { boltSize: '1 1/4"x180', weight: 1.201 }, 500: { boltSize: '1 1/4"x190', weight: 1.255 },
    600: { boltSize: '1 1/2"x210', weight: 2.027 }, 700: { boltSize: '1 5/8"x250', weight: 2.809 },
    800: { boltSize: '1 7/8"x280', weight: 4.218 }, 900: { boltSize: '2"x300', weight: 5.149 },
    1000: { boltSize: '1 5/8"x300', weight: 3.27 }, 1200: { boltSize: '1 3/4"x330', weight: 2.55 }
  },
  'Class 600': {
    15: { boltSize: '1/2"x75', weight: 0.079 }, 20: { boltSize: '5/8"x80', weight: 0.153 },
    25: { boltSize: '5/8"x85', weight: 0.161 }, 32: { boltSize: '5/8"x90', weight: 0.169 },
    40: { boltSize: '3/4"x100', weight: 0.304 }, 50: { boltSize: '5/8"x100', weight: 0.184 },
    65: { boltSize: '3/4"x110', weight: 0.328 }, 80: { boltSize: '3/4"x120', weight: 0.352 },
    100: { boltSize: '7/8"x130', weight: 0.455 }, 125: { boltSize: '1"x150', weight: 0.623 },
    150: { boltSize: '1"x160', weight: 0.657 }, 200: { boltSize: '1 1/8"x180', weight: 0.95 },
    250: { boltSize: '1 1/4"x200', weight: 1.309 }, 300: { boltSize: '1 1/4"x210', weight: 1.355 },
    400: { boltSize: '1 1/2"x230', weight: 2.184 }, 450: { boltSize: '1 5/8"x250', weight: 2.809 },
    500: { boltSize: '1 5/8"x270', weight: 2.993 }, 600: { boltSize: '1 7/8"x300', weight: 4.464 },
    700: { boltSize: '2"x330', weight: 5.569 }
  }
};

// Helper function to get bolt holes per flange
const getBoltHolesPerFlange = (nbMm: number, pressureClass: string): number => {
  const normalized = normalizePressureClass(pressureClass);
  const classData = BOLT_HOLES_BY_NB_AND_PRESSURE[normalized];
  if (!classData) return 8; // Default
  return classData[nbMm] || 8;
};

// Helper function to get BNW set info (bolt size, weight per set)
const getBnwSetInfo = (nbMm: number, pressureClass: string): { boltSize: string; weightPerHole: number; holesPerFlange: number } => {
  const normalized = normalizePressureClass(pressureClass);
  const classData = BNW_SET_WEIGHT_PER_HOLE[normalized];
  const holesPerFlange = getBoltHolesPerFlange(nbMm, normalized);

  if (!classData || !classData[nbMm]) {
    return { boltSize: 'M16x65', weightPerHole: 0.18, holesPerFlange };
  }

  return {
    boltSize: classData[nbMm].boltSize,
    weightPerHole: classData[nbMm].weight,
    holesPerFlange
  };
};

// Gasket weight lookup table (weights in kg)
// NB size in mm -> weight in kg for each gasket type category
// Based on EN 1514-1 dimensions and typical material densities
const GASKET_WEIGHTS: Record<number, { spiralWound: number; rtj: number; ptfe: number; graphite: number; caf: number; rubber: number }> = {
  15: { spiralWound: 0.025, rtj: 0.045, ptfe: 0.003, graphite: 0.002, caf: 0.004, rubber: 0.003 },
  20: { spiralWound: 0.030, rtj: 0.055, ptfe: 0.004, graphite: 0.003, caf: 0.005, rubber: 0.004 },
  25: { spiralWound: 0.035, rtj: 0.065, ptfe: 0.005, graphite: 0.004, caf: 0.007, rubber: 0.005 },
  32: { spiralWound: 0.045, rtj: 0.080, ptfe: 0.007, graphite: 0.005, caf: 0.009, rubber: 0.006 },
  40: { spiralWound: 0.055, rtj: 0.095, ptfe: 0.009, graphite: 0.007, caf: 0.012, rubber: 0.008 },
  50: { spiralWound: 0.070, rtj: 0.120, ptfe: 0.013, graphite: 0.010, caf: 0.017, rubber: 0.011 },
  65: { spiralWound: 0.090, rtj: 0.150, ptfe: 0.018, graphite: 0.014, caf: 0.023, rubber: 0.015 },
  80: { spiralWound: 0.110, rtj: 0.180, ptfe: 0.024, graphite: 0.018, caf: 0.031, rubber: 0.020 },
  100: { spiralWound: 0.150, rtj: 0.250, ptfe: 0.035, graphite: 0.027, caf: 0.045, rubber: 0.030 },
  125: { spiralWound: 0.200, rtj: 0.320, ptfe: 0.050, graphite: 0.038, caf: 0.064, rubber: 0.042 },
  150: { spiralWound: 0.260, rtj: 0.400, ptfe: 0.068, graphite: 0.052, caf: 0.087, rubber: 0.057 },
  200: { spiralWound: 0.400, rtj: 0.600, ptfe: 0.110, graphite: 0.085, caf: 0.140, rubber: 0.092 },
  250: { spiralWound: 0.550, rtj: 0.850, ptfe: 0.165, graphite: 0.127, caf: 0.210, rubber: 0.138 },
  300: { spiralWound: 0.720, rtj: 1.100, ptfe: 0.220, graphite: 0.170, caf: 0.285, rubber: 0.187 },
  350: { spiralWound: 0.900, rtj: 1.400, ptfe: 0.290, graphite: 0.225, caf: 0.375, rubber: 0.245 },
  400: { spiralWound: 1.100, rtj: 1.700, ptfe: 0.370, graphite: 0.285, caf: 0.475, rubber: 0.310 },
  450: { spiralWound: 1.350, rtj: 2.000, ptfe: 0.460, graphite: 0.355, caf: 0.590, rubber: 0.385 },
  500: { spiralWound: 1.600, rtj: 2.400, ptfe: 0.560, graphite: 0.430, caf: 0.720, rubber: 0.470 },
  600: { spiralWound: 2.200, rtj: 3.300, ptfe: 0.780, graphite: 0.600, caf: 1.000, rubber: 0.655 },
  700: { spiralWound: 2.900, rtj: 4.300, ptfe: 1.050, graphite: 0.810, caf: 1.350, rubber: 0.880 },
  800: { spiralWound: 3.700, rtj: 5.500, ptfe: 1.350, graphite: 1.040, caf: 1.730, rubber: 1.130 },
  900: { spiralWound: 4.600, rtj: 6.900, ptfe: 1.700, graphite: 1.310, caf: 2.180, rubber: 1.420 },
  1000: { spiralWound: 5.600, rtj: 8.400, ptfe: 2.100, graphite: 1.620, caf: 2.700, rubber: 1.760 },
  1200: { spiralWound: 7.900, rtj: 11.800, ptfe: 3.000, graphite: 2.310, caf: 3.850, rubber: 2.510 }
};

// Get gasket weight based on type and size
const getGasketWeight = (gasketType: string, nbMm: number): number => {
  // Find closest NB size
  const sizes = Object.keys(GASKET_WEIGHTS).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nbMm) closestSize = size;
    else break;
  }

  const weights = GASKET_WEIGHTS[closestSize];
  if (!weights) return 0;

  // Determine weight category based on gasket type
  if (gasketType.startsWith('SW-') || gasketType.includes('Spiral')) {
    return weights.spiralWound;
  } else if (gasketType.startsWith('RTJ-')) {
    return weights.rtj;
  } else if (gasketType.startsWith('PTFE-') || gasketType.includes('PTFE')) {
    return weights.ptfe;
  } else if (gasketType.startsWith('Graphite-') || gasketType.includes('Graphite')) {
    return weights.graphite;
  } else if (gasketType.startsWith('CAF-')) {
    return weights.caf;
  } else if (gasketType.startsWith('Rubber-') || gasketType.includes('EPDM') || gasketType.includes('NBR')) {
    return weights.rubber;
  }

  // Default to spiral wound as middle estimate
  return weights.spiralWound;
};

/**
 * Normalize pressure class designation to a standard format for weight lookup
 * Handles various formats: "PN 16", "PN16", "1600/3", "4000/3", "Class 150", etc.
 */
const normalizePressureClass = (designation: string): string => {
  if (!designation) return 'PN16';

  const trimmed = designation.trim().toUpperCase();

  // Handle SABS format like "1600/3", "4000/3" - extract the kPa value
  const sabsMatch = trimmed.match(/^(\d+)\/\d+$/);
  if (sabsMatch) {
    const kpa = parseInt(sabsMatch[1]);
    // Map kPa to PN class
    if (kpa <= 1000) return 'PN10';
    if (kpa <= 1600) return 'PN16';
    if (kpa <= 2500) return 'PN25';
    if (kpa <= 4000) return 'PN40';
    if (kpa <= 6400) return 'PN64';
    return 'PN64'; // Highest available
  }

  // Handle "PN 16" -> "PN16" (remove space)
  const pnMatch = trimmed.match(/^PN\s*(\d+)/i);
  if (pnMatch) {
    const pnValue = parseInt(pnMatch[1]);
    // Normalize common PN values
    if (pnValue <= 10) return 'PN10';
    if (pnValue <= 16) return 'PN16';
    if (pnValue <= 25) return 'PN25';
    if (pnValue <= 40) return 'PN40';
    if (pnValue <= 64 || pnValue === 63) return 'PN64'; // PN63 maps to PN64
    return 'PN64'; // Highest available for PN100, PN160, etc.
  }

  // Handle "Class 150", "CLASS 150", etc.
  const classMatch = trimmed.match(/^CLASS\s*(\d+)/i);
  if (classMatch) {
    const classValue = parseInt(classMatch[1]);
    if (classValue <= 150) return 'Class 150';
    if (classValue <= 300) return 'Class 300';
    return 'Class 600';
  }

  // Handle numeric-only designations (kPa values)
  const numericMatch = trimmed.match(/^(\d+)$/);
  if (numericMatch) {
    const value = parseInt(numericMatch[1]);
    // Check if it's kPa or ASME class
    if (value >= 1000) {
      // Likely kPa
      if (value <= 1000) return 'PN10';
      if (value <= 1600) return 'PN16';
      if (value <= 2500) return 'PN25';
      if (value <= 4000) return 'PN40';
      if (value <= 6400) return 'PN64';
      return 'PN64';
    } else {
      // Likely ASME class
      if (value <= 150) return 'Class 150';
      if (value <= 300) return 'Class 300';
      return 'Class 600';
    }
  }

  // Return as-is if no pattern matched (might already be correct format)
  return designation;
};

/**
 * Get flange weight based on NB, pressure class, and flange standard
 * @param nominalBoreMm - Nominal bore in mm
 * @param pressureClassDesignation - Pressure class (e.g., 'PN16', 'Class 300', '4000/3')
 * @returns Weight per flange in kg (including bolts and gasket)
 */
const getFlangeWeight = (
  nominalBoreMm: number,
  pressureClassDesignation?: string
): number => {
  // Normalize the pressure class designation
  const pressureClass = normalizePressureClass(pressureClassDesignation || 'PN16');

  console.log(`🔍 getFlangeWeight: input="${pressureClassDesignation}", normalized="${pressureClass}", NB=${nominalBoreMm}`);

  // Try to find exact match
  if (FLANGE_WEIGHT_BY_PRESSURE_CLASS[pressureClass]) {
    const weight = FLANGE_WEIGHT_BY_PRESSURE_CLASS[pressureClass][nominalBoreMm];
    if (weight) {
      console.log(`✅ Flange weight found: ${weight}kg for ${pressureClass}/${nominalBoreMm}NB`);
      return weight;
    }
  }

  // Fallback to PN16 default
  const defaultWeight = NB_TO_FLANGE_WEIGHT_LOOKUP[nominalBoreMm];
  if (defaultWeight) {
    console.log(`⚠️ Using PN16 fallback: ${defaultWeight}kg for ${nominalBoreMm}NB`);
    return defaultWeight;
  }

  // Last resort: estimate based on NB
  const estimate = nominalBoreMm < 100 ? 5 : nominalBoreMm < 200 ? 12 : nominalBoreMm < 400 ? 40 : nominalBoreMm < 600 ? 80 : 150;
  console.log(`⚠️ Using estimate: ${estimate}kg for ${nominalBoreMm}NB (no data found)`);
  return estimate;
};

/**
 * Material temperature and pressure limits for suitability validation
 * Based on ASME B31.3 and material specifications
 */
interface MaterialLimits {
  minTempC: number;
  maxTempC: number;
  maxPressureBar: number;
  type: string;
  notes?: string;
}

const MATERIAL_LIMITS: Record<string, MaterialLimits> = {
  // SABS Standards (South African)
  'SABS 62': { minTempC: -20, maxTempC: 400, maxPressureBar: 100, type: 'Carbon Steel ERW', notes: 'General purpose ERW pipe' },
  'SABS 719': { minTempC: -20, maxTempC: 400, maxPressureBar: 100, type: 'Carbon Steel ERW', notes: 'Large bore ERW pipe' },

  // ASTM Carbon Steels
  'ASTM A106': { minTempC: -29, maxTempC: 427, maxPressureBar: 400, type: 'Carbon Steel Seamless', notes: 'High temperature seamless pipe' },
  'ASTM A53': { minTempC: -29, maxTempC: 400, maxPressureBar: 250, type: 'Carbon Steel', notes: 'General purpose pipe - seamless or welded' },
  'ASTM A333': { minTempC: -100, maxTempC: 400, maxPressureBar: 250, type: 'Low-Temp Carbon Steel', notes: 'For temperatures down to -100°C' },

  // Line Pipe
  'API 5L': { minTempC: -29, maxTempC: 400, maxPressureBar: 250, type: 'Line Pipe Carbon Steel', notes: 'Oil and gas pipeline' },

  // Heat Exchanger / Boiler
  'ASTM A179': { minTempC: -29, maxTempC: 400, maxPressureBar: 160, type: 'Heat Exchanger Tube', notes: 'Cold-drawn seamless' },
  'ASTM A192': { minTempC: -29, maxTempC: 454, maxPressureBar: 250, type: 'Boiler Tube', notes: 'High-pressure boiler service' },

  // Structural
  'ASTM A500': { minTempC: -29, maxTempC: 200, maxPressureBar: 100, type: 'Structural Tubing', notes: 'Not for pressure service' },

  // Alloy Steels (Chrome-Moly)
  'ASTM A335 P11': { minTempC: -29, maxTempC: 593, maxPressureBar: 400, type: 'Alloy Steel 1.25Cr-0.5Mo', notes: 'High temperature service' },
  'ASTM A335 P22': { minTempC: -29, maxTempC: 593, maxPressureBar: 400, type: 'Alloy Steel 2.25Cr-1Mo', notes: 'High temperature service' },
  'ASTM A335': { minTempC: -29, maxTempC: 593, maxPressureBar: 400, type: 'Alloy Steel Chrome-Moly', notes: 'High temperature alloy' },

  // Stainless Steels
  'ASTM A312': { minTempC: -196, maxTempC: 816, maxPressureBar: 400, type: 'Stainless Steel', notes: 'Austenitic stainless - wide temp range' },
  'ASTM A358': { minTempC: -196, maxTempC: 816, maxPressureBar: 400, type: 'Stainless Steel Welded', notes: 'Electric-fusion welded stainless' },
};

/**
 * Get material limits for a given steel specification name
 */
const getMaterialLimits = (steelSpecName: string): MaterialLimits | null => {
  if (!steelSpecName) return null;

  // Check for exact or prefix match
  for (const [pattern, limits] of Object.entries(MATERIAL_LIMITS)) {
    if (steelSpecName.includes(pattern)) {
      return limits;
    }
  }
  return null;
};

/**
 * Check if a material is suitable for given pressure and temperature conditions
 */
interface MaterialSuitabilityResult {
  isSuitable: boolean;
  warnings: string[];
  recommendation?: string;
  limits?: MaterialLimits;
}

const checkMaterialSuitability = (
  steelSpecName: string,
  temperatureC: number | undefined,
  pressureBar: number | undefined
): MaterialSuitabilityResult => {
  const limits = getMaterialLimits(steelSpecName);
  const warnings: string[] = [];

  if (!limits) {
    return { isSuitable: true, warnings: [], limits: undefined };
  }

  let isSuitable = true;

  // Check temperature limits
  if (temperatureC !== undefined) {
    if (temperatureC < limits.minTempC) {
      isSuitable = false;
      warnings.push(`Temperature ${temperatureC}°C is below minimum ${limits.minTempC}°C for ${steelSpecName}`);
    }
    if (temperatureC > limits.maxTempC) {
      isSuitable = false;
      warnings.push(`Temperature ${temperatureC}°C exceeds maximum ${limits.maxTempC}°C for ${steelSpecName}`);
    }
  }

  // Check pressure limits (rough check - actual depends on schedule/WT)
  if (pressureBar !== undefined && pressureBar > limits.maxPressureBar) {
    warnings.push(`Pressure ${pressureBar} bar may require special consideration for ${steelSpecName} (typical max: ${limits.maxPressureBar} bar)`);
  }

  // Generate recommendation if not suitable
  let recommendation: string | undefined;
  if (!isSuitable) {
    if (temperatureC !== undefined && temperatureC > 400) {
      recommendation = 'Consider ASTM A106 Grade B (up to 427°C), ASTM A335 P11/P22 (up to 593°C), or ASTM A312 stainless (up to 816°C)';
    } else if (temperatureC !== undefined && temperatureC < -29) {
      recommendation = 'Consider ASTM A333 Grade 6 (down to -100°C) or ASTM A312 stainless (down to -196°C)';
    }
  }

  return { isSuitable, warnings, recommendation, limits };
};

/**
 * Get suitable materials for given conditions
 */
const getSuitableMaterials = (
  temperatureC: number | undefined,
  pressureBar: number | undefined
): string[] => {
  const suitable: string[] = [];

  for (const [pattern, limits] of Object.entries(MATERIAL_LIMITS)) {
    let isOk = true;

    if (temperatureC !== undefined) {
      if (temperatureC < limits.minTempC || temperatureC > limits.maxTempC) {
        isOk = false;
      }
    }

    if (pressureBar !== undefined && pressureBar > limits.maxPressureBar) {
      isOk = false;
    }

    if (isOk) {
      suitable.push(pattern);
    }
  }

  return suitable;
};

/**
 * Local calculation for pipe weight when API is unavailable
 * Uses formula: ((OD - WT) * WT) * 0.02466 = Kg/m
 *
 * @param nominalBoreMm - Nominal bore in mm
 * @param wallThicknessMm - Wall thickness in mm
 * @param individualPipeLength - Length of each pipe in meters
 * @param quantityValue - Quantity value (pipes or total length)
 * @param quantityType - 'number_of_pipes' or 'total_length'
 * @param pipeEndConfiguration - Pipe end configuration (PE, FOE, FBE, etc.)
 * @param pressureClassDesignation - Optional pressure class for accurate flange weights
 */
const calculateLocalPipeResult = (
  nominalBoreMm: number,
  wallThicknessMm: number,
  individualPipeLength: number,
  quantityValue: number,
  quantityType: string,
  pipeEndConfiguration: string,
  pressureClassDesignation?: string
): any => {
  const outsideDiameterMm = NB_TO_OD_LOOKUP[nominalBoreMm] || (nominalBoreMm * 1.05);

  // Weight per meter formula: ((OD - WT) * WT) * 0.02466
  const pipeWeightPerMeter = ((outsideDiameterMm - wallThicknessMm) * wallThicknessMm) * 0.02466;

  // Calculate pipe count and total length
  let calculatedPipeCount: number;
  let calculatedTotalLength: number;

  if (quantityType === 'total_length') {
    calculatedTotalLength = quantityValue;
    calculatedPipeCount = Math.ceil(quantityValue / individualPipeLength);
  } else {
    // number_of_pipes
    calculatedPipeCount = quantityValue;
    calculatedTotalLength = quantityValue * individualPipeLength;
  }

  // Calculate total pipe weight
  const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLength;

  // Calculate flanges and welds
  const flangesPerPipe = getFlangesPerPipe(pipeEndConfiguration);
  const numberOfFlanges = flangesPerPipe * calculatedPipeCount;

  const weldsPerPipe = getWeldCountPerPipe(pipeEndConfiguration);
  const numberOfFlangeWelds = weldsPerPipe * calculatedPipeCount;

  // Weld length calculations (circumference-based)
  const circumference = Math.PI * outsideDiameterMm / 1000; // in meters
  const totalFlangeWeldLength = numberOfFlangeWelds * circumference;

  // Get flange weight based on pressure class (includes flange + bolts + gasket)
  const flangeWeightPerUnit = getFlangeWeight(nominalBoreMm, pressureClassDesignation);
  const totalFlangeWeight = numberOfFlanges * flangeWeightPerUnit;

  // Total system weight
  const totalSystemWeight = totalPipeWeight + totalFlangeWeight;

  return {
    pipeWeightPerMeter,
    totalPipeWeight,
    calculatedPipeCount,
    calculatedTotalLength,
    numberOfFlanges,
    numberOfFlangeWelds,
    totalFlangeWeldLength,
    outsideDiameterMm,
    wallThicknessMm,
    totalFlangeWeight,
    flangeWeightPerUnit, // Include per-unit weight for transparency
    pressureClassUsed: pressureClassDesignation || 'PN16', // Track which pressure class was used
    totalBoltWeight: 0,
    totalNutWeight: 0,
    totalSystemWeight,
    isLocalCalculation: true // Flag to indicate this was calculated locally
  };
};

interface MaterialProperties {
  particleSize: "Fine" | "Medium" | "Coarse" | "VeryCoarse";
  particleShape: "Rounded" | "SubAngular" | "Angular";
  specificGravity: "Light" | "Medium" | "Heavy";
  hardnessClass: "Low" | "Medium" | "High";
  silicaContent: "Low" | "Moderate" | "High";
}

interface ChemicalProperties {
  phRange: "Acidic" | "Neutral" | "Alkaline";
  chlorides: "Low" | "Moderate" | "High";
  temperatureRange: "Ambient" | "Elevated" | "High";
}

interface FlowProperties {
  solidsPercent: "Low" | "Medium" | "High" | "VeryHigh";
  velocity: "Low" | "Medium" | "High";
  flowRegime: "Laminar" | "Turbulent";
  impactAngle: "Low" | "Mixed" | "High";
}

interface EquipmentProperties {
  equipmentType: "Pipe" | "Tank" | "Chute" | "Hopper" | "Launder";
  impactZones: boolean;
  operatingPressure: "Low" | "Medium" | "High";
}

interface MaterialTransferProfile {
  material: Partial<MaterialProperties>;
  chemistry: Partial<ChemicalProperties>;
  flow: Partial<FlowProperties>;
  equipment: Partial<EquipmentProperties>;
}

interface DamageMechanisms {
  abrasion: "Low" | "Moderate" | "Severe";
  impact: "Low" | "Moderate" | "Severe";
  corrosion: "Low" | "Moderate" | "High";
  dominantMechanism: "Impact Abrasion" | "Sliding Abrasion" | "Corrosion" | "Mixed";
}

interface LiningRecommendation {
  lining: string;
  liningType: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

// Fallback pipe schedule data (ASTM A106 Gr B) for when backend is unavailable
// Defined at module level so it can be used by both ItemUploadStep and main component
const FALLBACK_PIPE_SCHEDULES: Record<number, Array<{ id: number; scheduleDesignation: string; wallThicknessMm: number }>> = {
  15: [
    { id: 151, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 2.77 },
    { id: 152, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 3.73 },
    { id: 153, scheduleDesignation: 'Sch 160', wallThicknessMm: 4.78 },
    { id: 154, scheduleDesignation: 'XXS', wallThicknessMm: 7.47 },
  ],
  20: [
    { id: 201, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 2.87 },
    { id: 202, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 3.91 },
    { id: 203, scheduleDesignation: 'Sch 160', wallThicknessMm: 5.56 },
    { id: 204, scheduleDesignation: 'XXS', wallThicknessMm: 7.82 },
  ],
  25: [
    { id: 251, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 3.38 },
    { id: 252, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 4.55 },
    { id: 253, scheduleDesignation: 'Sch 160', wallThicknessMm: 6.35 },
    { id: 254, scheduleDesignation: 'XXS', wallThicknessMm: 9.09 },
  ],
  32: [
    { id: 321, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 3.56 },
    { id: 322, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 4.85 },
    { id: 323, scheduleDesignation: 'Sch 160', wallThicknessMm: 6.35 },
    { id: 324, scheduleDesignation: 'XXS', wallThicknessMm: 9.70 },
  ],
  40: [
    { id: 401, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 3.68 },
    { id: 402, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 5.08 },
    { id: 403, scheduleDesignation: 'Sch 160', wallThicknessMm: 7.14 },
    { id: 404, scheduleDesignation: 'XXS', wallThicknessMm: 10.15 },
  ],
  50: [
    { id: 501, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 3.91 },
    { id: 502, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 5.54 },
    { id: 503, scheduleDesignation: 'Sch 160', wallThicknessMm: 8.74 },
    { id: 504, scheduleDesignation: 'XXS', wallThicknessMm: 11.07 },
  ],
  65: [
    { id: 651, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 5.16 },
    { id: 652, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 7.01 },
    { id: 653, scheduleDesignation: 'Sch 160', wallThicknessMm: 9.53 },
    { id: 654, scheduleDesignation: 'XXS', wallThicknessMm: 14.02 },
  ],
  80: [
    { id: 801, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 5.49 },
    { id: 802, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 7.62 },
    { id: 803, scheduleDesignation: 'Sch 160', wallThicknessMm: 11.13 },
    { id: 804, scheduleDesignation: 'XXS', wallThicknessMm: 15.24 },
  ],
  100: [
    { id: 1001, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 6.02 },
    { id: 1002, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 8.56 },
    { id: 1003, scheduleDesignation: 'Sch 120', wallThicknessMm: 11.13 },
    { id: 1004, scheduleDesignation: 'Sch 160', wallThicknessMm: 13.49 },
    { id: 1005, scheduleDesignation: 'XXS', wallThicknessMm: 17.12 },
  ],
  125: [
    { id: 1251, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 6.55 },
    { id: 1252, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 9.52 },
    { id: 1253, scheduleDesignation: 'Sch 120', wallThicknessMm: 12.70 },
    { id: 1254, scheduleDesignation: 'Sch 160', wallThicknessMm: 15.88 },
    { id: 1255, scheduleDesignation: 'XXS', wallThicknessMm: 19.05 },
  ],
  150: [
    { id: 1501, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 7.11 },
    { id: 1502, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 10.97 },
    { id: 1503, scheduleDesignation: 'Sch 120', wallThicknessMm: 14.27 },
    { id: 1504, scheduleDesignation: 'Sch 160', wallThicknessMm: 18.26 },
    { id: 1505, scheduleDesignation: 'XXS', wallThicknessMm: 21.95 },
  ],
  200: [
    { id: 2001, scheduleDesignation: 'Sch 20', wallThicknessMm: 6.35 },
    { id: 2002, scheduleDesignation: 'Sch 30', wallThicknessMm: 7.04 },
    { id: 2003, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 8.18 },
    { id: 2004, scheduleDesignation: 'Sch 60', wallThicknessMm: 10.31 },
    { id: 2005, scheduleDesignation: 'Sch 80/XS', wallThicknessMm: 12.70 },
    { id: 2006, scheduleDesignation: 'Sch 100', wallThicknessMm: 15.09 },
    { id: 2007, scheduleDesignation: 'Sch 120', wallThicknessMm: 18.26 },
    { id: 2008, scheduleDesignation: 'Sch 140', wallThicknessMm: 20.62 },
    { id: 2009, scheduleDesignation: 'XXS', wallThicknessMm: 22.23 },
    { id: 2010, scheduleDesignation: 'Sch 160', wallThicknessMm: 23.01 },
  ],
  250: [
    { id: 2501, scheduleDesignation: 'Sch 20', wallThicknessMm: 6.35 },
    { id: 2502, scheduleDesignation: 'Sch 30', wallThicknessMm: 7.80 },
    { id: 2503, scheduleDesignation: 'Sch 40/STD', wallThicknessMm: 9.27 },
    { id: 2504, scheduleDesignation: 'Sch 60/XS', wallThicknessMm: 12.70 },
    { id: 2505, scheduleDesignation: 'Sch 80', wallThicknessMm: 15.09 },
    { id: 2506, scheduleDesignation: 'Sch 100', wallThicknessMm: 18.26 },
    { id: 2507, scheduleDesignation: 'Sch 120', wallThicknessMm: 21.44 },
    { id: 2508, scheduleDesignation: 'Sch 140/XXS', wallThicknessMm: 25.40 },
    { id: 2509, scheduleDesignation: 'Sch 160', wallThicknessMm: 28.58 },
  ],
  300: [
    { id: 3001, scheduleDesignation: 'Sch 20', wallThicknessMm: 6.35 },
    { id: 3002, scheduleDesignation: 'Sch 30', wallThicknessMm: 8.38 },
    { id: 3003, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 3004, scheduleDesignation: 'Sch 40', wallThicknessMm: 10.31 },
    { id: 3005, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 3006, scheduleDesignation: 'Sch 60', wallThicknessMm: 14.27 },
    { id: 3007, scheduleDesignation: 'Sch 80', wallThicknessMm: 17.48 },
    { id: 3008, scheduleDesignation: 'Sch 100', wallThicknessMm: 21.44 },
    { id: 3009, scheduleDesignation: 'Sch 120/XXS', wallThicknessMm: 25.40 },
    { id: 3010, scheduleDesignation: 'Sch 140', wallThicknessMm: 28.58 },
    { id: 3011, scheduleDesignation: 'Sch 160', wallThicknessMm: 33.32 },
  ],
  350: [
    { id: 3501, scheduleDesignation: 'Sch 10', wallThicknessMm: 6.35 },
    { id: 3502, scheduleDesignation: 'Sch 20', wallThicknessMm: 7.92 },
    { id: 3503, scheduleDesignation: 'Sch 30/STD', wallThicknessMm: 9.52 },
    { id: 3504, scheduleDesignation: 'Sch 40', wallThicknessMm: 11.13 },
    { id: 3505, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 3506, scheduleDesignation: 'Sch 60', wallThicknessMm: 15.09 },
    { id: 3507, scheduleDesignation: 'Sch 80', wallThicknessMm: 19.05 },
    { id: 3508, scheduleDesignation: 'Sch 100', wallThicknessMm: 23.82 },
    { id: 3509, scheduleDesignation: 'Sch 120', wallThicknessMm: 27.79 },
    { id: 3510, scheduleDesignation: 'Sch 140', wallThicknessMm: 31.75 },
    { id: 3511, scheduleDesignation: 'Sch 160', wallThicknessMm: 35.71 },
  ],
  400: [
    { id: 4001, scheduleDesignation: 'Sch 10', wallThicknessMm: 6.35 },
    { id: 4002, scheduleDesignation: 'Sch 20', wallThicknessMm: 7.92 },
    { id: 4003, scheduleDesignation: 'Sch 30/STD', wallThicknessMm: 9.52 },
    { id: 4004, scheduleDesignation: 'Sch 40/XS', wallThicknessMm: 12.70 },
    { id: 4005, scheduleDesignation: 'Sch 60', wallThicknessMm: 16.66 },
    { id: 4006, scheduleDesignation: 'Sch 80', wallThicknessMm: 21.44 },
    { id: 4007, scheduleDesignation: 'Sch 100', wallThicknessMm: 26.19 },
    { id: 4008, scheduleDesignation: 'Sch 120', wallThicknessMm: 30.96 },
    { id: 4009, scheduleDesignation: 'Sch 140', wallThicknessMm: 36.52 },
    { id: 4010, scheduleDesignation: 'Sch 160', wallThicknessMm: 40.49 },
  ],
  450: [
    { id: 4501, scheduleDesignation: 'Sch 10', wallThicknessMm: 6.35 },
    { id: 4502, scheduleDesignation: 'Sch 20', wallThicknessMm: 7.92 },
    { id: 4503, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 4504, scheduleDesignation: 'Sch 30', wallThicknessMm: 11.13 },
    { id: 4505, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 4506, scheduleDesignation: 'Sch 40', wallThicknessMm: 14.27 },
    { id: 4507, scheduleDesignation: 'Sch 60', wallThicknessMm: 19.05 },
    { id: 4508, scheduleDesignation: 'Sch 80', wallThicknessMm: 23.83 },
    { id: 4509, scheduleDesignation: 'Sch 100', wallThicknessMm: 29.36 },
    { id: 4510, scheduleDesignation: 'Sch 120', wallThicknessMm: 34.92 },
    { id: 4511, scheduleDesignation: 'Sch 140', wallThicknessMm: 39.69 },
    { id: 4512, scheduleDesignation: 'Sch 160', wallThicknessMm: 45.24 },
  ],
  500: [
    { id: 5001, scheduleDesignation: 'Sch 10', wallThicknessMm: 6.35 },
    { id: 5002, scheduleDesignation: 'Sch 20/STD', wallThicknessMm: 9.52 },
    { id: 5003, scheduleDesignation: 'Sch 30/XS', wallThicknessMm: 12.70 },
    { id: 5004, scheduleDesignation: 'Sch 40', wallThicknessMm: 15.09 },
    { id: 5005, scheduleDesignation: 'Sch 60', wallThicknessMm: 20.63 },
    { id: 5006, scheduleDesignation: 'Sch 80', wallThicknessMm: 26.19 },
    { id: 5007, scheduleDesignation: 'Sch 100', wallThicknessMm: 32.54 },
    { id: 5008, scheduleDesignation: 'Sch 120', wallThicknessMm: 38.10 },
    { id: 5009, scheduleDesignation: 'Sch 140', wallThicknessMm: 44.45 },
    { id: 5010, scheduleDesignation: 'Sch 160', wallThicknessMm: 50.01 },
  ],
  600: [
    { id: 6001, scheduleDesignation: 'Sch 10', wallThicknessMm: 6.35 },
    { id: 6002, scheduleDesignation: 'Sch 20/STD', wallThicknessMm: 9.52 },
    { id: 6003, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 6004, scheduleDesignation: 'Sch 30', wallThicknessMm: 14.27 },
    { id: 6005, scheduleDesignation: 'Sch 40', wallThicknessMm: 17.48 },
    { id: 6006, scheduleDesignation: 'Sch 60', wallThicknessMm: 24.61 },
    { id: 6007, scheduleDesignation: 'Sch 80', wallThicknessMm: 30.96 },
    { id: 6008, scheduleDesignation: 'Sch 100', wallThicknessMm: 38.89 },
    { id: 6009, scheduleDesignation: 'Sch 120', wallThicknessMm: 46.02 },
    { id: 6010, scheduleDesignation: 'Sch 140', wallThicknessMm: 52.39 },
    { id: 6011, scheduleDesignation: 'Sch 160', wallThicknessMm: 59.34 },
  ],
  700: [
    { id: 7001, scheduleDesignation: 'Sch 10', wallThicknessMm: 7.92 },
    { id: 7002, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 7003, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 7004, scheduleDesignation: 'Sch 20', wallThicknessMm: 12.70 },
    { id: 7005, scheduleDesignation: 'Sch 30', wallThicknessMm: 15.88 },
    { id: 7006, scheduleDesignation: 'Sch 40', wallThicknessMm: 19.05 },
    { id: 7007, scheduleDesignation: 'Sch 60', wallThicknessMm: 28.58 },
  ],
  750: [
    { id: 7501, scheduleDesignation: 'Sch 10', wallThicknessMm: 7.92 },
    { id: 7502, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 7503, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 7504, scheduleDesignation: 'Sch 20', wallThicknessMm: 12.70 },
    { id: 7505, scheduleDesignation: 'Sch 30', wallThicknessMm: 15.88 },
    { id: 7506, scheduleDesignation: 'Sch 40', wallThicknessMm: 20.62 },
    { id: 7507, scheduleDesignation: 'Sch 60', wallThicknessMm: 31.75 },
  ],
  800: [
    { id: 8001, scheduleDesignation: 'Sch 10', wallThicknessMm: 7.92 },
    { id: 8002, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 8003, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 8004, scheduleDesignation: 'Sch 20', wallThicknessMm: 12.70 },
    { id: 8005, scheduleDesignation: 'Sch 30', wallThicknessMm: 15.88 },
    { id: 8006, scheduleDesignation: 'Sch 40', wallThicknessMm: 22.22 },
    { id: 8007, scheduleDesignation: 'Sch 60', wallThicknessMm: 34.92 },
  ],
  900: [
    { id: 9001, scheduleDesignation: 'Sch 10', wallThicknessMm: 9.52 },
    { id: 9002, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 9003, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 9004, scheduleDesignation: 'Sch 20', wallThicknessMm: 12.70 },
    { id: 9005, scheduleDesignation: 'Sch 30', wallThicknessMm: 15.88 },
    { id: 9006, scheduleDesignation: 'Sch 40', wallThicknessMm: 25.40 },
    { id: 9007, scheduleDesignation: 'Sch 60', wallThicknessMm: 38.10 },
  ],
  1000: [
    { id: 10001, scheduleDesignation: 'Sch 10', wallThicknessMm: 9.52 },
    { id: 10002, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 10003, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 10004, scheduleDesignation: 'Sch 20', wallThicknessMm: 12.70 },
    { id: 10005, scheduleDesignation: 'Sch 30', wallThicknessMm: 16.66 },
    { id: 10006, scheduleDesignation: 'Sch 40', wallThicknessMm: 26.19 },
    { id: 10007, scheduleDesignation: 'Sch 60', wallThicknessMm: 40.49 },
  ],
  1050: [
    { id: 10501, scheduleDesignation: 'Sch 10', wallThicknessMm: 9.52 },
    { id: 10502, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 10503, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 10504, scheduleDesignation: 'Sch 20', wallThicknessMm: 12.70 },
    { id: 10505, scheduleDesignation: 'Sch 30', wallThicknessMm: 16.66 },
    { id: 10506, scheduleDesignation: 'Sch 40', wallThicknessMm: 27.79 },
  ],
  1200: [
    { id: 12001, scheduleDesignation: 'Sch 10', wallThicknessMm: 9.52 },
    { id: 12002, scheduleDesignation: 'STD', wallThicknessMm: 9.52 },
    { id: 12003, scheduleDesignation: 'XS', wallThicknessMm: 12.70 },
    { id: 12004, scheduleDesignation: 'Sch 20', wallThicknessMm: 14.27 },
    { id: 12005, scheduleDesignation: 'Sch 30', wallThicknessMm: 17.48 },
    { id: 12006, scheduleDesignation: 'Sch 40', wallThicknessMm: 31.75 },
  ],
};

function classifyDamageMechanisms(profile: MaterialTransferProfile): DamageMechanisms {
  const { material, chemistry, flow, equipment } = profile;

  const abrasionSeverity = (): "Low" | "Moderate" | "Severe" => {
    if (material.hardnessClass === "High" && (flow.velocity === "High" || material.silicaContent === "High")) {
      return "Severe";
    }
    if (material.hardnessClass === "Medium" || flow.velocity === "Medium" || material.particleShape === "Angular") {
      return "Moderate";
    }
    return "Low";
  };

  const impactSeverity = (): "Low" | "Moderate" | "Severe" => {
    if (flow.impactAngle === "High" && equipment.impactZones) {
      return "Severe";
    }
    if (flow.impactAngle === "Mixed" || (material.particleSize === "Coarse" || material.particleSize === "VeryCoarse")) {
      return "Moderate";
    }
    return "Low";
  };

  const corrosionSeverity = (): "Low" | "Moderate" | "High" => {
    if (chemistry.phRange === "Acidic" || chemistry.chlorides === "High") {
      return "High";
    }
    if (chemistry.chlorides === "Moderate" || chemistry.temperatureRange === "High") {
      return "Moderate";
    }
    return "Low";
  };

  const abrasion = abrasionSeverity();
  const impact = impactSeverity();
  const corrosion = corrosionSeverity();

  const dominantMechanism = (): "Impact Abrasion" | "Sliding Abrasion" | "Corrosion" | "Mixed" => {
    if (impact === "Severe") return "Impact Abrasion";
    if (abrasion === "Severe") return "Sliding Abrasion";
    if (corrosion === "High") return "Corrosion";
    return "Mixed";
  };

  return {
    abrasion,
    impact,
    corrosion,
    dominantMechanism: dominantMechanism()
  };
}

function recommendLining(profile: MaterialTransferProfile, damage: DamageMechanisms): LiningRecommendation {
  if (damage.impact === "Severe") {
    return {
      lining: "Rubber-Ceramic Composite",
      liningType: "Ceramic Lined",
      thicknessRange: "15–30 mm",
      standardsBasis: ["ASTM C1327", "ASTM D412", "ISO 4649"],
      rationale: "High impact combined with abrasion requires composite protection",
      engineeringNotes: [
        "Rubber backing absorbs impact energy",
        "Ceramic face provides wear resistance",
        "Consider 92% or 95% alumina tiles for severe applications"
      ]
    };
  }

  if (damage.abrasion === "Severe") {
    return {
      lining: "Alumina Ceramic Tile",
      liningType: "Ceramic Lined",
      thicknessRange: "10–20 mm",
      standardsBasis: ["ASTM C1327", "ISO 14705", "ASTM C773"],
      rationale: "Severe sliding abrasion with moderate impact",
      engineeringNotes: [
        "96% or 99% alumina recommended for high silica content",
        "Hexagonal tiles provide better coverage in curved sections",
        "Ensure proper adhesive selection for operating temperature"
      ]
    };
  }

  if (damage.corrosion === "High") {
    const isHighTemp = profile.chemistry.temperatureRange === "High";
    return {
      lining: isHighTemp ? "Hard Rubber Lining" : "Natural Rubber Lining",
      liningType: "Rubber Lined",
      thicknessRange: "6–15 mm",
      standardsBasis: ["ASTM D2000", "ASTM D412", "ISO 4649"],
      rationale: "Acidic or high chloride environment requires chemical-resistant lining",
      engineeringNotes: [
        "Natural rubber for ambient temperature applications",
        "Bromobutyl rubber for improved chemical resistance",
        "Consider 50-60 Shore A hardness for abrasion resistance"
      ]
    };
  }

  if (damage.abrasion === "Moderate" && profile.material.particleSize === "Fine") {
    return {
      lining: "Cast Polyurethane",
      liningType: "PU Lined",
      thicknessRange: "5–10 mm",
      standardsBasis: ["ASTM D412", "ASTM D2240", "ISO 4649"],
      rationale: "Fine particle abrasion with moderate severity",
      engineeringNotes: [
        "Excellent for fine particle slurries",
        "Low friction coefficient reduces buildup",
        "Shore hardness 70-85A typical for slurry applications"
      ]
    };
  }

  if (profile.chemistry.phRange === "Neutral" && damage.abrasion === "Low") {
    return {
      lining: "HDPE Lining",
      liningType: "HDPE Lined",
      thicknessRange: "3–8 mm",
      standardsBasis: ["ASTM D3350", "ISO 4427"],
      rationale: "Low wear, neutral chemistry - cost-effective protection",
      engineeringNotes: [
        "PE100 grade for improved pressure resistance",
        "Consider PE100-RC for stress crack resistance",
        "Suitable for non-abrasive slurries"
      ]
    };
  }

  return {
    lining: "Natural Rubber Lining",
    liningType: "Rubber Lined",
    thicknessRange: "6–12 mm",
    standardsBasis: ["ASTM D2000", "ASTM D412", "ISO 4649"],
    rationale: "General-purpose protection for moderate conditions",
    engineeringNotes: [
      "Natural rubber provides good all-round protection",
      "40-50 Shore A for impact absorption",
      "Consider thickness based on expected service life"
    ]
  };
}

function hasCompleteProfile(profile: MaterialTransferProfile): boolean {
  const { material, chemistry, flow, equipment } = profile;
  return !!(
    material.particleSize &&
    material.particleShape &&
    material.hardnessClass &&
    chemistry.phRange &&
    flow.velocity &&
    flow.impactAngle &&
    equipment.equipmentType
  );
}

/**
 * Map steel specification name to P-T rating material group.
 * This determines which ASME B16.5 material group to use for pressure-temperature ratings.
 */
function getFlangeMaterialGroup(steelSpecName?: string): string {
  if (!steelSpecName) return 'Carbon Steel A105 (Group 1.1)';

  const specUpper = steelSpecName.toUpperCase();

  // Stainless Steel 316/316L (ASTM A312 TP316, TP316L)
  if (specUpper.includes('316') || specUpper.includes('TP316')) {
    return 'Stainless Steel 316 (Group 2.2)';
  }

  // Stainless Steel 304/304L (ASTM A312 TP304, TP304L)
  if (specUpper.includes('304') || specUpper.includes('TP304')) {
    return 'Stainless Steel 304 (Group 2.1)';
  }

  // All other steels (carbon steel, alloy steel, etc.) use Carbon Steel A105 ratings
  return 'Carbon Steel A105 (Group 1.1)';
}

interface ExternalEnvironmentProfile {
  installation: {
    type?: "AboveGround" | "Buried" | "Submerged" | "Splash";
    uvExposure?: "None" | "Moderate" | "High";
    mechanicalRisk?: "Low" | "Medium" | "High";
  };
  atmosphere: {
    iso12944Category?: "C1" | "C2" | "C3" | "C4" | "C5" | "CX";
    marineInfluence?: "None" | "Coastal" | "Offshore";
    industrialPollution?: "None" | "Moderate" | "Heavy";
  };
  soil: {
    soilType?: "Sandy" | "Clay" | "Rocky" | "Marshy";
    resistivity?: "VeryLow" | "Low" | "Medium" | "High";
    moisture?: "Dry" | "Normal" | "Wet" | "Saturated";
  };
  operating: {
    temperature?: "Ambient" | "Elevated" | "High" | "Cyclic";
    cathodicProtection?: boolean;
    serviceLife?: "Short" | "Medium" | "Long" | "Extended";
  };
}

interface ExternalCoatingRecommendation {
  coating: string;
  coatingType: string;
  system: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

interface ExternalDamageMechanisms {
  atmosphericCorrosion: "Low" | "Moderate" | "High" | "Severe";
  soilCorrosion: "Low" | "Moderate" | "High" | "Severe";
  mechanicalDamage: "Low" | "Moderate" | "High";
  dominantMechanism: "Atmospheric" | "Soil/Buried" | "Marine" | "Mechanical" | "Mixed";
}

function classifyExternalDamageMechanisms(profile: ExternalEnvironmentProfile): ExternalDamageMechanisms {
  const { installation, atmosphere, soil } = profile;

  const atmosphericSeverity = (): "Low" | "Moderate" | "High" | "Severe" => {
    if (atmosphere.iso12944Category === "CX" || atmosphere.marineInfluence === "Offshore") {
      return "Severe";
    }
    if (atmosphere.iso12944Category === "C5" || atmosphere.marineInfluence === "Coastal" || atmosphere.industrialPollution === "Heavy") {
      return "High";
    }
    if (atmosphere.iso12944Category === "C3" || atmosphere.iso12944Category === "C4" || atmosphere.industrialPollution === "Moderate") {
      return "Moderate";
    }
    return "Low";
  };

  const soilSeverity = (): "Low" | "Moderate" | "High" | "Severe" => {
    if (installation.type !== "Buried") return "Low";
    if (soil.resistivity === "VeryLow" && soil.moisture === "Saturated") {
      return "Severe";
    }
    if (soil.resistivity === "VeryLow" || soil.resistivity === "Low" || soil.moisture === "Wet" || soil.moisture === "Saturated") {
      return "High";
    }
    if (soil.resistivity === "Medium" || soil.soilType === "Clay") {
      return "Moderate";
    }
    return "Low";
  };

  const mechanicalSeverity = (): "Low" | "Moderate" | "High" => {
    if (installation.mechanicalRisk === "High") return "High";
    if (installation.mechanicalRisk === "Medium" || installation.type === "Buried") return "Moderate";
    return "Low";
  };

  const atmospheric = atmosphericSeverity();
  const soilCorrosion = soilSeverity();
  const mechanical = mechanicalSeverity();

  const dominantMechanism = (): "Atmospheric" | "Soil/Buried" | "Marine" | "Mechanical" | "Mixed" => {
    if (atmosphere.marineInfluence === "Offshore" || atmosphere.marineInfluence === "Coastal") return "Marine";
    if (installation.type === "Buried" && (soilCorrosion === "Severe" || soilCorrosion === "High")) return "Soil/Buried";
    if (atmospheric === "Severe" || atmospheric === "High") return "Atmospheric";
    if (mechanical === "High") return "Mechanical";
    return "Mixed";
  };

  return {
    atmosphericCorrosion: atmospheric,
    soilCorrosion,
    mechanicalDamage: mechanical,
    dominantMechanism: dominantMechanism()
  };
}

function recommendExternalCoating(profile: ExternalEnvironmentProfile, damage: ExternalDamageMechanisms): ExternalCoatingRecommendation {
  const { installation, operating } = profile;
  const isHighUV = installation.uvExposure === "High";

  // Helper to ensure polyurethane topcoat is included for high UV exposure
  const addUVTopcoatNote = (recommendation: ExternalCoatingRecommendation): ExternalCoatingRecommendation => {
    if (!isHighUV) return recommendation;

    // Check if polyurethane is already included in the system
    const hasPolyurethane = recommendation.system.toLowerCase().includes('polyurethane') ||
                           recommendation.system.toLowerCase().includes('pu ') ||
                           recommendation.coating.toLowerCase().includes('polyurethane');

    if (!hasPolyurethane) {
      return {
        ...recommendation,
        system: recommendation.system + " + Aliphatic Polyurethane UV topcoat (50-80μm)",
        engineeringNotes: [
          ...recommendation.engineeringNotes,
          "High UV exposure: Aliphatic polyurethane topcoat required for UV resistance and color/gloss retention"
        ]
      };
    }
    return recommendation;
  };

  if (installation.type === "Buried") {
    if (damage.soilCorrosion === "Severe" || damage.soilCorrosion === "High") {
      return {
        coating: "Fusion Bonded Epoxy (FBE) or 3-Layer Polyethylene (3LPE)",
        coatingType: "Paint",
        system: "SA 2.5 blast (ISO 8501-1) → FBE: 350-500μm or 3LPE: 1.8-3.0mm total",
        thicknessRange: "350–3000 μm",
        standardsBasis: ["ISO 8501-1", "ISO 21809-1", "ISO 21809-2", "NACE SP0169", "AS/NZS 4822"],
        rationale: "Severe soil corrosivity requires heavy-duty pipeline coating with CP compatibility",
        engineeringNotes: [
          "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
          "FBE provides excellent adhesion and CP compatibility",
          "3LPE recommended for rocky terrain or high mechanical stress",
          "Ensure holiday detection testing per NACE SP0188",
          "Field joint coating critical - use compatible shrink sleeves"
        ]
      };
    }
    return {
      coating: "Coal Tar Epoxy or Polyurethane Coating",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Primer + 2 coats, 400-600μm DFT",
      thicknessRange: "400–600 μm",
      standardsBasis: ["ISO 8501-1", "ISO 21809-3", "AWWA C222", "NACE SP0169"],
      rationale: "Moderate soil conditions with cathodic protection compatibility",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Coal tar epoxy for proven long-term performance",
        "Consider wrap coating for additional mechanical protection"
      ]
    };
  }

  if (damage.dominantMechanism === "Marine" || damage.atmosphericCorrosion === "Severe") {
    return addUVTopcoatNote({
      coating: "High-Build Epoxy System",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Zinc-rich primer + Epoxy MIO intermediate + Polyurethane topcoat",
      thicknessRange: "320–450 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "ISO 12944-6", "NORSOK M-501", "SSPC-PA 2"],
      rationale: "Marine/offshore environment requires maximum corrosion protection",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Zinc-rich primer (60-80μm) for cathodic protection",
        "Epoxy MIO intermediate (150-200μm) for barrier protection",
        "Polyurethane topcoat (60-80μm) for UV and gloss retention",
        "Consider thermal spray aluminium (TSA) for splash zones"
      ]
    });
  }

  if (damage.atmosphericCorrosion === "High") {
    return addUVTopcoatNote({
      coating: "Epoxy-Polyurethane System",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Zinc phosphate primer + Epoxy intermediate + Polyurethane topcoat",
      thicknessRange: "250–350 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "AS/NZS 2312.1", "SSPC-PA 2"],
      rationale: "Industrial or coastal atmosphere with high corrosion risk",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Zinc phosphate primer (50-75μm) for steel adhesion",
        "High-build epoxy intermediate (125-175μm)",
        "Aliphatic polyurethane topcoat for UV stability",
        "Recoat intervals per ISO 12944-9"
      ]
    });
  }

  if (installation.mechanicalRisk === "High" || installation.type === "Splash") {
    return addUVTopcoatNote({
      coating: "Rubber Coating or Polyurea",
      coatingType: "Rubber Lined",
      system: "SA 2.5 blast (ISO 8501-1) → Chloroprene rubber 3-6mm or Polyurea 1.5-3mm",
      thicknessRange: "1500–6000 μm",
      standardsBasis: ["ISO 8501-1", "ASTM D4541", "ASTM D2000", "ISO 4649"],
      rationale: "High mechanical stress or splash zone requires impact-resistant coating",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Chloroprene (Neoprene) rubber for abrasion and weathering",
        "Polyurea for rapid application and seamless coverage",
        "Shore A hardness 50-70 for impact absorption",
        "Consider armoring at support points"
      ]
    });
  }

  if (damage.atmosphericCorrosion === "Moderate") {
    return addUVTopcoatNote({
      coating: "Alkyd or Acrylic System",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Alkyd primer + Alkyd/Acrylic topcoat",
      thicknessRange: "150–250 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "AS/NZS 2312.1"],
      rationale: "Moderate atmospheric exposure - cost-effective protection",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Suitable for C2-C3 environments",
        "Alkyd primer (50-75μm) on prepared steel",
        "Acrylic topcoat for better UV resistance than alkyd",
        "Regular maintenance inspection recommended"
      ]
    });
  }

  if (operating.temperature === "Elevated" || operating.temperature === "High") {
    return addUVTopcoatNote({
      coating: "Silicone or Epoxy Phenolic",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Heat-resistant primer + Silicone topcoat",
      thicknessRange: "75–150 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "ASTM D6695"],
      rationale: "Elevated temperature service requires heat-resistant coating",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Silicone coatings for temperatures up to 540°C",
        "Epoxy phenolic for temperatures up to 200°C with chemical resistance",
        "Inorganic zinc silicate primer for high-temp applications",
        "Cure requirements critical for performance"
      ]
    });
  }

  if (installation.uvExposure === "None" && damage.atmosphericCorrosion === "Low") {
    return {
      coating: "Hot-Dip Galvanizing",
      coatingType: "Galvanized",
      system: "HDG per ISO 1461 (no blasting required - pickling process)",
      thicknessRange: "45–85 μm (depends on steel thickness)",
      standardsBasis: ["ISO 1461", "ASTM A123", "AS/NZS 4680"],
      rationale: "Indoor or sheltered environment with low corrosion risk",
      engineeringNotes: [
        "Surface prep: Chemical cleaning & pickling (no blast cleaning required)",
        "Minimum 45μm for steel <1.5mm, 85μm for steel >6mm",
        "Self-healing zinc protection",
        "Can be duplex coated (galvanized + paint) for extended life",
        "Ensure proper drainage design to avoid wet storage stain"
      ]
    };
  }

  return addUVTopcoatNote({
    coating: "Standard Epoxy System",
    coatingType: "Paint",
    system: "SA 2.5 blast (ISO 8501-1) → Epoxy primer + Epoxy topcoat",
    thicknessRange: "200–300 μm total DFT",
    standardsBasis: ["ISO 8501-1", "ISO 12944-5", "SSPC-PA 2"],
    rationale: "General-purpose protection for mild environments",
    engineeringNotes: [
      "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
      "Epoxy primer (75-100μm) for adhesion",
      "High-build epoxy topcoat (125-200μm)",
      "Good chemical and abrasion resistance",
      "Note: Epoxy may chalk under UV - consider PU topcoat for exposed areas"
    ]
  });
}

function hasCompleteExternalProfile(profile: ExternalEnvironmentProfile): boolean {
  const { installation, atmosphere, operating } = profile;
  return !!(
    installation.type &&
    atmosphere.iso12944Category &&
    operating.serviceLife
  );
}

function ProjectDetailsStep({ rfqData, onUpdate, errors, globalSpecs, onUpdateGlobalSpecs, pendingDocuments, onAddDocument, onRemoveDocument }: any) {
  const [additionalNotes, setAdditionalNotes] = useState<string[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapViewConfig, setMapViewConfig] = useState<'default' | 'responsive' | 'compact'>('responsive');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const hasProjectTypeError = Boolean(errors.projectType);

  // Document upload confirmation state
  const [documentsConfirmed, setDocumentsConfirmed] = useState(false);
  const [showNoDocumentsPopup, setShowNoDocumentsPopup] = useState(false);

  // SA Mines state
  const [mines, setMines] = useState<SaMine[]>([]);
  const [selectedMineId, setSelectedMineId] = useState<number | null>(null);
  const [isLoadingMines, setIsLoadingMines] = useState(false);
  const [mineDataLoading, setMineDataLoading] = useState(false);
  const [showAddMineModal, setShowAddMineModal] = useState(false);

  // Track which location fields were auto-filled from the map picker
  const [locationAutoFilled, setLocationAutoFilled] = useState<{
    latitude: boolean;
    longitude: boolean;
    siteAddress: boolean;
    region: boolean;
    country: boolean;
  }>({
    latitude: false,
    longitude: false,
    siteAddress: false,
    region: false,
    country: false,
  });

  // Section confirmation state - for locking data after user confirms
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [environmentalConfirmed, setEnvironmentalConfirmed] = useState(false);

  // Edit mode state - for unlocking confirmed sections
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingEnvironmental, setIsEditingEnvironmental] = useState(false);

  // Environmental intelligence auto-fill
  const {
    isLoading: isLoadingEnvironmental,
    errors: environmentalErrors,
    autoFilledFields,
    metadata: environmentalMetadata,
    fetchAndApply: fetchEnvironmentalData,
    wasAutoFilled,
    markAsOverridden,
    markFieldsAsAutoFilled,
  } = useEnvironmentalIntelligence();

  const handleLocationSelect = async (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string }
  ) => {
    // Update location fields and mark as auto-filled
    onUpdate("latitude", location.lat);
    onUpdate("longitude", location.lng);

    // Track which fields are being auto-filled
    const newAutoFilled = {
      latitude: true,
      longitude: true,
      siteAddress: false,
      region: false,
      country: false,
    };

    if (addressComponents) {
      if (addressComponents.address) {
        onUpdate("siteAddress", addressComponents.address);
        newAutoFilled.siteAddress = true;
      }
      if (addressComponents.region) {
        onUpdate("region", addressComponents.region);
        newAutoFilled.region = true;
      }
      if (addressComponents.country) {
        onUpdate("country", addressComponents.country);
        newAutoFilled.country = true;
      }
    }

    setLocationAutoFilled(newAutoFilled);
    setShowMapPicker(false);

    // Fetch environmental data and auto-fill fields
    if (onUpdateGlobalSpecs) {
      try {
        console.log('[Form] Fetching environmental data for:', location);
        const environmentalData = await fetchEnvironmentalData(
          location.lat,
          location.lng,
          addressComponents?.region,
          addressComponents?.country
        );

        console.log('[Form] Environmental data received:', environmentalData);
        console.log('[Form] Current globalSpecs:', globalSpecs);

        // Update globalSpecs with environmental data
        const updatedSpecs = {
          ...globalSpecs,
          ...environmentalData,
        };
        console.log('[Form] Updated globalSpecs:', updatedSpecs);
        onUpdateGlobalSpecs(updatedSpecs);
      } catch (error) {
        // Silently handle - user can still fill in manually
        if (error instanceof Error && error.message !== 'Backend unavailable') {
          console.error('Failed to fetch environmental data:', error);
        }
      }
    }
  };

  const commonNotes = [
    "All pipes to be hydrostatically tested before delivery",
    "Material certificates required (EN 10204 3.1)",
    "Pipes to be supplied with protective end caps",
    "Delivery required to site in South Africa",
    "All flanges to be raised face (RF) unless specified",
    "Pipes to comply with SABS/SANS standards",
    "Mill test certificates required for all items",
    "Surface preparation: Shot blast to SA2.5 standard",
    "Urgent delivery required - please expedite",
    "Client inspection required before dispatch"
  ];

  // Fallback mines data when API is unavailable - Complete list of SA mines (alphabetical order)
  const fallbackMines: SaMine[] = [
    { id: 18, mineName: 'Amandelbult Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Thabazimbi, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -24.8167, longitude: 27.3667 },
    { id: 23, mineName: 'Bathopele Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Rustenburg, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6333, longitude: 27.3000 },
    { id: 14, mineName: 'Beatrix Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 2, commodityName: 'Gold', province: 'Free State', district: 'Lejweleputswa', physicalAddress: 'Welkom, Free State', mineType: 'Underground', operationalStatus: 'Active', latitude: -28.0000, longitude: 26.7500 },
    { id: 29, mineName: 'Beeshoek Mine', operatingCompany: 'Assmang', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'Siyanda', physicalAddress: 'Postmasburg, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -28.4333, longitude: 23.1500 },
    { id: 32, mineName: 'Black Mountain Mine', operatingCompany: 'Vedanta Zinc', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Northern Cape', district: 'Namakwa', physicalAddress: 'Aggeneys, Northern Cape', mineType: 'Underground', operationalStatus: 'Active', latitude: -29.2333, longitude: 18.8167 },
    { id: 38, mineName: 'Cullinan Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Gauteng', district: 'Tshwane', physicalAddress: 'Cullinan, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6833, longitude: 28.5167 },
    { id: 15, mineName: 'Driefontein Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Carletonville, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.3833, longitude: 27.5167 },
    { id: 37, mineName: 'Finsch Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Northern Cape', district: 'Frances Baard', physicalAddress: 'Lime Acres, Northern Cape', mineType: 'Underground', operationalStatus: 'Active', latitude: -28.3833, longitude: 23.4500 },
    { id: 33, mineName: 'Gamsberg Mine', operatingCompany: 'Vedanta Zinc', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Northern Cape', district: 'Namakwa', physicalAddress: 'Aggeneys, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -29.2500, longitude: 18.9333 },
    { id: 3, mineName: 'Goedehoop Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Middelburg, Mpumalanga', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.7700, longitude: 29.4700 },
    { id: 4, mineName: 'Greenside Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Witbank, Mpumalanga', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.8900, longitude: 29.1600 },
    { id: 6, mineName: 'Grootegeluk Mine', operatingCompany: 'Exxaro', commodityId: 1, commodityName: 'Coal', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Lephalale, Limpopo', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -23.6500, longitude: 27.7000 },
    { id: 20, mineName: 'Impala Rustenburg', operatingCompany: 'Impala Platinum', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Rustenburg, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6667, longitude: 27.2500 },
    { id: 1, mineName: 'Isibonelo Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Ogies, Mpumalanga', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -26.0167, longitude: 29.0500 },
    { id: 30, mineName: 'Khumani Mine', operatingCompany: 'Assmang', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'John Taolo Gaetsewe', physicalAddress: 'Kathu, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -27.2167, longitude: 22.9500 },
    { id: 2, mineName: 'Khwezela Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Emalahleni, Mpumalanga', mineType: 'Both', operationalStatus: 'Active', latitude: -25.8700, longitude: 29.2100 },
    { id: 16, mineName: 'Kloof Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Westonaria, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.4000, longitude: 27.5833 },
    { id: 39, mineName: 'Koffiefontein Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Free State', district: 'Xhariep', physicalAddress: 'Koffiefontein, Free State', mineType: 'Underground', operationalStatus: 'Active', latitude: -29.4167, longitude: 25.0000 },
    { id: 27, mineName: 'Kolomela Mine', operatingCompany: 'Kumba Iron Ore', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'Siyanda', physicalAddress: 'Postmasburg, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -28.3333, longitude: 23.0833 },
    { id: 24, mineName: 'Kroondal Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Rustenburg, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6500, longitude: 27.3167 },
    { id: 12, mineName: 'Kusasalethu Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Carletonville, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.3667, longitude: 27.3833 },
    { id: 5, mineName: 'Mafube Colliery', operatingCompany: 'Exxaro', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Belfast, Mpumalanga', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -25.6800, longitude: 30.0400 },
    { id: 25, mineName: 'Marikana Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Marikana, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.7000, longitude: 27.4833 },
    { id: 21, mineName: 'Marula Mine', operatingCompany: 'Impala Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Sekhukhune', physicalAddress: 'Burgersfort, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -24.5000, longitude: 30.1500 },
    { id: 7, mineName: 'Matla Colliery', operatingCompany: 'Eskom', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Kriel, Mpumalanga', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.2500, longitude: 29.2500 },
    { id: 11, mineName: 'Moab Khotsong Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'North West', district: 'Dr Kenneth Kaunda', physicalAddress: 'Orkney, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.9833, longitude: 26.6667 },
    { id: 17, mineName: 'Mogalakwena Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Mokopane, Limpopo', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -23.9333, longitude: 28.7667 },
    { id: 10, mineName: 'Mponeng Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Carletonville, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.4000, longitude: 27.3833 },
    { id: 8, mineName: 'New Denmark Colliery', operatingCompany: 'Eskom', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Gert Sibande', physicalAddress: 'Standerton, Mpumalanga', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -26.9300, longitude: 29.2400 },
    { id: 31, mineName: 'Palabora Mining Company', operatingCompany: 'Palabora Mining Company', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Limpopo', district: 'Mopani', physicalAddress: 'Phalaborwa, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -23.9667, longitude: 31.1333 },
    { id: 34, mineName: 'Prieska Zinc-Copper', operatingCompany: 'Orion Minerals', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Northern Cape', district: 'Siyanda', physicalAddress: 'Prieska, Northern Cape', mineType: 'Underground', operationalStatus: 'Care and Maintenance', latitude: -29.6667, longitude: 22.7500 },
    { id: 26, mineName: 'Sishen Mine', operatingCompany: 'Kumba Iron Ore', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'John Taolo Gaetsewe', physicalAddress: 'Kathu, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -27.2000, longitude: 23.0000 },
    { id: 9, mineName: 'South Deep Mine', operatingCompany: 'Gold Fields', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Westonaria, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.4167, longitude: 27.6667 },
    { id: 13, mineName: 'Target Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'Free State', district: 'Lejweleputswa', physicalAddress: 'Allanridge, Free State', mineType: 'Underground', operationalStatus: 'Active', latitude: -27.7667, longitude: 26.6333 },
    { id: 28, mineName: 'Thabazimbi Mine', operatingCompany: 'Kumba Iron Ore', commodityId: 4, commodityName: 'Iron Ore', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Thabazimbi, Limpopo', mineType: 'Both', operationalStatus: 'Care and Maintenance', latitude: -24.5833, longitude: 27.4000 },
    { id: 22, mineName: 'Two Rivers Mine', operatingCompany: 'Impala Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Sekhukhune', physicalAddress: 'Steelpoort, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -24.6833, longitude: 30.1000 },
    { id: 19, mineName: 'Unki Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Capricorn', physicalAddress: 'Polokwane, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -23.9000, longitude: 29.4500 },
    { id: 35, mineName: 'Venetia Mine', operatingCompany: 'De Beers', commodityId: 6, commodityName: 'Diamonds', province: 'Limpopo', district: 'Vhembe', physicalAddress: 'Musina, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -22.4500, longitude: 29.3167 },
    { id: 36, mineName: 'Voorspoed Mine', operatingCompany: 'De Beers', commodityId: 6, commodityName: 'Diamonds', province: 'Free State', district: 'Lejweleputswa', physicalAddress: 'Kroonstad, Free State', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -27.7667, longitude: 27.2333 },
    { id: 40, mineName: 'Williamson Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Free State', district: 'Xhariep', physicalAddress: 'Jagersfontein, Free State', mineType: 'Open Cast', operationalStatus: 'Care and Maintenance', latitude: -29.7667, longitude: 25.4333 },
  ];

  // Fetch SA mines on mount
  useEffect(() => {
    const fetchMines = async () => {
      setIsLoadingMines(true);
      try {
        const activeMines = await minesApi.getActiveMines();
        setMines(activeMines);
      } catch (error) {
        // Silently use fallback mines when backend is unavailable
        if (error instanceof Error && error.message !== 'Backend unavailable') {
          console.error('Failed to fetch mines:', error);
        }
        setMines(fallbackMines);
      } finally {
        setIsLoadingMines(false);
      }
    };
    fetchMines();
  }, []);

  // Fallback slurry profiles by commodity when API is unavailable
  const fallbackSlurryProfiles: Record<string, any> = {
    'Coal': { phMin: 6.5, phMax: 8.5, typicalSgMin: 1.10, typicalSgMax: 1.35, solidsConcentrationMin: 20, solidsConcentrationMax: 45, tempMin: 15, tempMax: 45, abrasionRisk: 'Medium', corrosionRisk: 'Low', primaryFailureMode: 'Abrasion' },
    'Gold': { phMin: 10.0, phMax: 11.5, typicalSgMin: 1.30, typicalSgMax: 1.50, solidsConcentrationMin: 40, solidsConcentrationMax: 55, tempMin: 20, tempMax: 60, abrasionRisk: 'Very High', corrosionRisk: 'High', primaryFailureMode: 'Abrasion' },
    'PGM': { phMin: 8.0, phMax: 10.0, typicalSgMin: 1.25, typicalSgMax: 1.45, solidsConcentrationMin: 35, solidsConcentrationMax: 50, tempMin: 20, tempMax: 55, abrasionRisk: 'Very High', corrosionRisk: 'Medium', primaryFailureMode: 'Abrasion' },
    'Iron Ore': { phMin: 6.5, phMax: 8.0, typicalSgMin: 1.50, typicalSgMax: 2.00, solidsConcentrationMin: 50, solidsConcentrationMax: 70, tempMin: 15, tempMax: 40, abrasionRisk: 'Very High', corrosionRisk: 'Low', primaryFailureMode: 'Abrasion' },
    'Copper/Base Metals': { phMin: 1.5, phMax: 4.0, typicalSgMin: 1.20, typicalSgMax: 1.40, solidsConcentrationMin: 25, solidsConcentrationMax: 45, tempMin: 25, tempMax: 65, abrasionRisk: 'High', corrosionRisk: 'Very High', primaryFailureMode: 'Corrosion' },
    'Diamonds': { phMin: 6.5, phMax: 8.0, typicalSgMin: 1.40, typicalSgMax: 1.80, solidsConcentrationMin: 30, solidsConcentrationMax: 50, tempMin: 15, tempMax: 35, abrasionRisk: 'Medium', corrosionRisk: 'Low', primaryFailureMode: 'Abrasion' },
  };

  // Fallback environmental data by South African province (typical values)
  const fallbackEnvironmentalByProvince: Record<string, any> = {
    'Mpumalanga': {
      tempMin: 8, tempMax: 28, tempMean: 18, humidityMin: 45, humidityMax: 85, humidityMean: 65,
      annualRainfall: '500-1000', ecpMarineInfluence: 'None', ecpIso12944Category: 'C3',
      ecpIndustrialPollution: 'Moderate', soilType: 'Ferralsols', soilTexture: 'Clay Loam',
      soilMoisture: '25%', soilMoistureClass: 'Moderate', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '350 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 3.5,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'Limpopo': {
      tempMin: 10, tempMax: 32, tempMean: 22, humidityMin: 35, humidityMax: 75, humidityMean: 55,
      annualRainfall: '250-500', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Low', soilType: 'Lixisols', soilTexture: 'Sandy Clay Loam',
      soilMoisture: '18%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '400 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Low', uvExposure: 'Very High', windSpeed: 2.8,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Low', isoCategory: 'T2' },
    },
    'Gauteng': {
      tempMin: 5, tempMax: 28, tempMean: 16, humidityMin: 40, humidityMax: 80, humidityMean: 60,
      annualRainfall: '500-1000', ecpMarineInfluence: 'None', ecpIso12944Category: 'C3',
      ecpIndustrialPollution: 'High', soilType: 'Acrisols', soilTexture: 'Clay Loam',
      soilMoisture: '22%', soilMoistureClass: 'Moderate', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '500 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 4.2,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'North West': {
      tempMin: 3, tempMax: 32, tempMean: 18, humidityMin: 30, humidityMax: 70, humidityMean: 50,
      annualRainfall: '250-500', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Moderate', soilType: 'Luvisols', soilTexture: 'Sandy Loam',
      soilMoisture: '15%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '450 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Low', uvExposure: 'High', windSpeed: 3.8,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Low', isoCategory: 'T2' },
    },
    'Northern Cape': {
      tempMin: 2, tempMax: 35, tempMean: 19, humidityMin: 20, humidityMax: 60, humidityMean: 40,
      annualRainfall: '<250', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Low', soilType: 'Calcisols', soilTexture: 'Sandy Loam',
      soilMoisture: '10%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '300 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'None', uvExposure: 'Very High', windSpeed: 4.5,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Very Low', isoCategory: 'T1' },
    },
    'Free State': {
      tempMin: 0, tempMax: 30, tempMean: 15, humidityMin: 35, humidityMax: 75, humidityMean: 55,
      annualRainfall: '500-1000', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Low', soilType: 'Vertisols', soilTexture: 'Clay',
      soilMoisture: '20%', soilMoistureClass: 'Moderate', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '400 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 4.0,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'KwaZulu-Natal': {
      tempMin: 12, tempMax: 28, tempMean: 20, humidityMin: 60, humidityMax: 90, humidityMean: 75,
      annualRainfall: '1000-2000', ecpMarineInfluence: 'Coastal', ecpIso12944Category: 'C4',
      ecpIndustrialPollution: 'Moderate', soilType: 'Nitisols', soilTexture: 'Clay',
      soilMoisture: '35%', soilMoistureClass: 'High', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '50 km', detailedMarineInfluence: 'Moderate Marine',
      floodRisk: 'High', uvExposure: 'High', windSpeed: 3.2,
      airSaltContent: { level: 'Medium', isoCategory: 'S2' },
      timeOfWetness: { level: 'High', isoCategory: 'T4' },
    },
    'Eastern Cape': {
      tempMin: 8, tempMax: 26, tempMean: 17, humidityMin: 55, humidityMax: 85, humidityMean: 70,
      annualRainfall: '500-1000', ecpMarineInfluence: 'Coastal', ecpIso12944Category: 'C3',
      ecpIndustrialPollution: 'Low', soilType: 'Cambisols', soilTexture: 'Loam',
      soilMoisture: '28%', soilMoistureClass: 'Moderate', soilDrainage: 'Well',
      distanceToCoastFormatted: '100 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 4.8,
      airSaltContent: { level: 'Low', isoCategory: 'S1' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'Western Cape': {
      tempMin: 7, tempMax: 26, tempMean: 16, humidityMin: 50, humidityMax: 85, humidityMean: 68,
      annualRainfall: '500-1000', ecpMarineInfluence: 'Coastal', ecpIso12944Category: 'C4',
      ecpIndustrialPollution: 'Low', soilType: 'Arenosols', soilTexture: 'Sandy Loam',
      soilMoisture: '18%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '30 km', detailedMarineInfluence: 'High Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 5.2,
      airSaltContent: { level: 'High', isoCategory: 'S3' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
  };

  // Get fallback environmental data for a province
  const getFallbackEnvironmentalData = (province: string) => {
    return fallbackEnvironmentalByProvince[province] || fallbackEnvironmentalByProvince['Gauteng'];
  };

  // Fallback lining recommendations by risk levels
  const getFallbackLiningRecommendation = (abrasionRisk: string, corrosionRisk: string) => {
    if (abrasionRisk === 'Very High' && corrosionRisk === 'Low') return { recommendedLining: 'Ceramic Tile (95% Al2O3)', recommendedCoating: 'None' };
    if (abrasionRisk === 'Very High' && corrosionRisk === 'Medium') return { recommendedLining: 'Ceramic + Rubber Composite', recommendedCoating: 'Rubber Backing' };
    if (abrasionRisk === 'High' && corrosionRisk === 'Very High') return { recommendedLining: 'Rubber + Ceramic Composite', recommendedCoating: 'Rubber Backed Ceramic' };
    if (corrosionRisk === 'Very High') return { recommendedLining: 'HDPE/UHMWPE Lining', recommendedCoating: 'N/A - Self Protecting' };
    if (abrasionRisk === 'High') return { recommendedLining: 'Ceramic Tile Lining', recommendedCoating: 'None' };
    if (abrasionRisk === 'Medium') return { recommendedLining: 'Rubber Lining (Hard)', recommendedCoating: 'Epoxy Coating' };
    return { recommendedLining: 'Standard Steel', recommendedCoating: 'Epoxy Paint' };
  };

  // Handle mine selection
  const handleMineSelect = async (mineId: number | null) => {
    setSelectedMineId(mineId);

    if (!mineId) {
      return;
    }

    setMineDataLoading(true);
    try {
      // Fetch mine with environmental data (includes slurry profile and lining recommendation)
      const mineData = await minesApi.getMineWithEnvironmentalData(mineId);
      const { mine, slurryProfile, liningRecommendation } = mineData;

      // Auto-fill location fields
      if (mine.latitude && mine.longitude) {
        onUpdate('latitude', mine.latitude);
        onUpdate('longitude', mine.longitude);
      }
      if (mine.physicalAddress) {
        onUpdate('siteAddress', mine.physicalAddress);
      }
      if (mine.province) {
        onUpdate('region', mine.province);
      }
      onUpdate('country', 'South Africa');

      // Mark location fields as auto-filled
      setLocationAutoFilled({
        latitude: !!mine.latitude,
        longitude: !!mine.longitude,
        siteAddress: !!mine.physicalAddress,
        region: !!mine.province,
        country: true,
      });

      // Auto-fill environmental intelligence from slurry profile
      if (slurryProfile && onUpdateGlobalSpecs) {
        const updatedSpecs = {
          ...globalSpecs,
          // Slurry characteristics from commodity profile
          mineSelected: mine.mineName,
          mineCommodity: slurryProfile.commodityName,
          slurryPHMin: slurryProfile.phMin,
          slurryPHMax: slurryProfile.phMax,
          slurrySGMin: slurryProfile.typicalSgMin,
          slurrySGMax: slurryProfile.typicalSgMax,
          slurrySolidsMin: slurryProfile.solidsConcentrationMin,
          slurrySolidsMax: slurryProfile.solidsConcentrationMax,
          slurryTempMin: slurryProfile.tempMin,
          slurryTempMax: slurryProfile.tempMax,
          abrasionRisk: slurryProfile.abrasionRisk,
          corrosionRisk: slurryProfile.corrosionRisk,
          primaryFailureMode: slurryProfile.primaryFailureMode,
        };

        // Add lining recommendation if available
        if (liningRecommendation) {
          updatedSpecs.recommendedLining = liningRecommendation.recommendedLining;
          updatedSpecs.recommendedCoating = liningRecommendation.recommendedCoating;
          updatedSpecs.liningApplicationNotes = liningRecommendation.applicationNotes;
        }

        // Also fetch environmental/weather data based on mine location
        if (mine.latitude && mine.longitude) {
          try {
            console.log('[Mine Selection] Fetching environmental data for:', mine.mineName);
            const environmentalData = await fetchEnvironmentalData(
              mine.latitude,
              mine.longitude,
              mine.province,
              'South Africa'
            );
            console.log('[Mine Selection] Environmental data received:', environmentalData);

            // Merge environmental data with slurry profile data
            Object.assign(updatedSpecs, environmentalData);
          } catch (error) {
            // Silently handle - user can still fill in manually
            if (error instanceof Error && error.message !== 'Backend unavailable') {
              console.error('[Mine Selection] Failed to fetch environmental data:', error);
            }
          }
        }

        onUpdateGlobalSpecs(updatedSpecs);
      } else if (mine.latitude && mine.longitude && onUpdateGlobalSpecs) {
        // Even without slurry profile, fetch environmental data if we have coordinates
        try {
          console.log('[Mine Selection] Fetching environmental data (no slurry profile):', mine.mineName);
          const environmentalData = await fetchEnvironmentalData(
            mine.latitude,
            mine.longitude,
            mine.province,
            'South Africa'
          );
          console.log('[Mine Selection] Environmental data received:', environmentalData);
          onUpdateGlobalSpecs({
            ...globalSpecs,
            mineSelected: mine.mineName,
            ...environmentalData,
          });
        } catch (error) {
          // Silently handle - user can still fill in manually
          if (error instanceof Error && error.message !== 'Backend unavailable') {
            console.error('[Mine Selection] Failed to fetch environmental data:', error);
          }
        }
      }

      console.log('[Mine Selection] Auto-filled from mine:', mine.mineName);
    } catch (error) {
      // When backend is unavailable, use fallback mine data from local list
      const fallbackMine = fallbackMines.find(m => m.id === mineId);
      if (fallbackMine) {
        console.log('[Mine Selection] Using fallback data for:', fallbackMine.mineName);

        // Auto-fill location fields from fallback data
        if (fallbackMine.latitude && fallbackMine.longitude) {
          onUpdate('latitude', fallbackMine.latitude);
          onUpdate('longitude', fallbackMine.longitude);
        }
        if (fallbackMine.physicalAddress) {
          onUpdate('siteAddress', fallbackMine.physicalAddress);
        }
        if (fallbackMine.province) {
          onUpdate('region', fallbackMine.province);
        }
        onUpdate('country', 'South Africa');

        // Mark location fields as auto-filled
        setLocationAutoFilled({
          latitude: !!fallbackMine.latitude,
          longitude: !!fallbackMine.longitude,
          siteAddress: !!fallbackMine.physicalAddress,
          region: !!fallbackMine.province,
          country: true,
        });

        // Auto-fill environmental intelligence from fallback data
        if (onUpdateGlobalSpecs) {
          const slurryProfile = fallbackMine.commodityName ? fallbackSlurryProfiles[fallbackMine.commodityName] : null;
          const envData = getFallbackEnvironmentalData(fallbackMine.province);
          const liningRec = slurryProfile ? getFallbackLiningRecommendation(slurryProfile.abrasionRisk, slurryProfile.corrosionRisk) : null;

          const updatedSpecs: any = {
            ...globalSpecs,
            mineSelected: fallbackMine.mineName,
            mineCommodity: fallbackMine.commodityName,
            // Environmental Intelligence fields from province data
            tempMin: envData.tempMin,
            tempMax: envData.tempMax,
            tempMean: envData.tempMean,
            humidityMin: envData.humidityMin,
            humidityMax: envData.humidityMax,
            humidityMean: envData.humidityMean,
            annualRainfall: envData.annualRainfall,
            ecpMarineInfluence: envData.ecpMarineInfluence,
            ecpIso12944Category: envData.ecpIso12944Category,
            ecpIndustrialPollution: envData.ecpIndustrialPollution,
            soilType: envData.soilType,
            soilTexture: envData.soilTexture,
            soilMoisture: envData.soilMoisture,
            soilMoistureClass: envData.soilMoistureClass,
            soilDrainage: envData.soilDrainage,
            distanceToCoastFormatted: envData.distanceToCoastFormatted,
            detailedMarineInfluence: envData.detailedMarineInfluence,
            // Additional environmental fields
            floodRisk: envData.floodRisk,
            uvExposure: envData.uvExposure,
            windSpeed: envData.windSpeed,
            airSaltContent: envData.airSaltContent,
            timeOfWetness: envData.timeOfWetness,
          };

          // Add slurry profile data if available
          if (slurryProfile) {
            updatedSpecs.slurryPHMin = slurryProfile.phMin;
            updatedSpecs.slurryPHMax = slurryProfile.phMax;
            updatedSpecs.slurrySGMin = slurryProfile.typicalSgMin;
            updatedSpecs.slurrySGMax = slurryProfile.typicalSgMax;
            updatedSpecs.slurrySolidsMin = slurryProfile.solidsConcentrationMin;
            updatedSpecs.slurrySolidsMax = slurryProfile.solidsConcentrationMax;
            updatedSpecs.slurryTempMin = slurryProfile.tempMin;
            updatedSpecs.slurryTempMax = slurryProfile.tempMax;
            updatedSpecs.abrasionRisk = slurryProfile.abrasionRisk;
            updatedSpecs.corrosionRisk = slurryProfile.corrosionRisk;
            updatedSpecs.primaryFailureMode = slurryProfile.primaryFailureMode;
          }

          // Add lining recommendation if available
          if (liningRec) {
            updatedSpecs.recommendedLining = liningRec.recommendedLining;
            updatedSpecs.recommendedCoating = liningRec.recommendedCoating;
          }

          onUpdateGlobalSpecs(updatedSpecs);

          // Mark environmental fields as auto-filled for green styling
          markFieldsAsAutoFilled([
            'tempMin',
            'tempMax',
            'tempMean',
            'humidityMin',
            'humidityMax',
            'humidityMean',
            'annualRainfall',
            'ecpMarineInfluence',
            'ecpIso12944Category',
            'ecpIndustrialPollution',
            'soilType',
            'soilTexture',
            'soilMoisture',
            'soilMoistureClass',
            'soilDrainage',
            'distanceToCoast',
            'distanceToCoastFormatted',
            'detailedMarineInfluence',
            'uvExposure',
            'windSpeed',
            'floodRisk',
            'airSaltContent',
            'timeOfWetness',
          ]);

          console.log('[Mine Selection] Auto-filled with fallback data for:', fallbackMine.mineName);
        }
      } else if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error('Failed to fetch mine environmental data:', error);
      }
    } finally {
      setMineDataLoading(false);
    }
  };

  // Handle new mine created from modal
  const handleMineCreated = (newMine: SaMine) => {
    // Add the new mine to the list
    setMines(prevMines => [...prevMines, newMine].sort((a, b) => a.mineName.localeCompare(b.mineName)));
    // Select the newly created mine
    handleMineSelect(newMine.id);
    // Close the modal
    setShowAddMineModal(false);
  };

  // Handle mine dropdown change
  const handleMineDropdownChange = (value: string) => {
    if (value === 'add-new') {
      setShowAddMineModal(true);
    } else {
      handleMineSelect(value ? Number(value) : null);
    }
  };

  // Auto-generate RFQ number if field is empty
  useEffect(() => {
    if (!rfqData.projectName || rfqData.projectName.trim() === '') {
      const autoGenNumber = generateSystemReferenceNumber();
      onUpdate('projectName', autoGenNumber);
    }
  }, []);

  const addNote = (note: string) => {
    if (note && !additionalNotes.includes(note)) {
      const newNotes = [...additionalNotes, note];
      setAdditionalNotes(newNotes);
      const currentNotes = rfqData.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes}\n• ${note}` : `• ${note}`;
      onUpdate('notes', updatedNotes);
    }
  };

  const removeNote = (noteToRemove: string) => {
    const newNotes = additionalNotes.filter(note => note !== noteToRemove);
    setAdditionalNotes(newNotes);
    const updatedNotes = newNotes.length > 0 ? newNotes.map(note => `• ${note}`).join('\n') : '';
    onUpdate('notes', updatedNotes);
  };

  // Validation helper functions
  const hasRequiredLocationData = () => {
    return !!(
      rfqData.latitude &&
      rfqData.longitude &&
      rfqData.siteAddress &&
      rfqData.region &&
      rfqData.country
    );
  };

  const hasRequiredEnvironmentalData = () => {
    // Soil Conditions - visible fields required
    const hasSoilData = !!(
      (globalSpecs?.soilTexture || rfqData.soilTexture) &&
      (globalSpecs?.soilMoistureClass || rfqData.soilMoistureClass) &&
      (globalSpecs?.soilDrainage || rfqData.soilDrainage)
    );

    // Atmospheric Conditions - only visible fields required
    const hasAtmosphericData = !!(
      (globalSpecs?.tempMin !== undefined || rfqData.tempMin !== undefined) &&
      (globalSpecs?.tempMax !== undefined || rfqData.tempMax !== undefined) &&
      (globalSpecs?.humidityMean !== undefined) &&
      (globalSpecs?.annualRainfall || rfqData.rainfall)
    );

    // Marine & Special Conditions - visible dropdown fields required
    const hasMarineData = !!(
      (globalSpecs?.detailedMarineInfluence || rfqData.marineInfluence) &&
      (globalSpecs?.floodRisk || rfqData.floodingRisk) &&
      (globalSpecs?.ecpIndustrialPollution || rfqData.industrialPollution)
    );

    return hasSoilData && hasAtmosphericData && hasMarineData;
  };

  // Handlers for confirmation/edit
  const handleConfirmLocation = () => {
    if (hasRequiredLocationData()) {
      setLocationConfirmed(true);
      setIsEditingLocation(false);
    }
  };

  const handleConfirmEnvironmental = () => {
    if (hasRequiredEnvironmentalData()) {
      setEnvironmentalConfirmed(true);
      setIsEditingEnvironmental(false);
    }
  };

  const handleEditLocation = () => {
    setIsEditingLocation(true);
  };

  const handleEditEnvironmental = () => {
    setIsEditingEnvironmental(true);
  };

  // Customer auth for auto-filling customer fields
  const { isAuthenticated, customer, profile } = useCustomerAuth();

  // Track which customer fields were auto-filled
  const [customerAutoFilled, setCustomerAutoFilled] = useState<{
    customerName: boolean;
    customerEmail: boolean;
    customerPhone: boolean;
  }>({
    customerName: false,
    customerEmail: false,
    customerPhone: false,
  });

  // Auto-fill customer fields when logged in
  useEffect(() => {
    if (isAuthenticated && profile) {
      const updates: { customerName?: boolean; customerEmail?: boolean; customerPhone?: boolean } = {};

      // Auto-fill customer name if empty
      if (!rfqData.customerName && (profile.firstName || profile.lastName)) {
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
        onUpdate('customerName', fullName);
        updates.customerName = true;
      }

      // Auto-fill customer email if empty
      if (!rfqData.customerEmail && profile.email) {
        onUpdate('customerEmail', profile.email);
        updates.customerEmail = true;
      }

      // Auto-fill customer phone if empty (try mobilePhone, directPhone, or company primaryPhone)
      const phoneNumber = profile.mobilePhone || profile.directPhone || profile.company?.primaryPhone;
      if (!rfqData.customerPhone && phoneNumber) {
        onUpdate('customerPhone', phoneNumber);
        updates.customerPhone = true;
      }

      if (Object.keys(updates).length > 0) {
        setCustomerAutoFilled(prev => ({ ...prev, ...updates }));
      }
    }
  }, [isAuthenticated, profile, rfqData.customerName, rfqData.customerEmail, rfqData.customerPhone, onUpdate]);

  // Derived state for locked sections
  const isLocationLocked = locationConfirmed && !isEditingLocation;
  const isEnvironmentalLocked = environmentalConfirmed && !isEditingEnvironmental;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Project/RFQ Details</h2>

      <div className="space-y-2">
        {/* Customer Information - Required fields */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Customer Information
            {isAuthenticated && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Logged in
              </span>
            )}
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div data-field="customerName">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerName}
                onChange={(val) => onUpdate('customerName', val)}
                onOverride={() => setCustomerAutoFilled(prev => ({ ...prev, customerName: false }))}
                isAutoFilled={customerAutoFilled.customerName}
                placeholder="Customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>

            <div data-field="customerEmail">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Email <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerEmail}
                onChange={(val) => onUpdate('customerEmail', val)}
                onOverride={() => setCustomerAutoFilled(prev => ({ ...prev, customerEmail: false }))}
                isAutoFilled={customerAutoFilled.customerEmail}
                placeholder="email@company.com"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-xs text-red-600">{errors.customerEmail}</p>
              )}
            </div>

            <div data-field="customerPhone">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Phone <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerPhone}
                onChange={(val) => onUpdate('customerPhone', val)}
                onOverride={() => setCustomerAutoFilled(prev => ({ ...prev, customerPhone: false }))}
                isAutoFilled={customerAutoFilled.customerPhone}
                placeholder="+27 11 555 0123"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-xs text-red-600">{errors.customerPhone}</p>
              )}
            </div>

            <div data-field="requiredDate">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Required Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={rfqData.requiredDate}
                onChange={(e) => onUpdate('requiredDate', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                required
              />
              {errors.requiredDate && (
                <p className="mt-1 text-xs text-red-600">{errors.requiredDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Project Name and Description - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div data-field="projectName">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Project/RFQ Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={rfqData.projectName}
              onChange={(e) => onUpdate('projectName', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Enter name (auto-generated if empty)"
            />
            {errors.projectName && (
              <p className="mt-1 text-xs text-red-600">{errors.projectName}</p>
            )}
          </div>
          <div data-field="description">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              RFQ Description <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={rfqData.description}
              onChange={(e) => onUpdate('description', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Brief description of requirements"
            />
          </div>
        </div>

        {/* Project Type Selection - Compact */}
        <div data-field="projectType">
          <label className={`block text-xs font-semibold mb-1 ${hasProjectTypeError ? 'text-red-700' : 'text-gray-900'}`}>
            Project Type <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'standard', label: 'Standard RFQ' },
              { value: 'phase1', label: 'Phase 1 Tender' },
              { value: 'retender', label: 'Re-Tender' },
              { value: 'feasibility', label: 'Feasibility' }
            ].map((type) => (
              <label
                key={type.value}
                className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  rfqData.projectType === type.value
                    ? 'border-blue-600 bg-blue-50'
                    : hasProjectTypeError
                      ? 'border-red-400 hover:border-red-500'
                      : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="projectType"
                  value={type.value}
                  checked={rfqData.projectType === type.value}
                  onChange={(e) => onUpdate('projectType', e.target.value)}
                  className="sr-only"
                />
                <div className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${
                  rfqData.projectType === type.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}>
                  {rfqData.projectType === type.value && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <span className="font-medium text-gray-900">{type.label}</span>
              </label>
            ))}
          </div>
          {errors.projectType && <p className="mt-1 text-xs text-red-600">{errors.projectType}</p>}
        </div>

        {/* Required Products/Services Selection - Compact */}
        <div data-field="requiredProducts">
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Required Products & Services <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'fabricated_steel', label: 'Steel Pipes', icon: '🔩' },
              { value: 'fasteners_gaskets', label: 'Nuts, Bolts, Washers & Gaskets', icon: '⚙️' },
              { value: 'surface_protection', label: 'Surface Protection', icon: '🛡️' },
              { value: 'hdpe', label: 'HDPE Pipes', icon: '🔵' },
              { value: 'pvc', label: 'PVC Pipes', icon: '⚪' },
              { value: 'structural_steel', label: 'Structural Steel', icon: '🏗️' },
              { value: 'transport_install', label: 'Transport/Install', icon: '🚚' },
            ].map((product) => {
              const isSelected = rfqData.requiredProducts?.includes(product.value);
              return (
                <label
                  key={product.value}
                  className={`flex items-center gap-2 px-2 py-2 border-2 rounded-lg cursor-pointer transition-all text-xs ${
                    isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const currentProducts = rfqData.requiredProducts || [];
                      if (e.target.checked) {
                        onUpdate('requiredProducts', [...currentProducts, product.value]);
                      } else {
                        onUpdate('requiredProducts', currentProducts.filter((p: string) => p !== product.value));
                      }
                    }}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <span>{product.icon}</span>
                  <span className="font-medium text-gray-900">{product.label}</span>
                </label>
              );
            })}
          </div>
          {errors.requiredProducts && <p className="mt-1 text-xs text-red-600">{errors.requiredProducts}</p>}
        </div>

        {/* Additional Notes - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Quick Notes
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addNote(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
            >
              <option value="">Add common note...</option>
              {commonNotes.map((note, index) => (
                <option key={index} value={note} disabled={additionalNotes.includes(note)}>
                  {note}
                </option>
              ))}
            </select>
            {additionalNotes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {additionalNotes.map((note, index) => (
                  <span key={index} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                    {note.substring(0, 20)}...
                    <button type="button" onClick={() => removeNote(note)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Custom Notes
            </label>
            <textarea
              value={rfqData.notes}
              onChange={(e) => onUpdate('notes', e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Additional requirements..."
            />
          </div>
        </div>

        {/* Project Location - Compact */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Project Location
            </h4>
            <div className="relative">
              <div className="flex items-center shadow-sm rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  disabled={isLocationLocked}
                  className={`flex items-center gap-1 px-3 py-1.5 text-white transition-colors text-xs font-medium ${
                    isLocationLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Pick on Map
                </button>
                <div className={`w-px h-5 ${isLocationLocked ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                <button
                  type="button"
                  onClick={() => setShowViewDropdown(!showViewDropdown)}
                  disabled={isLocationLocked}
                  className={`px-1.5 py-1.5 text-white transition-colors ${
                    isLocationLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {showViewDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowViewDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMapViewConfig('default');
                        setShowViewDropdown(false);
                        setShowMapPicker(true);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        mapViewConfig === 'default'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapViewConfig('responsive');
                        setShowViewDropdown(false);
                        setShowMapPicker(true);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        mapViewConfig === 'responsive'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapViewConfig('compact');
                        setShowViewDropdown(false);
                        setShowMapPicker(true);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        mapViewConfig === 'compact'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Compact
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SA Mines Dropdown - Compact */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Quick Select: SA Mine (auto-fills location & slurry)
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedMineId || ''}
                onChange={(e) => handleMineDropdownChange(e.target.value)}
                disabled={isLoadingMines || mineDataLoading || isLocationLocked}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 text-sm appearance-none bg-gradient-to-r from-amber-50 to-orange-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select a mine (optional) --</option>
                <option value="add-new" className="text-amber-600 font-medium">+ Add a mine not listed</option>
                {mines.map((mine) => (
                  <option key={mine.id} value={mine.id}>
                    {mine.mineName} - {mine.operatingCompany} ({mine.commodityName || 'Unknown'}) - {mine.province}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {(isLoadingMines || mineDataLoading) ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600"></div>
                ) : (
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
            {selectedMineId && (
              <div className="mt-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Location & slurry auto-filled
                <p className="text-xs text-amber-700 mt-1 ml-6">
                  Environmental intelligence will be populated based on commodity type
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Latitude
              </label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.latitude}
                onChange={(val) => onUpdate('latitude', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, latitude: false }))}
                isAutoFilled={locationAutoFilled.latitude}
                placeholder="-26.20227 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
              {!locationAutoFilled.latitude && (
                <p className="mt-1 text-xs text-gray-500">
                  Precision required for environmental analysis
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Longitude
              </label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.longitude}
                onChange={(val) => onUpdate('longitude', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, longitude: false }))}
                isAutoFilled={locationAutoFilled.longitude}
                placeholder="28.04363 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Site Address / Location Description
            </label>
            <AutoFilledInput
              type="text"
              value={rfqData.siteAddress}
              onChange={(val) => onUpdate('siteAddress', val)}
              onOverride={() => setLocationAutoFilled(prev => ({ ...prev, siteAddress: false }))}
              isAutoFilled={locationAutoFilled.siteAddress}
              placeholder="e.g., Secunda Refinery, Mpumalanga, South Africa"
              readOnly={isLocationLocked}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Region / Province
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.region}
                onChange={(val) => onUpdate('region', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, region: false }))}
                isAutoFilled={locationAutoFilled.region}
                placeholder="e.g., Gauteng, Western Cape"
                readOnly={isLocationLocked}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Country
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.country}
                onChange={(val) => onUpdate('country', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, country: false }))}
                isAutoFilled={locationAutoFilled.country}
                placeholder="e.g., South Africa"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          {/* Location Confirmation Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            {!locationConfirmed ? (
              <button
                type="button"
                onClick={handleConfirmLocation}
                disabled={!hasRequiredLocationData()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Location Data
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Location Confirmed
                </div>
                {!isEditingLocation ? (
                  <button
                    type="button"
                    onClick={handleEditLocation}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmLocation}
                    disabled={!hasRequiredLocationData()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
                  >
                    Re-confirm Changes
                  </button>
                )}
              </div>
            )}
            {!hasRequiredLocationData() && !locationConfirmed && (
              <p className="mt-2 text-sm text-amber-600">
                Please fill in all location fields to confirm this section.
              </p>
            )}
          </div>

          {showMapPicker && (
            <GoogleMapLocationPicker
              apiKey={GOOGLE_MAPS_API_KEY}
              config={mapViewConfig}
              initialLocation={
                rfqData.latitude && rfqData.longitude
                  ? { lat: rfqData.latitude, lng: rfqData.longitude }
                  : undefined
              }
              onLocationSelect={handleLocationSelect}
              onClose={() => setShowMapPicker(false)}
            />
          )}

          {/* Environmental Intelligence Loading/Status */}
          {isLoadingEnvironmental && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">
                Fetching environmental data for your location...
              </span>
            </div>
          )}


          {!isLoadingEnvironmental && environmentalErrors.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-amber-700">
                  Some environmental data could not be retrieved
                </span>
              </div>
              <ul className="text-xs text-amber-600 ml-7 list-disc list-inside">
                {environmentalErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-1 ml-7">
                Please fill in missing fields manually in the Environmental Intelligence section below.
              </p>
            </div>
          )}
        </div>

        {/* Environmental Intelligence Section - Compact */}
        <div className="mt-4 pt-4 border-t border-gray-300">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-600 rounded">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Environmental Intelligence</h3>
                <p className="text-xs text-gray-600">Pipeline Corrosion & Coating Data</p>
              </div>
            </div>

            {/* Environmental Data - Ultra Compact */}
            <div className="bg-white rounded p-2 border border-gray-200">
              {/* Soil Row - All 4 columns */}
              <div className="grid grid-cols-4 gap-1 mb-1">
                <div className="hidden">
                  <AutoFilledInput type="text" value={globalSpecs?.soilType || rfqData.soilType || ''} onChange={(value) => onUpdate('soilType', value)} onOverride={() => markAsOverridden('soilType')} isAutoFilled={wasAutoFilled('soilType')} placeholder="Soil type" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Soil Texture</label>
                  <AutoFilledSelect value={globalSpecs?.soilTexture || rfqData.soilTexture || ''} onChange={(value) => onUpdate('soilTexture', value)} onOverride={() => markAsOverridden('soilTexture')} isAutoFilled={wasAutoFilled('soilTexture')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Sand">Sand</option>
                    <option value="Loamy Sand">Loamy Sand</option>
                    <option value="Sandy Loam">Sandy Loam</option>
                    <option value="Loam">Loam</option>
                    <option value="Silt Loam">Silt Loam</option>
                    <option value="Silt">Silt</option>
                    <option value="Sandy Clay Loam">Sandy Clay Loam</option>
                    <option value="Clay Loam">Clay Loam</option>
                    <option value="Silty Clay Loam">Silty Clay Loam</option>
                    <option value="Sandy Clay">Sandy Clay</option>
                    <option value="Silty Clay">Silty Clay</option>
                    <option value="Clay">Clay</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Moisture</label>
                  <AutoFilledSelect value={globalSpecs?.soilMoistureClass || rfqData.soilMoistureClass || ''} onChange={(value) => onUpdate('soilMoistureClass', value)} onOverride={() => markAsOverridden('soilMoistureClass')} isAutoFilled={wasAutoFilled('soilMoistureClass')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Drainage</label>
                  <AutoFilledSelect value={globalSpecs?.soilDrainage || rfqData.soilDrainage || ''} onChange={(value) => onUpdate('soilDrainage', value)} onOverride={() => markAsOverridden('soilDrainage')} isAutoFilled={wasAutoFilled('soilDrainage')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Poor">Poor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Well">Well</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Rainfall</label>
                  <AutoFilledSelect value={globalSpecs?.annualRainfall || rfqData.rainfall || ''} onChange={(value) => onUpdate('rainfall', value)} onOverride={() => markAsOverridden('annualRainfall')} isAutoFilled={wasAutoFilled('annualRainfall')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="<250">&lt;250mm</option>
                    <option value="250-500">250-500mm</option>
                    <option value="500-1000">500-1000mm</option>
                    <option value="1000-2000">1000-2000mm</option>
                    <option value=">2000">&gt;2000mm</option>
                  </AutoFilledSelect>
                </div>
              </div>

              {/* Atmospheric Row - Temperature */}
              <div className="grid grid-cols-5 gap-1 mb-1">
                <div>
                  <label className="block text-xs text-gray-600">Temp Min °C</label>
                  <AutoFilledInput type="number" step="0.1" value={globalSpecs?.tempMin ?? rfqData.tempMin ?? ''} onChange={(value) => onUpdate('tempMin', value)} onOverride={() => markAsOverridden('tempMin')} isAutoFilled={wasAutoFilled('tempMin')} placeholder="-5" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Temp Mean</label>
                  <AutoFilledInput type="number" step="0.1" value={globalSpecs?.tempMean ?? rfqData.tempMean ?? ''} onChange={(value) => onUpdate('tempMean', value)} onOverride={() => markAsOverridden('tempMean')} isAutoFilled={wasAutoFilled('tempMean')} placeholder="18" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Temp Max</label>
                  <AutoFilledInput type="number" step="0.1" value={globalSpecs?.tempMax ?? rfqData.tempMax ?? ''} onChange={(value) => onUpdate('tempMax', value)} onOverride={() => markAsOverridden('tempMax')} isAutoFilled={wasAutoFilled('tempMax')} placeholder="38" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Humidity %</label>
                  <AutoFilledInput type="number" value={globalSpecs?.humidityMean ?? ''} onChange={(value) => onUpdateGlobalSpecs({ ...globalSpecs, humidityMean: value })} onOverride={() => markAsOverridden('humidityMean')} isAutoFilled={wasAutoFilled('humidityMean')} placeholder="65" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">UV Level</label>
                  <AutoFilledSelect value={globalSpecs?.uvExposure || ''} onChange={(value) => onUpdateGlobalSpecs({ ...globalSpecs, uvExposure: value })} onOverride={() => markAsOverridden('uvExposure')} isAutoFilled={wasAutoFilled('uvExposure')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </AutoFilledSelect>
                </div>
              </div>

              {/* Marine & Special Conditions - Compact Row 1 */}
              <div className="grid grid-cols-3 gap-1 mb-1">
                <div>
                  <label className="block text-xs text-gray-600">Coast Distance</label>
                  <AutoFilledDisplay value={globalSpecs?.distanceToCoastFormatted} isAutoFilled={wasAutoFilled('distanceToCoast')} label="Auto" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Marine Influence</label>
                  <AutoFilledSelect value={globalSpecs?.detailedMarineInfluence || rfqData.marineInfluence || ''} onChange={(value) => onUpdate('marineInfluence', value)} onOverride={() => markAsOverridden('detailedMarineInfluence')} isAutoFilled={wasAutoFilled('detailedMarineInfluence')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Extreme Marine">Extreme (≤0.5km)</option>
                    <option value="Severe Marine">Severe (0.5-1km)</option>
                    <option value="High Marine">High (1-5km)</option>
                    <option value="Moderate Marine">Moderate (5-20km)</option>
                    <option value="Low / Non-Marine">Low (&gt;20km)</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Air Salt Content</label>
                  <AutoFilledDisplay value={globalSpecs?.airSaltContent ? `${globalSpecs.airSaltContent.level} (${globalSpecs.airSaltContent.isoCategory})` : undefined} isAutoFilled={wasAutoFilled('airSaltContent')} label="Auto" />
                </div>
              </div>
              {/* Marine & Special Conditions - Compact Row 2 */}
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <label className="block text-xs text-gray-600">Flood Risk</label>
                  <AutoFilledSelect value={globalSpecs?.floodRisk || rfqData.floodingRisk || ''} onChange={(value) => onUpdate('floodingRisk', value)} onOverride={() => markAsOverridden('floodRisk')} isAutoFilled={wasAutoFilled('floodRisk')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Industrial Pollution</label>
                  <AutoFilledSelect value={globalSpecs?.ecpIndustrialPollution || rfqData.industrialPollution || ''} onChange={(value) => onUpdate('industrialPollution', value)} onOverride={() => markAsOverridden('ecpIndustrialPollution')} isAutoFilled={wasAutoFilled('ecpIndustrialPollution')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Time of Wetness</label>
                  <AutoFilledDisplay value={globalSpecs?.timeOfWetness ? `${globalSpecs.timeOfWetness.level} (${globalSpecs.timeOfWetness.isoCategory})` : undefined} isAutoFilled={wasAutoFilled('timeOfWetness')} label="Auto" />
                </div>
              </div>
            </div>

            {/* HIDDEN: Corrosion Severity Classification - Hidden per user request, may be used in this area or another area in future */}
            <div className="hidden bg-white rounded-lg p-5 mb-4 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Corrosion Severity Classification
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Soil Corrosivity (AMPP SP0169)
                  </label>
                  <select
                    value={rfqData.soilCorrosivity || ''}
                    onChange={(e) => onUpdate('soilCorrosivity', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select soil corrosivity...</option>
                    <option value="Unknown">Unknown / Not Tested</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderately Corrosive</option>
                    <option value="Severe">Severely Corrosive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    ISO 12944 Corrosivity Category
                  </label>
                  <select
                    value={rfqData.iso12944Category || ''}
                    onChange={(e) => onUpdate('iso12944Category', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select ISO 12944 category...</option>
                    <option value="Unknown">Unknown / To Be// Determined</option>
                    <option value="C1">C1 - Very Low</option>
                    <option value="C2">C2 - Low</option>
                    <option value="C3">C3 - Medium</option>
                    <option value="C4">C4 - High</option>
                    <option value="C5-I">C5-I - Very High (Industrial)</option>
                    <option value="C5-M">C5-M - Very High (Marine)</option>
                    <option value="CX">CX - Extreme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Overall Environment Severity
                </label>
                <select
                  value={rfqData.environmentSeverity || ''}
                  onChange={(e) => onUpdate('environmentSeverity', e.target.value || undefined)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Select overall severity...</option>
                  <option value="Unknown">Unknown / To Be Assessed</option>
                  <option value="Low">Low - Benign conditions</option>
                  <option value="Moderate">Moderate - Standard protection required</option>
                  <option value="High">High - Enhanced protection required</option>
                  <option value="Severe">Severe - Maximum protection required</option>
                </select>
              </div>
            </div>

            {/* HIDDEN: Coating System Recommendations (ISO 21809) - Hidden for now, will be shown on a different page */}
            <div className="hidden bg-white rounded-lg p-5 mb-4 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Coating System Recommendations (ISO 21809)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Suitable External Coating Families
                  </label>
                  <select
                    value={rfqData.recommendedCoatingFamily || ''}
                    onChange={(e) => onUpdate('recommendedCoatingFamily', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select recommended coating...</option>
                    <option value="FBE">FBE (Fusion Bonded Epoxy)</option>
                    <option value="2LPE">2LPE (2-Layer Polyethylene)</option>
                    <option value="3LPE">3LPE (3-Layer Polyethylene)</option>
                    <option value="3LPP">3LPP (3-Layer Polypropylene)</option>
                    <option value="PU">Polyurethane Coating</option>
                    <option value="Coal Tar Enamel">Coal Tar Enamel</option>
                    <option value="Concrete Weight">Concrete Weight Coating</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Minimum Coating Thickness
                  </label>
                  <select
                    value={rfqData.minCoatingThickness || ''}
                    onChange={(e) => onUpdate('minCoatingThickness', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select minimum thickness...</option>
                    <option value="≥0.3mm">≥0.3mm (FBE Standard)</option>
                    <option value="≥0.5mm">≥0.5mm (FBE Enhanced)</option>
                    <option value="≥1.8mm">≥1.8mm (2LPE)</option>
                    <option value="≥2.5mm">≥2.5mm (3LPE Standard)</option>
                    <option value="≥3.0mm">≥3.0mm (3LPE/3LPP Enhanced)</option>
                    <option value="≥3.5mm">≥3.5mm (3LPP High Performance)</option>
                    <option value="≥5.0mm">≥5.0mm (Severe conditions)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Surface Preparation Standard
                  </label>
                  <select
                    value={rfqData.surfacePrep || ''}
                    onChange={(e) => onUpdate('surfacePrep', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select surface prep...</option>
                    <option value="SSPC-SP6">SSPC-SP6 / Sa 2 (Commercial Blast)</option>
                    <option value="SSPC-SP10">SSPC-SP10 / Sa 2½ (Near-White Blast)</option>
                    <option value="SSPC-SP5">SSPC-SP5 / Sa 3 (White Metal Blast)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cathodic Protection Compatibility
                  </label>
                  <select
                    value={rfqData.cpCompatibility || ''}
                    onChange={(e) => onUpdate('cpCompatibility', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select CP requirement...</option>
                    <option value="Required">CP Required - Coating must be compatible</option>
                    <option value="Recommended">CP Recommended</option>
                    <option value="Not Required">CP Not Required</option>
                    <option value="TBD">To Be// Determined</option>
                  </select>
                </div>
              </div>

              {/* Additional Protection Flags */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Additional Protection Requirements
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresConcreteCoating || false}
                      onChange={(e) => onUpdate('requiresConcreteCoating', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Concrete Coating</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresRockShield || false}
                      onChange={(e) => onUpdate('requiresRockShield', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Rock Shield</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresHolidayDetection || false}
                      onChange={(e) => onUpdate('requiresHolidayDetection', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Holiday Detection</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresFieldJointCoating || false}
                      onChange={(e) => onUpdate('requiresFieldJointCoating', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Field Joint Coating</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Engineering Disclaimer */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h5 className="text-sm font-bold text-amber-800 mb-1">Engineering Disclaimer & Traceability</h5>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Environmental and coating recommendations are <strong>indicative</strong> and based on generalized datasets
                    and standards interpretations (ISO 12944, ISO 21809, AMPP SP0169, ISO 9223). Final coating selection
                    <strong> must be validated</strong> by project-specific soil investigations, climate data, and applicable
                    governing codes. These outputs do not replace detailed corrosion engineering studies.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">ISO 12944</span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">ISO 21809</span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">AMPP SP0169</span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">ISO 9223</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental Confirmation Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              {!environmentalConfirmed ? (
                <button
                  type="button"
                  onClick={handleConfirmEnvironmental}
                  disabled={!hasRequiredEnvironmentalData()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Environmental Data
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Environmental Data Confirmed
                  </div>
                  {!isEditingEnvironmental ? (
                    <button
                      type="button"
                      onClick={handleEditEnvironmental}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmEnvironmental}
                      disabled={!hasRequiredEnvironmentalData()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
                    >
                      Re-confirm Changes
                    </button>
                  )}
                </div>
              )}
              {!hasRequiredEnvironmentalData() && !environmentalConfirmed && (
                <p className="mt-2 text-sm text-amber-600">
                  Please fill in all required environmental fields to confirm this section.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Supporting Documents Section - At Bottom - Compact */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-600 rounded">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Supporting Documents</h3>
              <p className="text-xs text-gray-600">Specifications, drawings, or requirements</p>
            </div>
          </div>

          {!documentsConfirmed ? (
            <>
              <RfqDocumentUpload
                documents={pendingDocuments || []}
                onAddDocument={onAddDocument}
                onRemoveDocument={onRemoveDocument}
                maxDocuments={10}
                maxFileSizeMB={50}
              />

              <div className="mt-3 pt-2 border-t border-purple-200">
                <button
                  type="button"
                  onClick={() => {
                    if (!pendingDocuments || pendingDocuments.length === 0) {
                      setShowNoDocumentsPopup(true);
                    } else {
                      setDocumentsConfirmed(true);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Documents
                </button>
              </div>
            </>
          ) : (
            <div className="bg-green-50 border border-green-400 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Confirmed ({pendingDocuments?.length || 0} file{(pendingDocuments?.length || 0) !== 1 ? 's' : ''})
                </div>
                <button
                  type="button"
                  onClick={() => setDocumentsConfirmed(false)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                >
                  Edit
                </button>
              </div>
              {pendingDocuments && pendingDocuments.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {pendingDocuments.map((doc: any, idx: number) => (
                    <span key={idx} className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {(doc.name || doc.file?.name)?.substring(0, 20)}...
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* No Documents Confirmation Popup */}
      {showNoDocumentsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Documents Uploaded</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You haven't uploaded any supporting documents. Documents such as specifications, drawings, or requirements help suppliers provide accurate quotes.
            </p>
            <p className="text-gray-700 font-medium mb-4">
              Would you like to proceed without uploading documents?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNoDocumentsPopup(false);
                  setDocumentsConfirmed(true);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                Proceed Without Documents
              </button>
              <button
                type="button"
                onClick={() => setShowNoDocumentsPopup(false)}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mine Modal */}
      <AddMineModal
        isOpen={showAddMineModal}
        onClose={() => setShowAddMineModal(false)}
        onMineCreated={handleMineCreated}
      />
    </div>
  );
}

// Helper function to derive temperature category from working temperature (°C)
function deriveTemperatureCategory(tempC: number | undefined | null): string | undefined {
  if (tempC === undefined || tempC === null) return undefined;
  if (tempC < -20 || tempC > 60) {
    if (tempC >= 60 && tempC <= 120) return 'Elevated';
    if (tempC > 120 && tempC <= 200) return 'High';
    if (tempC > 200) return 'High'; // Still high for very high temps
    return 'Ambient'; // Cold temps still considered ambient for coating purposes
  }
  return 'Ambient';
}

function SpecificationsStep({ globalSpecs, onUpdateGlobalSpecs, masterData, errors, fetchAndSelectPressureClass, availablePressureClasses, requiredProducts = [], rfqData }: any) {
  // Check which product types are selected
  const showSteelPipes = requiredProducts.includes('fabricated_steel');
  const showFastenersGaskets = requiredProducts.includes('fasteners_gaskets');
  const showHdpePipes = requiredProducts.includes('hdpe');
  const showPvcPipes = requiredProducts.includes('pvc');
  const showStructuralSteel = requiredProducts.includes('structural_steel');
  const showSurfaceProtection = requiredProducts.includes('surface_protection');
  const showTransportInstall = requiredProducts.includes('transport_install');
  const workingPressures = [6, 10, 16, 25, 40, 63, 100, 160, 250, 320, 400, 630]; // Bar values
  const workingTemperatures = [-29, -20, 0, 20, 50, 80, 120, 150, 200, 250, 300, 350, 400, 450, 500]; // Celsius values

  // Material suitability warning modal state
  const [materialWarning, setMaterialWarning] = useState<{
    show: boolean;
    specName: string;
    specId: number | undefined;
    warnings: string[];
    recommendation?: string;
    limits?: MaterialLimits;
  }>({ show: false, specName: '', specId: undefined, warnings: [] });

  const hasErrors = errors && (errors.workingPressure || errors.workingTemperature || errors.steelPipesConfirmation || errors.fastenersConfirmation);

  // Derive temperature category from working temperature if not manually set
  const derivedTempCategory = deriveTemperatureCategory(globalSpecs?.workingTemperatureC);
  const effectiveEcpTemperature = globalSpecs?.ecpTemperature || derivedTempCategory;
  const isEcpTemperatureAutoFilled = !globalSpecs?.ecpTemperature && !!derivedTempCategory;

  // Derive atmospheric fields from Page 1 Environmental Intelligence data
  // Check multiple sources: user override (ecp prefix), rfqData, and globalSpecs (from mine selection)
  const derivedIso12944 = rfqData?.iso12944Category || globalSpecs?.iso12944Category;
  const effectiveIso12944 = globalSpecs?.ecpIso12944Category || derivedIso12944;
  const isIso12944AutoFilled = !globalSpecs?.ecpIso12944Category && !!derivedIso12944;

  const derivedMarineInfluence = rfqData?.marineInfluence || globalSpecs?.detailedMarineInfluence || globalSpecs?.marineInfluence;
  const effectiveMarineInfluence = globalSpecs?.ecpMarineInfluence || derivedMarineInfluence;
  const isMarineInfluenceAutoFilled = !globalSpecs?.ecpMarineInfluence && !!derivedMarineInfluence;

  const derivedIndustrialPollution = rfqData?.industrialPollution || globalSpecs?.industrialPollution;
  const effectiveIndustrialPollution = globalSpecs?.ecpIndustrialPollution || derivedIndustrialPollution;
  const isIndustrialPollutionAutoFilled = !globalSpecs?.ecpIndustrialPollution && !!derivedIndustrialPollution;

  // Derive Installation Conditions from Page 1 data
  // Installation Type: Default to AboveGround for mining applications
  const derivedInstallationType = globalSpecs?.mineSelected ? 'AboveGround' : undefined;
  const effectiveInstallationType = globalSpecs?.ecpInstallationType || derivedInstallationType;
  const isInstallationTypeAutoFilled = !globalSpecs?.ecpInstallationType && !!derivedInstallationType;

  // UV Exposure: Derive from ISO 12944 category or mining environment
  const deriveUvExposure = (): string | undefined => {
    // If mine is selected, mining environments typically have high UV exposure (outdoor operations)
    if (globalSpecs?.mineSelected) {
      // If we have ISO 12944, use it to refine
      const iso = effectiveIso12944;
      if (iso === 'C5' || iso === 'CX') return 'High';
      if (iso === 'C3' || iso === 'C4') return 'Moderate';
      if (iso === 'C1' || iso === 'C2') return 'Moderate';
      return 'High'; // Default for mining is High (outdoor)
    }
    return undefined;
  };
  const derivedUvExposure = deriveUvExposure();
  const effectiveUvExposure = globalSpecs?.ecpUvExposure || derivedUvExposure;
  const isUvExposureAutoFilled = !globalSpecs?.ecpUvExposure && !!derivedUvExposure;

  // Mechanical Risk: Mining environments are typically high mechanical risk
  const derivedMechanicalRisk = globalSpecs?.mineSelected ? 'High' : undefined;
  const effectiveMechanicalRisk = globalSpecs?.ecpMechanicalRisk || derivedMechanicalRisk;
  const isMechanicalRiskAutoFilled = !globalSpecs?.ecpMechanicalRisk && !!derivedMechanicalRisk;

  // Helper for auto-filled field styling
  const autoFilledClass = (isAutoFilled: boolean) =>
    isAutoFilled
      ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
      : 'border border-gray-300 text-gray-900';

  return (
    <div>
      <h2 className="text-md font-bold text-gray-900 mb-1">Specifications</h2>
      <p className="text-gray-600 text-xs mb-2">
        Define working conditions and material specifications.
      </p>

      {/* Validation Error Banner */}
      {hasErrors && (
        <div className="mb-2 bg-red-50 border-l-4 border-red-500 rounded p-2">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-xs font-semibold text-red-800">Action required before proceeding</h3>
              <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                {errors.workingPressure && <li>{errors.workingPressure}</li>}
                {errors.workingTemperature && <li>{errors.workingTemperature}</li>}
                {errors.steelPipesConfirmation && <li>{errors.steelPipesConfirmation}</li>}
                {errors.fastenersConfirmation && <li>{errors.fastenersConfirmation}</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Fabricated Steel Pipes & Fittings Section */}
        {showSteelPipes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
              <span className="text-sm">🔩</span>
              <h3 className="text-sm font-bold text-gray-900">Fabricated Steel Pipes & Fittings</h3>
            </div>

            {/* Confirmed Summary - show when specs are confirmed */}
            {globalSpecs?.steelPipesSpecsConfirmed && (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Steel Pipe Specifications Confirmed</span>
                    <span className="mx-2">•</span>
                    <span>{globalSpecs?.workingPressureBar} bar @ {globalSpecs?.workingTemperatureC}°C</span>
                    {globalSpecs?.steelSpecificationId && masterData?.steelSpecs && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{masterData.steelSpecs.find((s: any) => s.id === globalSpecs.steelSpecificationId)?.steelSpecName || 'Steel Spec'}</span>
                      </>
                    )}
                    {globalSpecs?.flangeStandardId && masterData?.flangeStandards && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{masterData.flangeStandards.find((s: any) => s.id === globalSpecs.flangeStandardId)?.code || 'Flange'}</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      steelPipesSpecsConfirmed: false
                    })}
                    className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Detail Forms - show when not confirmed */}
            {!globalSpecs?.steelPipesSpecsConfirmed && (
            <>
            {/* Working Conditions */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-800 mb-2">
                Working Conditions
                <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
              </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Working Pressure */}
            <div data-field="workingPressure">
              <label className={`block text-xs font-semibold mb-1 ${errors.workingPressure ? 'text-red-700' : 'text-gray-900'}`}>
                Working Pressure (bar) <span className="text-red-600">*</span>
              </label>
              <select
                value={globalSpecs?.workingPressureBar || ''}
                onChange={async (e) => {
                  const newPressure = e.target.value ? Number(e.target.value) : undefined;
                  let recommendedPressureClassId = globalSpecs?.flangePressureClassId;
                  if (newPressure && globalSpecs?.flangeStandardId) {
                    // Get material group from selected steel spec
                    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                    const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
                    recommendedPressureClassId = await fetchAndSelectPressureClass(globalSpecs.flangeStandardId, newPressure, globalSpecs?.workingTemperatureC, materialGroup);
                  }
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    workingPressureBar: newPressure,
                    flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                  });
                }}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
                  errors.workingPressure
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Select pressure...</option>
                {workingPressures.map((pressure) => (
                  <option key={pressure} value={pressure}>{pressure} bar</option>
                ))}
              </select>
              {errors.workingPressure && <p className="mt-0.5 text-xs text-red-600">{errors.workingPressure}</p>}
            </div>

            {/* Working Temperature */}
            <div data-field="workingTemperature">
              <label className={`block text-xs font-semibold mb-1 ${errors.workingTemperature ? 'text-red-700' : 'text-gray-900'}`}>
                Working Temperature (°C) <span className="text-red-600">*</span>
              </label>
              <select
                value={globalSpecs?.workingTemperatureC || ''}
                onChange={async (e) => {
                  const newTemp = e.target.value ? Number(e.target.value) : undefined;
                  let recommendedPressureClassId = globalSpecs?.flangePressureClassId;
                  if (newTemp !== undefined && globalSpecs?.workingPressureBar && globalSpecs?.flangeStandardId) {
                    // Get material group from selected steel spec
                    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                    const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
                    recommendedPressureClassId = await fetchAndSelectPressureClass(
                      globalSpecs.flangeStandardId, globalSpecs.workingPressureBar, newTemp, materialGroup
                    );
                  }
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    workingTemperatureC: newTemp,
                    flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                  });
                }}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
                  errors.workingTemperature
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Select temperature...</option>
                {workingTemperatures.map((temp) => (
                  <option key={temp} value={temp}>{temp}°C</option>
                ))}
              </select>
              {errors.workingTemperature && <p className="mt-0.5 text-xs text-red-600">{errors.workingTemperature}</p>}
            </div>
          </div>
        </div>

        {/* Material Specifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-800 mb-2">Material Specifications</h3>

          <div className="grid grid-cols-3 gap-3">
            {/* Steel Specification - with grouped options and suitability validation */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Steel Specification</label>
              <select
                value={globalSpecs?.steelSpecificationId || ''}
                onChange={async (e) => {
                  const newSpecId = e.target.value ? Number(e.target.value) : undefined;
                  let recommendedPressureClassId = globalSpecs?.flangePressureClassId;

                  // Get the steel spec name and check suitability
                  const newSteelSpec = masterData.steelSpecs?.find((s: any) => s.id === newSpecId);
                  const specName = newSteelSpec?.steelSpecName || '';

                  // Check material suitability for current pressure/temperature
                  if (specName && (globalSpecs?.workingPressureBar || globalSpecs?.workingTemperatureC)) {
                    const suitability = checkMaterialSuitability(
                      specName,
                      globalSpecs?.workingTemperatureC,
                      globalSpecs?.workingPressureBar
                    );

                    if (!suitability.isSuitable) {
                      // Show warning popup for unsuitable material
                      setMaterialWarning({
                        show: true,
                        specName,
                        specId: newSpecId,
                        warnings: suitability.warnings,
                        recommendation: suitability.recommendation,
                        limits: suitability.limits
                      });
                      return; // Don't update yet - wait for user decision
                    }
                  }

                  // Recalculate pressure class when steel spec changes (affects material group for P-T ratings)
                  if (newSpecId && globalSpecs?.flangeStandardId && globalSpecs?.workingPressureBar) {
                    const materialGroup = getFlangeMaterialGroup(newSteelSpec?.steelSpecName);
                    recommendedPressureClassId = await fetchAndSelectPressureClass(
                      globalSpecs.flangeStandardId, globalSpecs.workingPressureBar, globalSpecs.workingTemperatureC, materialGroup
                    );
                  }

                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    steelSpecificationId: newSpecId,
                    flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Select steel specification...</option>
                {(() => {
                  // Helper to check if a spec is suitable for current conditions
                  const isSpecSuitable = (specName: string): boolean => {
                    if (!globalSpecs?.workingPressureBar && !globalSpecs?.workingTemperatureC) return true;
                    const suitability = checkMaterialSuitability(specName, globalSpecs?.workingTemperatureC, globalSpecs?.workingPressureBar);
                    return suitability.isSuitable;
                  };

                  // Helper to get limits text for unsuitable specs
                  const getLimitsText = (specName: string): string => {
                    const limits = getMaterialLimits(specName);
                    if (!limits) return '';
                    return ` [Max ${limits.maxTempC}°C]`;
                  };

                  // Group definitions with their filters
                  const groups = [
                    { label: 'South African Standards (SABS)', filter: (name: string) => name.startsWith('SABS') },
                    { label: 'Carbon Steel - ASTM A106 (High-Temp Seamless) - up to 427°C', filter: (name: string) => name.startsWith('ASTM A106') },
                    { label: 'Carbon Steel - ASTM A53 (General Purpose) - up to 400°C', filter: (name: string) => name.startsWith('ASTM A53') },
                    { label: 'Line Pipe - API 5L (Oil/Gas Pipelines) - up to 400°C', filter: (name: string) => name.startsWith('API 5L') },
                    { label: 'Low Temperature - ASTM A333 - down to -100°C', filter: (name: string) => name.startsWith('ASTM A333') },
                    { label: 'Heat Exchangers/Boilers - ASTM A179/A192', filter: (name: string) => /^ASTM A1(79|92)/.test(name) },
                    { label: 'Structural Tubing - ASTM A500 - up to 200°C', filter: (name: string) => name.startsWith('ASTM A500') },
                    { label: 'Alloy Steel - ASTM A335 (Chrome-Moly) - up to 593°C', filter: (name: string) => name.startsWith('ASTM A335') },
                    { label: 'Stainless Steel - ASTM A312 - up to 816°C', filter: (name: string) => name.startsWith('ASTM A312') },
                  ];

                  return groups.map((group, groupIdx) => {
                    const specs = masterData.steelSpecs.filter((spec: any) => group.filter(spec.steelSpecName || ''));
                    const suitableSpecs = specs.filter((spec: any) => isSpecSuitable(spec.steelSpecName || ''));
                    const unsuitableSpecs = specs.filter((spec: any) => !isSpecSuitable(spec.steelSpecName || ''));

                    // Only show group if it has suitable specs, or show as disabled if all unsuitable
                    if (specs.length === 0) return null;

                    return (
                      <optgroup key={groupIdx} label={suitableSpecs.length > 0 ? group.label : `⚠️ ${group.label} (Not Suitable)`}>
                        {suitableSpecs.map((spec: any) => (
                          <option key={spec.id} value={spec.id}>
                            {spec.steelSpecName}
                          </option>
                        ))}
                        {unsuitableSpecs.map((spec: any) => (
                          <option key={spec.id} value={spec.id} disabled style={{ color: '#999' }}>
                            ⚠️ {spec.steelSpecName}{getLimitsText(spec.steelSpecName)} - NOT SUITABLE
                          </option>
                        ))}
                      </optgroup>
                    );
                  });
                })()}
              </select>
              {/* Show current suitability status */}
              {globalSpecs?.steelSpecificationId && (globalSpecs?.workingPressureBar || globalSpecs?.workingTemperatureC) && (() => {
                const currentSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs.steelSpecificationId);
                if (!currentSpec) return null;
                const suitability = checkMaterialSuitability(currentSpec.steelSpecName, globalSpecs?.workingTemperatureC, globalSpecs?.workingPressureBar);
                if (suitability.isSuitable) {
                  return (
                    <p className="mt-1 text-xs text-green-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Suitable for {globalSpecs.workingTemperatureC}°C / {globalSpecs.workingPressureBar} bar
                    </p>
                  );
                } else {
                  return (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Not recommended for current conditions
                    </p>
                  );
                }
              })()}
            </div>

            {/* Flange Standard */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Flange Standard</label>
              <select
                value={globalSpecs?.flangeStandardId || ''}
                onChange={async (e) => {
                  const standardId = e.target.value ? Number(e.target.value) : undefined;
                  let recommendedPressureClassId: number | undefined = undefined;

                  // Clear pressure class when switching standards (must pick new one for the new standard)
                  const standardChanged = standardId !== globalSpecs?.flangeStandardId;

                  // Get material group from selected steel spec
                  const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                  const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);

                  if (standardId && globalSpecs?.workingPressureBar) {
                    recommendedPressureClassId = await fetchAndSelectPressureClass(standardId, globalSpecs.workingPressureBar, globalSpecs.workingTemperatureC, materialGroup) || undefined;
                  } else if (standardId) {
                    await fetchAndSelectPressureClass(standardId);
                  }

                  // If standard changed, only use new recommendation (don't keep old class from different standard)
                  const newPressureClassId = standardChanged
                    ? recommendedPressureClassId  // Only use new recommendation when switching standards
                    : (recommendedPressureClassId || globalSpecs?.flangePressureClassId);

                  console.log(`Flange standard changed to ${standardId}, recommended class: ${recommendedPressureClassId}, final: ${newPressureClassId}`);

                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    flangeStandardId: standardId,
                    flangePressureClassId: newPressureClassId
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Select flange standard...</option>
                {masterData.flangeStandards.map((standard: any) => (
                  <option key={standard.id} value={standard.id}>{standard.code}</option>
                ))}
              </select>
            </div>

            {/* Flange Pressure Class */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Pressure Class
                {globalSpecs?.workingPressureBar && <span className="ml-1 text-xs text-blue-600 font-normal">(auto)</span>}
              </label>
              <select
                value={globalSpecs?.flangePressureClassId || ''}
                onChange={(e) => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  flangePressureClassId: e.target.value ? Number(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                disabled={!globalSpecs?.flangeStandardId}
              >
                <option value="">Select class...</option>
                {availablePressureClasses.map((pc: any) => (
                  <option key={pc.id} value={pc.id}>{pc.designation}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

            </>
            )}
          </div>
        )}

        {/* Confirm Button for Steel Pipe Specifications */}
        {showSteelPipes && !globalSpecs?.steelPipesSpecsConfirmed && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onUpdateGlobalSpecs({
                ...globalSpecs,
                steelPipesSpecsConfirmed: true
              })}
              disabled={!globalSpecs?.workingPressureBar || !globalSpecs?.workingTemperatureC}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Steel Pipe Specifications
            </button>
          </div>
        )}

        {/* Surface Protection - Only show if Surface Protection is selected */}
        {showSurfaceProtection && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">🛡️</span>
              <h3 className="text-xl font-bold text-gray-900">Surface Protection</h3>
            </div>

            {/* Confirmed Surface Protection Summary - Show when ANY surface protection is confirmed */}
            {(globalSpecs?.surfaceProtectionConfirmed || globalSpecs?.externalCoatingConfirmed || globalSpecs?.internalLiningConfirmed) &&
             (globalSpecs?.externalCoatingRecommendation || globalSpecs?.externalCoatingType || globalSpecs?.internalLiningType) && (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Surface Protection Confirmed</span>
                    {(globalSpecs?.externalCoatingConfirmed || globalSpecs?.externalCoatingType || globalSpecs?.externalCoatingRecommendation) && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-medium">External:</span> {globalSpecs.externalCoatingRecommendation?.coating || globalSpecs.externalCoatingType || 'N/A'}
                      </>
                    )}
                    {(globalSpecs?.internalLiningConfirmed || globalSpecs?.internalLiningType) && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-medium">Internal:</span> {globalSpecs.internalLiningType || 'N/A'}
                        {globalSpecs?.internalRubberType && <span className="ml-1">({globalSpecs.internalRubberType})</span>}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalCoatingConfirmed: false,
                      internalLiningConfirmed: false,
                      surfaceProtectionConfirmed: false
                    })}
                    className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

        {/* External Coating */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-800 mb-2">External Coating</h3>

          {/* External Environment Profile - Coating Recommendation Assistant */}
          {!globalSpecs?.externalCoatingConfirmed && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  showExternalCoatingProfile: !globalSpecs?.showExternalCoatingProfile
                })}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs mb-2"
              >
                <svg className={`w-3 h-3 transition-transform ${globalSpecs?.showExternalCoatingProfile ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {globalSpecs?.showExternalCoatingProfile ? 'Hide' : 'Show'} Coating Assistant (ISO 12944/21809)
              </button>

              {globalSpecs?.showExternalCoatingProfile && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h4 className="text-sm font-semibold text-orange-900">External Environment Profile</h4>
                  </div>

                  {/* Installation Conditions */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                      Installation Conditions
                      {(isInstallationTypeAutoFilled || isUvExposureAutoFilled || isMechanicalRiskAutoFilled) && (
                        <span className="ml-2 text-xs font-medium text-emerald-600">✓ Auto-filled from Mine Selection</span>
                      )}
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Installation Type *
                          {isInstallationTypeAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveInstallationType || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpInstallationType: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isInstallationTypeAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="AboveGround">Above Ground</option>
                          <option value="Buried">Buried</option>
                          <option value="Submerged">Submerged</option>
                          <option value="Splash">Splash Zone</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          UV Exposure
                          {isUvExposureAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveUvExposure || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpUvExposure: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isUvExposureAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="None">None</option>
                          <option value="Moderate">Moderate</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Mechanical Risk
                          {isMechanicalRiskAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveMechanicalRisk || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpMechanicalRisk: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isMechanicalRiskAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High (Rocky/Abrasive)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Atmospheric Environment */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                      Atmospheric Environment
                      {(isIso12944AutoFilled || isMarineInfluenceAutoFilled || isIndustrialPollutionAutoFilled) && (
                        <span className="ml-1 text-[10px] font-medium text-emerald-600">✓ Auto</span>
                      )}
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          ISO 12944 *
                          {isIso12944AutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveIso12944 || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpIso12944Category: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isIso12944AutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="C1">C1 - Very Low</option>
                          <option value="C2">C2 - Low</option>
                          <option value="C3">C3 - Medium</option>
                          <option value="C4">C4 - High</option>
                          <option value="C5">C5 - Very High</option>
                          <option value="CX">CX - Extreme</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Marine
                          {isMarineInfluenceAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveMarineInfluence || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpMarineInfluence: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isMarineInfluenceAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="None">None (Inland)</option>
                          <option value="Coastal">Coastal</option>
                          <option value="Offshore">Offshore</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Industrial
                          {isIndustrialPollutionAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveIndustrialPollution || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpIndustrialPollution: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isIndustrialPollutionAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="None">None / Rural</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Heavy">Heavy</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Soil Conditions (for buried) */}
                  {effectiveInstallationType === "Buried" && (
                    <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                      <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                        Soil Conditions
                      </h5>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Soil Type</label>
                          <select
                            value={globalSpecs?.ecpSoilType || ""}
                            onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpSoilType: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                          >
                            <option value="">Select...</option>
                            <option value="Sandy">Sandy</option>
                            <option value="Clay">Clay</option>
                            <option value="Rocky">Rocky</option>
                            <option value="Marshy">Marshy</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Resistivity</label>
                          <select
                            value={globalSpecs?.ecpSoilResistivity || ""}
                            onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpSoilResistivity: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                          >
                            <option value="">Select...</option>
                            <option value="VeryLow">&lt;500 Ω·cm</option>
                            <option value="Low">500–2k Ω·cm</option>
                            <option value="Medium">2k–10k Ω·cm</option>
                            <option value="High">&gt;10k Ω·cm</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Moisture</label>
                          <select
                            value={globalSpecs?.ecpSoilMoisture || ""}
                            onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpSoilMoisture: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                          >
                            <option value="">Select...</option>
                            <option value="Dry">Dry</option>
                            <option value="Normal">Normal</option>
                            <option value="Wet">Wet</option>
                            <option value="Saturated">Saturated</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operating Conditions */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-[10px] font-bold">{effectiveInstallationType === "Buried" ? "4" : "3"}</span>
                      Operating Conditions
                      {isEcpTemperatureAutoFilled && <span className="ml-1 text-[10px] font-medium text-emerald-600">✓ Temp Auto</span>}
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Temperature
                        </label>
                        <select
                          value={effectiveEcpTemperature || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpTemperature: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${
                            isEcpTemperatureAutoFilled
                              ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                              : 'border border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value="">Select...</option>
                          <option value="Ambient">Ambient</option>
                          <option value="Elevated">Elevated (60–120°C)</option>
                          <option value="High">High (120–200°C)</option>
                          <option value="Cyclic">Cyclic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Service Life *</label>
                        <select
                          value={globalSpecs?.ecpServiceLife || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpServiceLife: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Short">&lt;7 years</option>
                          <option value="Medium">7–15 years</option>
                          <option value="Long">15–25 years</option>
                          <option value="Extended">&gt;25 years</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Cathodic Prot?</label>
                        <select
                          value={globalSpecs?.ecpCathodicProtection === true ? "true" : globalSpecs?.ecpCathodicProtection === false ? "false" : ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpCathodicProtection: e.target.value === "true" ? true : e.target.value === "false" ? false : undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Display */}
                  {(() => {
                    const profile: ExternalEnvironmentProfile = {
                      installation: {
                        type: effectiveInstallationType as any,
                        uvExposure: effectiveUvExposure as any,
                        mechanicalRisk: effectiveMechanicalRisk as any
                      },
                      atmosphere: {
                        iso12944Category: effectiveIso12944 as any,
                        marineInfluence: effectiveMarineInfluence as any,
                        industrialPollution: effectiveIndustrialPollution as any
                      },
                      soil: {
                        soilType: globalSpecs?.ecpSoilType as any,
                        resistivity: globalSpecs?.ecpSoilResistivity as any,
                        moisture: globalSpecs?.ecpSoilMoisture as any
                      },
                      operating: {
                        temperature: effectiveEcpTemperature as any,
                        cathodicProtection: globalSpecs?.ecpCathodicProtection,
                        serviceLife: globalSpecs?.ecpServiceLife as any
                      }
                    };

                    if (!hasCompleteExternalProfile(profile)) {
                      return (
                        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 text-center">
                            Complete the required fields (marked *) to receive a coating recommendation.
                          </p>
                        </div>
                      );
                    }

                    const damage = classifyExternalDamageMechanisms(profile);
                    const recommendation = recommendExternalCoating(profile, damage);

                    return (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-md p-2 border-2 border-emerald-300">
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h5 className="text-xs font-bold text-emerald-900">Recommended Coating</h5>
                          </div>
                          {isEcpTemperatureAutoFilled && (
                            <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                              Temp: {globalSpecs?.workingTemperatureC}°C
                            </span>
                          )}
                        </div>

                        {/* Compact 4-column grid for main info */}
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">Coating</div>
                            <div className="text-xs font-bold text-emerald-800">{recommendation.coating}</div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">System</div>
                            <div className="text-[10px] text-gray-700">{recommendation.system}</div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">Thickness</div>
                            <div className="text-xs font-semibold text-gray-800">{recommendation.thicknessRange}</div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">Exposure</div>
                            <div className="flex flex-wrap gap-0.5">
                              <span className={`text-[9px] px-1 py-0.5 rounded ${damage.atmosphericCorrosion === 'Severe' || damage.atmosphericCorrosion === 'High' ? 'bg-red-100 text-red-700' : damage.atmosphericCorrosion === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {damage.atmosphericCorrosion}
                              </span>
                              {effectiveInstallationType === "Buried" && (
                                <span className={`text-[9px] px-1 py-0.5 rounded ${damage.soilCorrosion === 'Severe' || damage.soilCorrosion === 'High' ? 'bg-red-100 text-red-700' : damage.soilCorrosion === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  Soil
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Standards and Notes in compact 2-column layout */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500 mb-1">Standards</div>
                            <div className="flex flex-wrap gap-1">
                              {recommendation.standardsBasis.slice(0, 3).map((std, i) => (
                                <span key={i} className="text-[9px] bg-orange-100 text-orange-800 px-1 py-0.5 rounded font-medium">
                                  {std}
                                </span>
                              ))}
                              {recommendation.standardsBasis.length > 3 && (
                                <span className="text-[9px] text-gray-500">+{recommendation.standardsBasis.length - 3}</span>
                              )}
                            </div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500 mb-1">Rationale</div>
                            <p className="text-[10px] text-gray-700 line-clamp-2">{recommendation.rationale}</p>
                          </div>
                        </div>

                        {/* Engineering Notes - collapsible */}
                        <details className="bg-white rounded p-1.5 border border-emerald-200 mb-2">
                          <summary className="text-[10px] font-medium text-gray-500 cursor-pointer">Engineering Notes ({recommendation.engineeringNotes.length})</summary>
                          <ul className="text-[10px] text-gray-700 mt-1 space-y-0.5 pl-2">
                            {recommendation.engineeringNotes.map((note, i) => (
                              <li key={i}>• {note}</li>
                            ))}
                          </ul>
                        </details>

                        {/* Colour Selection - more compact */}
                        <div className="bg-white rounded p-1.5 border border-emerald-200 mb-2">
                          <div className="text-[10px] font-medium text-emerald-700 mb-1.5 flex items-center gap-1">
                            <span className="bg-emerald-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">4</span>
                            Colours (Optional)
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Topcoat Colour */}
                            <div>
                              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Topcoat</label>
                              {!globalSpecs?.showRecCustomColourInput ? (
                                <select
                                  value={globalSpecs?.recExternalTopcoatColour || ''}
                                  onChange={(e) => {
                                    if (e.target.value === '__ADD_CUSTOM__') {
                                      onUpdateGlobalSpecs({ ...globalSpecs, showRecCustomColourInput: true });
                                    } else {
                                      onUpdateGlobalSpecs({ ...globalSpecs, recExternalTopcoatColour: e.target.value || undefined });
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                >
                                  <option value="">Select...</option>
                                  <option value="__ADD_CUSTOM__">+ Custom...</option>
                                  {(() => {
                                    try {
                                      const customColours = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                                      if (customColours.length > 0) {
                                        return customColours.map((colour: string, idx: number) => (
                                          <option key={idx} value={colour}>{colour}</option>
                                        ));
                                      }
                                    } catch (e) {}
                                    return null;
                                  })()}
                                  <optgroup label="Mining">
                                    <option value="Safety Yellow (RAL 1003)">Yellow RAL 1003</option>
                                    <option value="Safety Orange (RAL 2009)">Orange RAL 2009</option>
                                    <option value="Safety Red (RAL 3001)">Red RAL 3001</option>
                                    <option value="Safety Green (RAL 6024)">Green RAL 6024</option>
                                    <option value="Signal Blue (RAL 5005)">Blue RAL 5005</option>
                                    <option value="White (RAL 9003)">White RAL 9003</option>
                                    <option value="Black (RAL 9005)">Black RAL 9005</option>
                                    <option value="Grey (RAL 7035)">Grey RAL 7035</option>
                                  </optgroup>
                                  <optgroup label="Pipeline">
                                    <option value="Water - Blue (RAL 5015)">Water Blue</option>
                                    <option value="Steam - Silver Grey (RAL 7001)">Steam Grey</option>
                                    <option value="Air - Light Blue (RAL 5012)">Air Blue</option>
                                    <option value="Gas - Yellow Ochre (RAL 1024)">Gas Yellow</option>
                                    <option value="Fire Services - Red (RAL 3000)">Fire Red</option>
                                  </optgroup>
                                </select>
                              ) : (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={globalSpecs?.recCustomColourInput || ''}
                                    onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, recCustomColourInput: e.target.value })}
                                    placeholder="Colour name"
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newColour = globalSpecs?.recCustomColourInput?.trim();
                                        if (newColour) {
                                          try {
                                            const existing = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                                            if (!existing.includes(newColour)) {
                                              existing.push(newColour);
                                              localStorage.setItem('customTopcoatColours', JSON.stringify(existing));
                                            }
                                          } catch (e) {}
                                          onUpdateGlobalSpecs({ ...globalSpecs, recExternalTopcoatColour: newColour, showRecCustomColourInput: false, recCustomColourInput: undefined });
                                        }
                                      }}
                                      disabled={!globalSpecs?.recCustomColourInput?.trim()}
                                      className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateGlobalSpecs({ ...globalSpecs, showRecCustomColourInput: false, recCustomColourInput: undefined })}
                                      className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Band 1 Colour */}
                            <div>
                              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Band 1</label>
                              {!globalSpecs?.showRecBand1Input ? (
                                <select
                                  value={globalSpecs?.recExternalBand1Colour || ''}
                                  onChange={(e) => {
                                    if (e.target.value === '__ADD_CUSTOM__') {
                                      onUpdateGlobalSpecs({ ...globalSpecs, showRecBand1Input: true });
                                    } else {
                                      onUpdateGlobalSpecs({
                                        ...globalSpecs,
                                        recExternalBand1Colour: e.target.value || undefined,
                                        ...(e.target.value ? {} : { recExternalBand2Colour: undefined })
                                      });
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                >
                                  <option value="">None</option>
                                  <option value="__ADD_CUSTOM__">+ Custom...</option>
                                  {(() => {
                                    try {
                                      const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                      if (customColours.length > 0) {
                                        return customColours.map((colour: string, idx: number) => (
                                          <option key={idx} value={colour}>{colour}</option>
                                        ));
                                      }
                                    } catch (e) {}
                                    return null;
                                  })()}
                                  <option value="White (RAL 9003)">White</option>
                                  <option value="Yellow (RAL 1023)">Yellow</option>
                                  <option value="Orange (RAL 2004)">Orange</option>
                                  <option value="Red (RAL 3020)">Red</option>
                                  <option value="Blue (RAL 5015)">Blue</option>
                                  <option value="Green (RAL 6032)">Green</option>
                                  <option value="Black (RAL 9005)">Black</option>
                                </select>
                              ) : (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={globalSpecs?.recBand1Input || ''}
                                    onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, recBand1Input: e.target.value })}
                                    placeholder="Band colour"
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newColour = globalSpecs?.recBand1Input?.trim();
                                        if (newColour) {
                                          try {
                                            const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                            if (!existing.includes(newColour)) {
                                              existing.push(newColour);
                                              localStorage.setItem('customBandColours', JSON.stringify(existing));
                                            }
                                          } catch (e) {}
                                          onUpdateGlobalSpecs({ ...globalSpecs, recExternalBand1Colour: newColour, showRecBand1Input: false, recBand1Input: undefined });
                                        }
                                      }}
                                      disabled={!globalSpecs?.recBand1Input?.trim()}
                                      className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateGlobalSpecs({ ...globalSpecs, showRecBand1Input: false, recBand1Input: undefined })}
                                      className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Band 2 Colour - Only if Band 1 selected */}
                            {globalSpecs?.recExternalBand1Colour && (
                              <div>
                                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Band 2</label>
                                {!globalSpecs?.showRecBand2Input ? (
                                  <select
                                    value={globalSpecs?.recExternalBand2Colour || ''}
                                    onChange={(e) => {
                                      if (e.target.value === '__ADD_CUSTOM__') {
                                        onUpdateGlobalSpecs({ ...globalSpecs, showRecBand2Input: true });
                                      } else {
                                        onUpdateGlobalSpecs({ ...globalSpecs, recExternalBand2Colour: e.target.value || undefined });
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                  >
                                    <option value="">None</option>
                                    <option value="__ADD_CUSTOM__">+ Custom...</option>
                                    {(() => {
                                      try {
                                        const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                        if (customColours.length > 0) {
                                          return customColours.map((colour: string, idx: number) => (
                                            <option key={idx} value={colour}>{colour}</option>
                                          ));
                                        }
                                      } catch (e) {}
                                      return null;
                                    })()}
                                    <option value="White (RAL 9003)">White</option>
                                    <option value="Yellow (RAL 1023)">Yellow</option>
                                    <option value="Orange (RAL 2004)">Orange</option>
                                    <option value="Red (RAL 3020)">Red</option>
                                    <option value="Blue (RAL 5015)">Blue</option>
                                    <option value="Green (RAL 6032)">Green</option>
                                    <option value="Black (RAL 9005)">Black</option>
                                  </select>
                                ) : (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={globalSpecs?.recBand2Input || ''}
                                      onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, recBand2Input: e.target.value })}
                                      placeholder="Band colour"
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newColour = globalSpecs?.recBand2Input?.trim();
                                          if (newColour) {
                                            try {
                                              const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                              if (!existing.includes(newColour)) {
                                                existing.push(newColour);
                                                localStorage.setItem('customBandColours', JSON.stringify(existing));
                                              }
                                            } catch (e) {}
                                            onUpdateGlobalSpecs({ ...globalSpecs, recExternalBand2Colour: newColour, showRecBand2Input: false, recBand2Input: undefined });
                                          }
                                        }}
                                        disabled={!globalSpecs?.recBand2Input?.trim()}
                                        className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateGlobalSpecs({ ...globalSpecs, showRecBand2Input: false, recBand2Input: undefined })}
                                        className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Compact action buttons */}
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              externalCoatingType: recommendation.coatingType,
                              externalCoatingConfirmed: true,
                              externalCoatingRecommendationRejected: false,
                              externalBlastingGrade: recommendation.coatingType === 'Galvanized' ? undefined : 'SA 2.5 (ISO 8501-1)',
                              externalTopcoatColour: globalSpecs?.recExternalTopcoatColour,
                              externalBand1Colour: globalSpecs?.recExternalBand1Colour,
                              externalBand2Colour: globalSpecs?.recExternalBand2Colour,
                              externalCoatingRecommendation: {
                                coating: recommendation.coating,
                                system: recommendation.system,
                                thicknessRange: recommendation.thicknessRange,
                                standardsBasis: recommendation.standardsBasis,
                                rationale: recommendation.rationale,
                                engineeringNotes: recommendation.engineeringNotes,
                                environmentProfile: {
                                  installationType: effectiveInstallationType,
                                  iso12944Category: effectiveIso12944,
                                  marineInfluence: effectiveMarineInfluence,
                                  industrialPollution: effectiveIndustrialPollution,
                                  uvExposure: effectiveUvExposure,
                                  mechanicalRisk: effectiveMechanicalRisk,
                                  temperature: effectiveEcpTemperature,
                                  serviceLife: globalSpecs?.ecpServiceLife
                                },
                                damageAssessment: {
                                  atmosphericCorrosion: damage.atmosphericCorrosion,
                                  soilCorrosion: damage.soilCorrosion,
                                  mechanicalDamage: damage.mechanicalDamage,
                                  dominantMechanism: damage.dominantMechanism
                                }
                              },
                              externalCoatingActionLog: [
                                ...(globalSpecs?.externalCoatingActionLog || []),
                                { action: 'ACCEPTED', timestamp: new Date().toISOString(), recommendation: recommendation.coating }
                              ]
                            })}
                            className="flex-1 px-2 py-1.5 bg-emerald-600 text-white font-medium rounded text-xs flex items-center justify-center gap-1 hover:bg-emerald-700"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Accept & Lock
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              externalCoatingRecommendationRejected: true,
                              externalCoatingActionLog: [
                                ...(globalSpecs?.externalCoatingActionLog || []),
                                { action: 'REJECTED', timestamp: new Date().toISOString(), recommendation: recommendation.coating }
                              ]
                            })}
                            className="px-2 py-1.5 bg-red-600 text-white font-medium rounded text-xs flex items-center justify-center gap-1 hover:bg-red-700"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>

                        {/* Compact disclaimer */}
                        <details className="mt-2 text-[10px] text-amber-700">
                          <summary className="cursor-pointer font-medium">Engineering Disclaimer</summary>
                          <p className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded">
                            Recommendations based on ISO 12944/21809. Does not replace project-specific assessments or qualified inspector verification.
                          </p>
                        </details>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* LOCKED SUPPLIER SPECIFICATION - Shows when recommendation is confirmed */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingRecommendation && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <h4 className="text-lg font-bold text-green-800">External Coating Specification (Locked)</h4>
              </div>

              {/* Supplier Specification Summary */}
              <div className="bg-white rounded-lg border border-green-300 p-4 space-y-4">
                <div className="text-center border-b border-green-200 pb-3">
                  <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Coating System</h5>
                  <p className="text-xl font-bold text-green-800 mt-1">{globalSpecs.externalCoatingRecommendation.coating}</p>
                </div>

                {/* Surface Preparation */}
                {globalSpecs?.externalBlastingGrade && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <span className="font-semibold text-amber-800 text-sm">Surface Preparation:</span>
                    <p className="text-amber-900 font-medium mt-1">{globalSpecs.externalBlastingGrade}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">System:</span>
                    <p className="text-gray-900 mt-0.5">{globalSpecs.externalCoatingRecommendation.system}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Thickness Range:</span>
                    <p className="text-gray-900 font-medium mt-0.5">{globalSpecs.externalCoatingRecommendation.thicknessRange}</p>
                  </div>
                </div>

                {/* Colour Specifications */}
                {(globalSpecs?.externalTopcoatColour || globalSpecs?.externalBand1Colour) && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <span className="font-semibold text-blue-800 text-sm">Colour Specifications:</span>
                    <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
                      {globalSpecs?.externalTopcoatColour && (
                        <div>
                          <span className="text-blue-600 text-xs">Topcoat Colour:</span>
                          <p className="font-medium text-blue-900">{globalSpecs.externalTopcoatColour}</p>
                        </div>
                      )}
                      {globalSpecs?.externalBand1Colour && (
                        <div>
                          <span className="text-blue-600 text-xs">Band 1 Colour:</span>
                          <p className="font-medium text-blue-900">{globalSpecs.externalBand1Colour}</p>
                        </div>
                      )}
                      {globalSpecs?.externalBand2Colour && (
                        <div>
                          <span className="text-blue-600 text-xs">Band 2 Colour:</span>
                          <p className="font-medium text-blue-900">{globalSpecs.externalBand2Colour}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-gray-700 text-sm">Applicable Standards:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {globalSpecs.externalCoatingRecommendation.standardsBasis.map((std: string, i: number) => (
                      <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                        {std}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="font-semibold text-gray-700 text-sm">Environment Profile:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                    <div><span className="text-gray-500">Installation:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.installationType || 'N/A'}</span></div>
                    <div><span className="text-gray-500">ISO 12944:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.iso12944Category || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Marine:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.marineInfluence || 'None'}</span></div>
                    <div><span className="text-gray-500">UV Exposure:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.uvExposure || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Temperature:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.temperature || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Service Life:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.serviceLife || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Mech. Risk:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.mechanicalRisk || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Pollution:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.industrialPollution || 'None'}</span></div>
                  </div>
                </div>

                <div className="bg-green-100 rounded-lg p-3">
                  <span className="font-semibold text-green-800 text-sm">Engineering Notes for Suppliers:</span>
                  <ul className="mt-2 text-xs text-green-900 space-y-1">
                    {globalSpecs.externalCoatingRecommendation.engineeringNotes.map((note: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-500 italic border-t border-gray-200 pt-3">
                  <strong>Rationale:</strong> {globalSpecs.externalCoatingRecommendation.rationale}
                </div>
              </div>

              <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800 text-center">
                <strong>This specification will be sent to suppliers for quotation.</strong>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: false,
                    externalCoatingRecommendation: undefined,
                    externalCoatingActionLog: [
                      ...(globalSpecs?.externalCoatingActionLog || []),
                      { action: 'UNLOCKED_FOR_EDIT', timestamp: new Date().toISOString() }
                    ]
                  })}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock & Edit Specification
                </button>
              </div>
            </div>
          )}

          {/* MANUAL COATING FIELDS - Show when:
              1. Recommendation assistant is NOT open (!showExternalCoatingProfile), OR
              2. User has rejected the recommendation (externalCoatingRecommendationRejected)
              AND not already confirmed */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) && !globalSpecs?.externalCoatingConfirmed && (
            <>
            {/* Show rejection banner only if user explicitly rejected after viewing recommendation */}
            {globalSpecs?.externalCoatingRecommendationRejected && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-md font-bold text-red-800">System Recommendation Rejected</h4>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  You have chosen to specify your own coating requirements instead of using the system recommendation.
                </p>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingRecommendationRejected: false,
                    externalCoatingType: undefined,
                    showExternalCoatingProfile: true,
                    externalCoatingActionLog: [
                      ...(globalSpecs?.externalCoatingActionLog || []),
                      { action: 'REVERTED_TO_RECOMMENDATION', timestamp: new Date().toISOString() }
                    ]
                  })}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Use System Recommendation Instead
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  External Coating Type
                </label>
                <select
                  value={globalSpecs?.externalCoatingType || ''}
                  onChange={(e) => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingType: e.target.value || undefined,
                    // Clear related fields when changing coating type
                    externalPrimerType: undefined,
                    externalPrimerMicrons: undefined,
                    externalIntermediateType: undefined,
                    externalIntermediateMicrons: undefined,
                    externalTopcoatType: undefined,
                    externalTopcoatMicrons: undefined,
                    externalPaintConfirmed: undefined,
                    externalRubberType: undefined,
                    externalRubberThickness: undefined,
                    externalRubberColour: undefined,
                    externalRubberHardness: undefined
                  })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select coating...</option>
                  <option value="Raw Steel">Raw Steel (No Coating)</option>
                  <option value="Paint">Paint</option>
                  <option value="Galvanized">Galvanized</option>
                  <option value="Rubber Lined">Rubber Lined</option>
                </select>
              </div>
            </div>
          </>
          )}

          {/* Confirmed Non-Paint External Coating - Only for manual selection, not recommendation */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType && globalSpecs?.externalCoatingType !== 'Paint' && !globalSpecs?.externalCoatingRecommendation && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  External Coating: <span className="ml-1 text-green-700">{globalSpecs.externalCoatingType}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: false
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Confirm button for simple selections (not Paint or Rubber Lined) - Only for manual selection */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
           !globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType &&
           globalSpecs?.externalCoatingType !== 'Paint' && globalSpecs?.externalCoatingType !== 'Rubber Lined' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: true
                })}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                Confirm External Coating
              </button>
            </div>
          )}

          {/* Rubber Lined Options - Only show when selected AND not confirmed AND (assistant closed OR rejected) */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
           globalSpecs?.externalCoatingType === 'Rubber Lined' && !globalSpecs?.externalCoatingConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">External Rubber Lining Specifications</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Rubber Type</label>
                  <select
                    value={globalSpecs?.externalRubberType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Natural Rubber">Natural</option>
                    <option value="Bromobutyl Rubber">Bromobutyl</option>
                    <option value="Nitrile Rubber (NBR)">Nitrile (NBR)</option>
                    <option value="Neoprene (CR)">Neoprene (CR)</option>
                    <option value="EPDM">EPDM</option>
                    <option value="Chlorobutyl">Chlorobutyl</option>
                    <option value="Hypalon (CSM)">Hypalon (CSM)</option>
                    <option value="Viton (FKM)">Viton (FKM)</option>
                    <option value="Silicone Rubber">Silicone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.externalRubberThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Colour</label>
                  <select
                    value={globalSpecs?.externalRubberColour || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberColour: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                    <option value="Natural (Tan)">Natural</option>
                    <option value="Grey">Grey</option>
                    <option value="Green">Green</option>
                    <option value="Blue">Blue</option>
                    <option value="White">White</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Shore Hardness</label>
                  <select
                    value={globalSpecs?.externalRubberHardness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberHardness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="40">40 Shore A</option>
                    <option value="50">50 Shore A</option>
                    <option value="60">60 Shore A</option>
                    <option value="70">70 Shore A</option>
                  </select>
                </div>
              </div>

              {/* Rubber Lining Summary */}
              {globalSpecs?.externalRubberType && globalSpecs?.externalRubberThickness && globalSpecs?.externalRubberColour && globalSpecs?.externalRubberHardness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">{globalSpecs.externalRubberType}</span> • {globalSpecs.externalRubberThickness}mm • {globalSpecs.externalRubberColour} • {globalSpecs.externalRubberHardness} Shore A
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalCoatingConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed External Rubber Lining */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType === 'Rubber Lined' && globalSpecs?.externalRubberType && (
            <div className="bg-green-100 border border-green-400 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{globalSpecs.externalRubberType}</span> • {globalSpecs.externalRubberThickness}mm • {globalSpecs.externalRubberColour} • {globalSpecs.externalRubberHardness} Shore A
              </div>
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                  externalCoatingType: 'Rubber Lined'
                })}
                className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
              >
                Edit
              </button>
            </div>
          )}

          {/* Confirmed External Paint Specification - Always visible when confirmed */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType === 'Paint' && globalSpecs?.externalPrimerType && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  External Paint Specification (Confirmed)
                </h4>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Surface Prep:</span> {globalSpecs?.externalBlastingGrade || <span className="text-gray-400 italic">Not specified</span>}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Primer:</span> {globalSpecs.externalPrimerType}</span>
                    <span className="font-semibold text-green-800">{globalSpecs.externalPrimerMicrons} μm</span>
                  </div>

                  {globalSpecs?.externalIntermediateType && globalSpecs?.externalIntermediateMicrons && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700"><span className="font-medium">Intermediate:</span> {globalSpecs.externalIntermediateType}</span>
                      <span className="font-semibold text-green-800">{globalSpecs.externalIntermediateMicrons} μm</span>
                    </div>
                  )}

                  {globalSpecs?.externalTopcoatType && globalSpecs?.externalTopcoatMicrons && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700"><span className="font-medium">Topcoat:</span> {globalSpecs.externalTopcoatType}</span>
                      <span className="font-semibold text-green-800">{globalSpecs.externalTopcoatMicrons} μm</span>
                    </div>
                  )}

                  {globalSpecs?.externalTopcoatType && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700"><span className="font-medium">Colour:</span> {globalSpecs?.externalTopcoatColour || <span className="text-gray-400 italic">Not specified</span>}</span>
                    </div>
                  )}

                  <div className="flex gap-6 items-center">
                    <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                    <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-300">
                    <span className="font-semibold text-green-800">Total DFT</span>
                    <span className="font-bold text-green-900">
                      {(globalSpecs.externalPrimerMicrons || 0) +
                       (globalSpecs.externalIntermediateMicrons || 0) +
                       (globalSpecs.externalTopcoatMicrons || 0)} μm
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalCoatingConfirmed: false,
                      externalPaintSpecConfirmed: false,
                      externalCoatingType: 'Paint'
                    })}
                    className="px-3 py-1.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 text-xs flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Specification
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Paint Options - Only show when selected AND not confirmed AND (assistant closed OR rejected) */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
           globalSpecs?.externalCoatingType === 'Paint' && !globalSpecs?.externalCoatingConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">External Paint Specifications</h4>

              {/* Surface Preparation + Primer in one row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Blasting Grade</label>
                  <select
                    value={globalSpecs?.externalBlastingGrade || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalBlastingGrade: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="SA 1 (ISO 8501-1)">SA 1 - Light</option>
                    <option value="SA 2 (ISO 8501-1)">SA 2 - Thorough</option>
                    <option value="SA 2.5 (ISO 8501-1)">SA 2.5 - Very Thorough</option>
                    <option value="SA 3 (ISO 8501-1)">SA 3 - Visually Clean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer Type</label>
                  <select
                    value={globalSpecs?.externalPrimerType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalPrimerType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Inorganic Zinc Silicate">Inorganic Zinc</option>
                    <option value="Organic Zinc Epoxy">Organic Zinc Epoxy</option>
                    <option value="Zinc Phosphate Epoxy">Zinc Phosphate</option>
                    <option value="Epoxy Primer">Epoxy</option>
                    <option value="Polyurethane Primer">Polyurethane</option>
                    <option value="Red Oxide Primer">Red Oxide</option>
                    <option value="Alkyd Primer">Alkyd</option>
                    <option value="Shop Primer">Shop Primer</option>
                    <option value="Etch Primer">Etch Primer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer (μm)</label>
                  <input
                    type="number"
                    value={globalSpecs?.externalPrimerMicrons || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalPrimerMicrons: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="50-75"
                    min="0"
                    max="500"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Optional Intermediate Coat */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate Coat</label>
                  <select
                    value={globalSpecs?.externalIntermediateType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalIntermediateType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">None</option>
                    <option value="MIO Epoxy (Micaceous Iron Oxide)">MIO Epoxy</option>
                    <option value="Glass Flake Epoxy">Glass Flake Epoxy</option>
                    <option value="High Build Epoxy">High Build Epoxy</option>
                    <option value="Epoxy Polyamide">Epoxy Polyamide</option>
                    <option value="Epoxy Phenalkamine">Epoxy Phenalkamine</option>
                  </select>
                </div>

                {globalSpecs?.externalIntermediateType && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate (μm)</label>
                    <input
                      type="number"
                      value={globalSpecs?.externalIntermediateMicrons || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalIntermediateMicrons: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="125-200"
                      min="0"
                      max="500"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Topcoat / Finish Coat */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat Type</label>
                  <select
                    value={globalSpecs?.externalTopcoatType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalTopcoatType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                      <option value="">None (No topcoat)</option>
                      <option value="Aliphatic Polyurethane">Aliphatic Polyurethane</option>
                      <option value="Acrylic Polyurethane">Acrylic Polyurethane</option>
                      <option value="Polysiloxane">Polysiloxane</option>
                      <option value="Epoxy Topcoat">Epoxy Topcoat</option>
                      <option value="Alkyd Topcoat">Alkyd Topcoat</option>
                      <option value="Acrylic Topcoat">Acrylic Topcoat</option>
                    </select>
                  </div>

                  {globalSpecs?.externalTopcoatType && (
                    <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat (μm)</label>
                      <input
                        type="number"
                        value={globalSpecs?.externalTopcoatMicrons || ''}
                        onChange={(e) => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalTopcoatMicrons: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="50-75"
                        min="0"
                        max="500"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Final Coat Colour</label>
                      {!globalSpecs?.showCustomColourInput ? (
                        <select
                          value={globalSpecs?.externalTopcoatColour || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CUSTOM__') {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomColourInput: true
                              });
                            } else {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                externalTopcoatColour: e.target.value || undefined
                              });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">Select colour...</option>
                          <optgroup label="SA Mining Standard Colours">
                            <option value="Safety Yellow (RAL 1003)">Safety Yellow (RAL 1003)</option>
                            <option value="Safety Orange (RAL 2009)">Safety Orange (RAL 2009)</option>
                            <option value="Safety Red (RAL 3001)">Safety Red (RAL 3001)</option>
                            <option value="Safety Green (RAL 6024)">Safety Green (RAL 6024)</option>
                            <option value="Signal Blue (RAL 5005)">Signal Blue (RAL 5005)</option>
                            <option value="White (RAL 9003)">White (RAL 9003)</option>
                            <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                            <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                          </optgroup>
                          <optgroup label="Pipeline Identification (SABS 0140)">
                            <option value="Water - Blue (RAL 5015)">Water - Blue (RAL 5015)</option>
                            <option value="Steam - Silver Grey (RAL 7001)">Steam - Silver Grey (RAL 7001)</option>
                            <option value="Air - Light Blue (RAL 5012)">Air - Light Blue (RAL 5012)</option>
                            <option value="Gas - Yellow Ochre (RAL 1024)">Gas - Yellow Ochre (RAL 1024)</option>
                            <option value="Acids - Orange (RAL 2000)">Acids - Orange (RAL 2000)</option>
                            <option value="Alkalis - Violet (RAL 4001)">Alkalis - Violet (RAL 4001)</option>
                            <option value="Oil - Brown (RAL 8001)">Oil - Brown (RAL 8001)</option>
                            <option value="Fire Services - Red (RAL 3000)">Fire Services - Red (RAL 3000)</option>
                            <option value="Slurry - Black (RAL 9005)">Slurry - Black (RAL 9005)</option>
                          </optgroup>
                          <optgroup label="Common Mine Colours">
                            <option value="Anglo American Blue">Anglo American Blue</option>
                            <option value="Sasol Blue">Sasol Blue</option>
                            <option value="Exxaro Green">Exxaro Green</option>
                            <option value="Harmony Gold">Harmony Gold</option>
                            <option value="Sibanye Silver">Sibanye Silver</option>
                            <option value="Impala Platinum Grey">Impala Platinum Grey</option>
                            <option value="Kumba Iron Ore Red">Kumba Iron Ore Red</option>
                          </optgroup>
                          {/* Custom colours from localStorage */}
                          {(() => {
                            try {
                              const customColours = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                              if (customColours.length > 0) {
                                return (
                                  <optgroup label="Custom Colours">
                                    {customColours.map((colour: string, idx: number) => (
                                      <option key={idx} value={colour}>{colour}</option>
                                    ))}
                                  </optgroup>
                                );
                              }
                            } catch (e) {
                              // Ignore localStorage errors
                            }
                            return null;
                          })()}
                          <optgroup label="Other">
                            <option value="__ADD_CUSTOM__">+ Add Custom Colour...</option>
                          </optgroup>
                        </select>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={globalSpecs?.customColourInput || ''}
                            onChange={(e) => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              customColourInput: e.target.value
                            })}
                            placeholder="Enter colour (e.g., Mine Blue RAL 5010)"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newColour = globalSpecs?.customColourInput?.trim();
                                if (newColour) {
                                  // Save to localStorage
                                  try {
                                    const existing = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                                    if (!existing.includes(newColour)) {
                                      existing.push(newColour);
                                      localStorage.setItem('customTopcoatColours', JSON.stringify(existing));
                                    }
                                  } catch (e) {
                                    // Ignore localStorage errors
                                  }
                                  onUpdateGlobalSpecs({
                                    ...globalSpecs,
                                    externalTopcoatColour: newColour,
                                    showCustomColourInput: false,
                                    customColourInput: undefined
                                  });
                                }
                              }}
                              disabled={!globalSpecs?.customColourInput?.trim()}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Save Colour
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomColourInput: false,
                                customColourInput: undefined
                              })}
                              className="px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    </>
                  )}
                </div>

                {/* Band Colours Row */}
                {globalSpecs?.externalTopcoatType && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* Band 1 Colour */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Band 1 <span className="text-gray-400 font-normal">(Optional)</span></label>
                      {!globalSpecs?.showCustomBand1Input ? (
                        <select
                          value={globalSpecs?.externalBand1Colour || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CUSTOM__') {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomBand1Input: true
                              });
                            } else {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                externalBand1Colour: e.target.value || undefined,
                                ...(e.target.value ? {} : { externalBand2Colour: undefined })
                              });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">No band required</option>
                          <optgroup label="Add Your Own">
                            <option value="__ADD_CUSTOM__">+ Add Custom Band Colour...</option>
                          </optgroup>
                          {/* Custom band colours from localStorage */}
                          {(() => {
                            try {
                              const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                              if (customColours.length > 0) {
                                return (
                                  <optgroup label="Saved Custom Colours">
                                    {customColours.map((colour: string, idx: number) => (
                                      <option key={idx} value={colour}>{colour}</option>
                                    ))}
                                  </optgroup>
                                );
                              }
                            } catch (e) {}
                            return null;
                          })()}
                          <optgroup label="Common Band Colours">
                            <option value="White (RAL 9003)">White (RAL 9003)</option>
                            <option value="Yellow (RAL 1023)">Yellow (RAL 1023)</option>
                            <option value="Orange (RAL 2004)">Orange (RAL 2004)</option>
                            <option value="Red (RAL 3020)">Red (RAL 3020)</option>
                            <option value="Blue (RAL 5015)">Blue (RAL 5015)</option>
                            <option value="Green (RAL 6032)">Green (RAL 6032)</option>
                            <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                            <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                          </optgroup>
                          <optgroup label="Safety & Warning Bands">
                            <option value="Safety Yellow Band">Safety Yellow Band</option>
                            <option value="Caution Orange Band">Caution Orange Band</option>
                            <option value="Danger Red Band">Danger Red Band</option>
                            <option value="Warning Black/Yellow Stripe">Warning Black/Yellow Stripe</option>
                          </optgroup>
                          <optgroup label="Pipeline Identification Bands">
                            <option value="Water Identification Blue">Water Identification Blue</option>
                            <option value="Steam Grey Band">Steam Grey Band</option>
                            <option value="Gas Yellow Band">Gas Yellow Band</option>
                            <option value="Fire Red Band">Fire Red Band</option>
                            <option value="Slurry Black Band">Slurry Black Band</option>
                          </optgroup>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={globalSpecs?.customBand1Input || ''}
                            onChange={(e) => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              customBand1Input: e.target.value
                            })}
                            placeholder="Enter band colour"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newColour = globalSpecs?.customBand1Input?.trim();
                                if (newColour) {
                                  try {
                                    const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                    if (!existing.includes(newColour)) {
                                      existing.push(newColour);
                                      localStorage.setItem('customBandColours', JSON.stringify(existing));
                                    }
                                  } catch (e) {}
                                  onUpdateGlobalSpecs({
                                    ...globalSpecs,
                                    externalBand1Colour: newColour,
                                    showCustomBand1Input: false,
                                    customBand1Input: undefined
                                  });
                                }
                              }}
                              disabled={!globalSpecs?.customBand1Input?.trim()}
                              className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomBand1Input: false,
                                customBand1Input: undefined
                              })}
                              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Band 2 Colour */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Band 2 <span className="text-gray-400 font-normal">(Optional)</span></label>
                      {!globalSpecs?.showCustomBand2Input ? (
                        <select
                          value={globalSpecs?.externalBand2Colour || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CUSTOM__') {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomBand2Input: true
                              });
                            } else {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                externalBand2Colour: e.target.value || undefined
                              });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          disabled={!globalSpecs?.externalBand1Colour}
                        >
                            <option value="">No second band required</option>
                            <optgroup label="Add Your Own">
                              <option value="__ADD_CUSTOM__">+ Add Custom Band Colour...</option>
                            </optgroup>
                            {/* Custom band colours from localStorage */}
                            {(() => {
                              try {
                                const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                if (customColours.length > 0) {
                                  return (
                                    <optgroup label="Saved Custom Colours">
                                      {customColours.map((colour: string, idx: number) => (
                                        <option key={idx} value={colour}>{colour}</option>
                                      ))}
                                    </optgroup>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}
                            <optgroup label="Common Band Colours">
                              <option value="White (RAL 9003)">White (RAL 9003)</option>
                              <option value="Yellow (RAL 1023)">Yellow (RAL 1023)</option>
                              <option value="Orange (RAL 2004)">Orange (RAL 2004)</option>
                              <option value="Red (RAL 3020)">Red (RAL 3020)</option>
                              <option value="Blue (RAL 5015)">Blue (RAL 5015)</option>
                              <option value="Green (RAL 6032)">Green (RAL 6032)</option>
                              <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                              <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                            </optgroup>
                            <optgroup label="Safety & Warning Bands">
                              <option value="Safety Yellow Band">Safety Yellow Band</option>
                              <option value="Caution Orange Band">Caution Orange Band</option>
                              <option value="Danger Red Band">Danger Red Band</option>
                              <option value="Warning Black/Yellow Stripe">Warning Black/Yellow Stripe</option>
                            </optgroup>
                            <optgroup label="Pipeline Identification Bands">
                              <option value="Water Identification Blue">Water Identification Blue</option>
                              <option value="Steam Grey Band">Steam Grey Band</option>
                              <option value="Gas Yellow Band">Gas Yellow Band</option>
                              <option value="Fire Red Band">Fire Red Band</option>
                              <option value="Slurry Black Band">Slurry Black Band</option>
                            </optgroup>
                          </select>
                        ) : (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={globalSpecs?.customBand2Input || ''}
                              onChange={(e) => onUpdateGlobalSpecs({
                                ...globalSpecs,
                                customBand2Input: e.target.value
                              })}
                              placeholder="Enter band colour"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newColour = globalSpecs?.customBand2Input?.trim();
                                  if (newColour) {
                                    try {
                                      const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                      if (!existing.includes(newColour)) {
                                        existing.push(newColour);
                                        localStorage.setItem('customBandColours', JSON.stringify(existing));
                                      }
                                    } catch (e) {}
                                    onUpdateGlobalSpecs({
                                      ...globalSpecs,
                                      externalBand2Colour: newColour,
                                      showCustomBand2Input: false,
                                      customBand2Input: undefined
                                    });
                                  }
                                }}
                                disabled={!globalSpecs?.customBand2Input?.trim()}
                                className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateGlobalSpecs({
                                  ...globalSpecs,
                                  showCustomBand2Input: false,
                                  customBand2Input: undefined
                                })}
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {/* Paint Specification Summary - shows when primer is selected */}
              {globalSpecs?.externalPrimerType && globalSpecs?.externalPrimerMicrons && !globalSpecs?.externalPaintSpecConfirmed && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      External Paint Specification (Review)
                    </h4>

                    <div className="space-y-1 text-xs">
                      {/* Surface Preparation / Blasting - Always show */}
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700">
                          <span className="font-medium">Surface Prep:</span> {globalSpecs?.externalBlastingGrade || <span className="text-gray-400 italic">Not specified</span>}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-amber-700"><span className="font-medium">Primer:</span> {globalSpecs.externalPrimerType}</span>
                        <span className="font-semibold text-amber-800">{globalSpecs.externalPrimerMicrons} μm</span>
                      </div>

                      {globalSpecs?.externalIntermediateType && globalSpecs?.externalIntermediateMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700"><span className="font-medium">Intermediate:</span> {globalSpecs.externalIntermediateType}</span>
                          <span className="font-semibold text-amber-800">{globalSpecs.externalIntermediateMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && globalSpecs?.externalTopcoatMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700"><span className="font-medium">Topcoat:</span> {globalSpecs.externalTopcoatType}</span>
                          <span className="font-semibold text-amber-800">{globalSpecs.externalTopcoatMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700"><span className="font-medium">Colour:</span> {globalSpecs?.externalTopcoatColour || <span className="text-gray-400 italic">Not specified</span>}</span>
                        </div>
                      )}

                      <div className="flex gap-6 items-center">
                        <span className="text-amber-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-amber-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-amber-300">
                        <span className="font-semibold text-amber-800">Total DFT</span>
                        <span className="font-bold text-amber-900">
                          {(globalSpecs.externalPrimerMicrons || 0) +
                           (globalSpecs.externalIntermediateMicrons || 0) +
                           (globalSpecs.externalTopcoatMicrons || 0)} μm
                        </span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalPaintSpecConfirmed: true,
                          externalCoatingConfirmed: true
                        })}
                        className="px-3 py-1.5 bg-green-600 text-white font-semibold rounded hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 text-xs flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm & Lock
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* LOCKED Paint Specification - Green box when confirmed */}
              {globalSpecs?.externalPaintSpecConfirmed && globalSpecs?.externalPrimerType && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      External Paint Specification (Confirmed)
                    </h4>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700"><span className="font-medium">Surface Prep:</span> {globalSpecs?.externalBlastingGrade || <span className="text-gray-400 italic">Not specified</span>}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-green-700"><span className="font-medium">Primer:</span> {globalSpecs.externalPrimerType}</span>
                        <span className="font-semibold text-green-800">{globalSpecs.externalPrimerMicrons} μm</span>
                      </div>

                      {globalSpecs?.externalIntermediateType && globalSpecs?.externalIntermediateMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-green-700"><span className="font-medium">Intermediate:</span> {globalSpecs.externalIntermediateType}</span>
                          <span className="font-semibold text-green-800">{globalSpecs.externalIntermediateMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && globalSpecs?.externalTopcoatMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-green-700"><span className="font-medium">Topcoat:</span> {globalSpecs.externalTopcoatType}</span>
                          <span className="font-semibold text-green-800">{globalSpecs.externalTopcoatMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && (
                        <div className="flex justify-between items-center">
                          <span className="text-green-700"><span className="font-medium">Colour:</span> {globalSpecs?.externalTopcoatColour || <span className="text-gray-400 italic">Not specified</span>}</span>
                        </div>
                      )}

                      <div className="flex gap-6 items-center">
                        <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-300">
                        <span className="font-semibold text-green-800">Total DFT</span>
                        <span className="font-bold text-green-900">
                          {(globalSpecs.externalPrimerMicrons || 0) +
                           (globalSpecs.externalIntermediateMicrons || 0) +
                           (globalSpecs.externalTopcoatMicrons || 0)} μm
                        </span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalPaintSpecConfirmed: false,
                          externalCoatingConfirmed: false
                        })}
                        className="px-3 py-1.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 text-xs flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Specification
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Internal Lining */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-800 mb-2">Internal Lining</h3>

          {/* Auto-set to Galvanized when external is galvanized */}
          {globalSpecs?.externalCoatingType === 'Galvanized' && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-2 mb-2">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <h4 className="text-xs font-bold text-green-800">Internal: Hot-Dip Galvanized (Auto-set)</h4>
              </div>
              <div className="bg-white rounded p-2 border border-green-300">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-green-600 font-medium">Process:</span> <span className="text-green-800">ISO 1461</span></div>
                  <div><span className="text-green-600 font-medium">Thickness:</span> <span className="text-green-800">45-85 μm</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Material Transfer Profile - Lining Recommendation Assistant */}
          {!globalSpecs?.internalLiningConfirmed && globalSpecs?.externalCoatingType !== 'Galvanized' && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  showMaterialTransferProfile: !globalSpecs?.showMaterialTransferProfile
                })}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs mb-2"
              >
                <svg className={`w-3 h-3 transition-transform ${globalSpecs?.showMaterialTransferProfile ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {globalSpecs?.showMaterialTransferProfile ? 'Hide' : 'Show'} Lining Assistant (ASTM/ISO)
              </button>

              {globalSpecs?.showMaterialTransferProfile && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h4 className="text-sm font-semibold text-indigo-900">Material Transfer Profile</h4>
                  </div>

                  {/* Material Properties */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                      Material Properties
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Particle Size</label>
                        <select
                          value={globalSpecs?.mtpParticleSize || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpParticleSize: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Fine">Fine (&lt;0.5mm D50)</option>
                          <option value="Medium">Medium (0.5–2mm)</option>
                          <option value="Coarse">Coarse (2–10mm)</option>
                          <option value="VeryCoarse">Very Coarse (&gt;10mm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Particle Shape</label>
                        <select
                          value={globalSpecs?.mtpParticleShape || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpParticleShape: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Rounded">Rounded</option>
                          <option value="SubAngular">Sub-Angular</option>
                          <option value="Angular">Angular</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Material Hardness</label>
                        <select
                          value={globalSpecs?.mtpHardnessClass || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpHardnessClass: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (Mohs &lt;4)</option>
                          <option value="Medium">Medium (Mohs 4–6)</option>
                          <option value="High">High (Mohs &gt;6)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Silica Content</label>
                        <select
                          value={globalSpecs?.mtpSilicaContent || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpSilicaContent: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;20%)</option>
                          <option value="Moderate">Moderate (20–50%)</option>
                          <option value="High">High (&gt;50%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Specific Gravity</label>
                        <select
                          value={globalSpecs?.mtpSpecificGravity || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpSpecificGravity: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Light">Light (&lt;2.0)</option>
                          <option value="Medium">Medium (2.0–3.5)</option>
                          <option value="Heavy">Heavy (&gt;3.5)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Chemical Environment */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                      Chemical Environment
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">pH Range</label>
                        <select
                          value={globalSpecs?.mtpPhRange || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpPhRange: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Acidic">Acidic (&lt;5)</option>
                          <option value="Neutral">Neutral (5–9)</option>
                          <option value="Alkaline">Alkaline (&gt;9)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Chloride Level</label>
                        <select
                          value={globalSpecs?.mtpChlorides || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpChlorides: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;100ppm)</option>
                          <option value="Moderate">Moderate (100–500)</option>
                          <option value="High">High (&gt;500ppm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Operating Temp</label>
                        <select
                          value={globalSpecs?.mtpTemperatureRange || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpTemperatureRange: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Ambient">Ambient (&lt;40°C)</option>
                          <option value="Elevated">Elevated (40–80°C)</option>
                          <option value="High">High (&gt;80°C)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Flow & Equipment */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                      Flow & Equipment
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Flow Velocity</label>
                        <select
                          value={globalSpecs?.mtpVelocity || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpVelocity: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;2 m/s)</option>
                          <option value="Medium">Medium (2–4 m/s)</option>
                          <option value="High">High (&gt;4 m/s)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Impact Angle</label>
                        <select
                          value={globalSpecs?.mtpImpactAngle || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpImpactAngle: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;30°)</option>
                          <option value="Mixed">Mixed (30–60°)</option>
                          <option value="High">High (&gt;60°)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Equipment Type</label>
                        <select
                          value={globalSpecs?.mtpEquipmentType || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpEquipmentType: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Pipe">Pipe</option>
                          <option value="Tank">Tank</option>
                          <option value="Chute">Chute</option>
                          <option value="Hopper">Hopper</option>
                          <option value="Launder">Launder</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Solids Conc.</label>
                        <select
                          value={globalSpecs?.mtpSolidsPercent || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpSolidsPercent: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;20%)</option>
                          <option value="Medium">Medium (20–40%)</option>
                          <option value="High">High (40–60%)</option>
                          <option value="VeryHigh">Very High (&gt;60%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Impact Zones?</label>
                        <select
                          value={globalSpecs?.mtpImpactZones === true ? "true" : globalSpecs?.mtpImpactZones === false ? "false" : ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpImpactZones: e.target.value === "true" ? true : e.target.value === "false" ? false : undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="true">Yes (bends, drops)</option>
                          <option value="false">No (straight only)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Display */}
                  {(() => {
                    const profile: MaterialTransferProfile = {
                      material: {
                        particleSize: globalSpecs?.mtpParticleSize as any,
                        particleShape: globalSpecs?.mtpParticleShape as any,
                        specificGravity: globalSpecs?.mtpSpecificGravity as any,
                        hardnessClass: globalSpecs?.mtpHardnessClass as any,
                        silicaContent: globalSpecs?.mtpSilicaContent as any
                      },
                      chemistry: {
                        phRange: globalSpecs?.mtpPhRange as any,
                        chlorides: globalSpecs?.mtpChlorides as any,
                        temperatureRange: globalSpecs?.mtpTemperatureRange as any
                      },
                      flow: {
                        solidsPercent: globalSpecs?.mtpSolidsPercent as any,
                        velocity: globalSpecs?.mtpVelocity as any,
                        impactAngle: globalSpecs?.mtpImpactAngle as any
                      },
                      equipment: {
                        equipmentType: globalSpecs?.mtpEquipmentType as any,
                        impactZones: globalSpecs?.mtpImpactZones
                      }
                    };

                    if (!hasCompleteProfile(profile)) {
                      return (
                        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 text-center">
                            Complete the required fields above to receive a lining recommendation.
                          </p>
                        </div>
                      );
                    }

                    const damage = classifyDamageMechanisms(profile);
                    const recommendation = recommendLining(profile, damage);

                    return (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border-2 border-emerald-300">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h5 className="text-md font-bold text-emerald-900">Recommended Lining</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white rounded-lg p-3 border border-emerald-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Lining Type</div>
                            <div className="text-lg font-bold text-emerald-800">{recommendation.lining}</div>
                            <div className="text-xs text-gray-600 mt-1">{recommendation.thicknessRange}</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-emerald-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Dominant Mechanism</div>
                            <div className="text-md font-semibold text-gray-800">{damage.dominantMechanism}</div>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${damage.abrasion === 'Severe' ? 'bg-red-100 text-red-700' : damage.abrasion === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                Abrasion: {damage.abrasion}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${damage.impact === 'Severe' ? 'bg-red-100 text-red-700' : damage.impact === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                Impact: {damage.impact}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Rationale</div>
                          <p className="text-sm text-gray-700">{recommendation.rationale}</p>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-2">Applicable Standards</div>
                          <div className="flex flex-wrap gap-2">
                            {recommendation.standardsBasis.map((std, i) => (
                              <span key={i} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium">
                                {std}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-2">Engineering Notes</div>
                          <ul className="text-xs text-gray-700 space-y-1">
                            {recommendation.engineeringNotes.map((note, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">•</span>
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => onUpdateGlobalSpecs({
                            ...globalSpecs,
                            internalLiningType: recommendation.liningType
                          })}
                          className="w-full px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Apply Recommendation: {recommendation.liningType}
                        </button>

                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-800">
                            <strong>Engineering Disclaimer:</strong> Lining recommendations are indicative and based on generalized abrasion, impact, and corrosion models aligned with ASTM and ISO test standards. They do not replace site-specific trials, operational history, or manufacturer design verification.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Show dropdown only if no lining confirmed AND external is not galvanized */}
          {!globalSpecs?.internalLiningConfirmed && globalSpecs?.externalCoatingType !== 'Galvanized' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Internal Lining Type
                </label>
                <select
                  value={globalSpecs?.internalLiningType || ''}
                  onChange={(e) => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningType: e.target.value || undefined,
                    // Clear related fields when changing lining type
                    internalPrimerType: undefined,
                    internalPrimerMicrons: undefined,
                    internalIntermediateType: undefined,
                    internalIntermediateMicrons: undefined,
                    internalTopcoatType: undefined,
                    internalTopcoatMicrons: undefined,
                    internalPaintConfirmed: undefined,
                    internalRubberType: undefined,
                    internalRubberThickness: undefined,
                    internalRubberColour: undefined,
                    internalRubberHardness: undefined,
                    internalCeramicType: undefined,
                    internalCeramicShape: undefined,
                    internalCeramicThickness: undefined,
                    internalHdpeMaterialGrade: undefined,
                    internalHdpePressureRating: undefined,
                    internalHdpeSdr: undefined,
                    internalHdpePipeType: undefined,
                    internalPuThickness: undefined,
                    internalPuHardness: undefined
                  })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select lining...</option>
                  <option value="Raw Steel">Raw Steel (No Lining)</option>
                  <option value="Paint">Paint</option>
                  <option value="Rubber Lined">Rubber Lined</option>
                  <option value="Ceramic Lined">Ceramic Lined</option>
                  <option value="HDPE Lined">HDPE Lined</option>
                  <option value="PU Lined">PU Lined</option>
                </select>
              </div>
            </div>
          )}

          {/* Confirmed Non-Paint Internal Lining - Only for simple types without specific boxes */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType &&
           globalSpecs?.internalLiningType !== 'Paint' &&
           globalSpecs?.internalLiningType !== 'Rubber Lined' &&
           globalSpecs?.internalLiningType !== 'Ceramic Lined' &&
           globalSpecs?.internalLiningType !== 'HDPE Lined' &&
           globalSpecs?.internalLiningType !== 'PU Lined' && (
            <div className="bg-green-100 border border-green-400 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{globalSpecs.internalLiningType}</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false
                })}
                className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
              >
                Edit
              </button>
            </div>
          )}

          {/* Confirm button for simple selections (not Paint or Rubber Lined) */}
          {!globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType &&
           globalSpecs?.internalLiningType !== 'Paint' && globalSpecs?.internalLiningType !== 'Rubber Lined' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: true
                })}
                className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
              >
                Confirm Lining
              </button>
            </div>
          )}

          {/* Rubber Lined Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'Rubber Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Rubber Lining Specifications</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Rubber Type</label>
                  <select
                    value={globalSpecs?.internalRubberType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Natural Rubber">Natural</option>
                    <option value="Bromobutyl Rubber">Bromobutyl</option>
                    <option value="Nitrile Rubber (NBR)">Nitrile (NBR)</option>
                    <option value="Neoprene (CR)">Neoprene (CR)</option>
                    <option value="EPDM">EPDM</option>
                    <option value="Chlorobutyl">Chlorobutyl</option>
                    <option value="Hypalon (CSM)">Hypalon (CSM)</option>
                    <option value="Viton (FKM)">Viton (FKM)</option>
                    <option value="Silicone Rubber">Silicone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.internalRubberThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Colour</label>
                  <select
                    value={globalSpecs?.internalRubberColour || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberColour: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                    <option value="Natural (Tan)">Natural</option>
                    <option value="Grey">Grey</option>
                    <option value="Green">Green</option>
                    <option value="Blue">Blue</option>
                    <option value="White">White</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Shore Hardness</label>
                  <select
                    value={globalSpecs?.internalRubberHardness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberHardness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="40">40 Shore A</option>
                    <option value="50">50 Shore A</option>
                    <option value="60">60 Shore A</option>
                    <option value="70">70 Shore A</option>
                  </select>
                </div>
              </div>

              {/* Rubber Lining Summary */}
              {globalSpecs?.internalRubberType && globalSpecs?.internalRubberThickness && globalSpecs?.internalRubberColour && globalSpecs?.internalRubberHardness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">{globalSpecs.internalRubberType}</span> • {globalSpecs.internalRubberThickness}mm • {globalSpecs.internalRubberColour} • {globalSpecs.internalRubberHardness} Shore A
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalLiningConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal Rubber Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'Rubber Lined' && globalSpecs?.internalRubberType && (
            <div className="bg-green-100 border border-green-400 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Rubber Lined: <span className="font-medium">{globalSpecs.internalRubberType}</span> • {globalSpecs.internalRubberThickness}mm • {globalSpecs.internalRubberColour} • {globalSpecs.internalRubberHardness} Shore A
              </div>
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                  internalLiningType: 'Rubber Lined'
                })}
                className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
              >
                Edit
              </button>
            </div>
          )}

          {/* Ceramic Lining Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'Ceramic Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Ceramic Lining Specifications</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Ceramic Type</label>
                  <select
                    value={globalSpecs?.internalCeramicType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalCeramicType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="92% Alumina Ceramic Tiles">92% Alumina</option>
                    <option value="95% Alumina Ceramic Tiles">95% Alumina</option>
                    <option value="96% Alumina Ceramic Tiles">96% Alumina</option>
                    <option value="99% Alumina Ceramic Tiles">99% Alumina</option>
                    <option value="Silicon Carbide Tiles">Silicon Carbide</option>
                    <option value="Zirconia Tiles">Zirconia</option>
                    <option value="Silicon Nitride Tiles">Silicon Nitride</option>
                    <option value="Rubber Embedded Ceramic Tiles">Rubber Embedded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Tile Shape</label>
                  <select
                    value={globalSpecs?.internalCeramicShape || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalCeramicShape: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Square Tile">Square</option>
                    <option value="Hexagon Tiles">Hexagon</option>
                    <option value="Triangular Tiles">Triangular</option>
                    <option value="Flat Liners">Flat Liners</option>
                    <option value="Pipe Sleeves">Pipe Sleeves</option>
                    <option value="Special Moulded Tiles">Special Moulded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.internalCeramicThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalCeramicThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="6">6</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                    <option value="25">25</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              {/* Ceramic Lining Summary */}
              {globalSpecs?.internalCeramicType && globalSpecs?.internalCeramicShape && globalSpecs?.internalCeramicThickness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">{globalSpecs.internalCeramicType}</span> • {globalSpecs.internalCeramicShape} • {globalSpecs.internalCeramicThickness}mm
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalLiningConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal Ceramic Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'Ceramic Lined' && globalSpecs?.internalCeramicType && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{globalSpecs.internalCeramicType}</span> • {globalSpecs.internalCeramicShape} • {globalSpecs.internalCeramicThickness}mm
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'Ceramic Lined'
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* HDPE Lining Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'HDPE Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal HDPE Lining Specifications</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Material Grade</label>
                  <select
                    value={globalSpecs?.internalHdpeMaterialGrade || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpeMaterialGrade: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="PE63">PE63</option>
                    <option value="PE80">PE80</option>
                    <option value="PE100">PE100</option>
                    <option value="PE100-RC">PE100-RC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Pressure Rating</label>
                  <select
                    value={globalSpecs?.internalHdpePressureRating || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpePressureRating: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="PN 2.5">PN 2.5</option>
                    <option value="PN 4">PN 4</option>
                    <option value="PN 6">PN 6</option>
                    <option value="PN 8">PN 8</option>
                    <option value="PN 10">PN 10</option>
                    <option value="PN 12.5">PN 12.5</option>
                    <option value="PN 16">PN 16</option>
                    <option value="PN 20">PN 20</option>
                    <option value="PN 25">PN 25</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">SDR</label>
                  <select
                    value={globalSpecs?.internalHdpeSdr || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpeSdr: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="SDR 41">SDR 41</option>
                    <option value="SDR 26">SDR 26</option>
                    <option value="SDR 17">SDR 17</option>
                    <option value="SDR 13.6">SDR 13.6</option>
                    <option value="SDR 11">SDR 11</option>
                    <option value="SDR 9">SDR 9</option>
                    <option value="SDR 7.4">SDR 7.4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Pipe Type</label>
                  <select
                    value={globalSpecs?.internalHdpePipeType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpePipeType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Solid Wall HDPE Pipe">Solid Wall</option>
                    <option value="Corrugated HDPE Pipe">Corrugated</option>
                    <option value="Slitted HDPE Pipe">Slitted</option>
                    <option value="Sleeve HDPE for Steel Lining">Sleeve for Steel</option>
                  </select>
                </div>
              </div>

              {/* HDPE Lining Summary */}
              {globalSpecs?.internalHdpeMaterialGrade && globalSpecs?.internalHdpePressureRating && globalSpecs?.internalHdpeSdr && globalSpecs?.internalHdpePipeType && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">{globalSpecs.internalHdpeMaterialGrade}</span> • {globalSpecs.internalHdpePressureRating} • {globalSpecs.internalHdpeSdr} • {globalSpecs.internalHdpePipeType}
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalLiningConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal HDPE Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'HDPE Lined' && globalSpecs?.internalHdpeMaterialGrade && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{globalSpecs.internalHdpeMaterialGrade}</span> • {globalSpecs.internalHdpePressureRating} • {globalSpecs.internalHdpeSdr} • {globalSpecs.internalHdpePipeType}
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'HDPE Lined'
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* PU Lining Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'PU Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal PU Lining Specifications</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.internalPuThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPuThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                    <option value="25">25</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Shore Hardness</label>
                  <select
                    value={globalSpecs?.internalPuHardness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPuHardness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="40">40 Shore A</option>
                    <option value="50">50 Shore A</option>
                    <option value="60">60 Shore A</option>
                    <option value="70">70 Shore A</option>
                    <option value="80">80 Shore A</option>
                    <option value="90">90 Shore A</option>
                  </select>
                </div>
              </div>

              {/* PU Lining Summary */}
              {globalSpecs?.internalPuThickness && globalSpecs?.internalPuHardness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">PU Lining:</span> {globalSpecs.internalPuThickness}mm • {globalSpecs.internalPuHardness} Shore A
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalLiningConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal PU Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'PU Lined' && globalSpecs?.internalPuThickness && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">PU Lining:</span> {globalSpecs.internalPuThickness}mm • {globalSpecs.internalPuHardness} Shore A
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'PU Lined'
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Confirmed Internal Paint Specification - Always visible when confirmed */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'Paint' && globalSpecs?.internalPrimerType && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Internal Paint Specification (Confirmed)
              </h4>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-green-700"><span className="font-medium">Primer:</span> {globalSpecs.internalPrimerType}</span>
                  <span className="font-semibold text-green-800">{globalSpecs.internalPrimerMicrons} μm</span>
                </div>

                {globalSpecs?.internalIntermediateType && globalSpecs?.internalIntermediateMicrons && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Intermediate:</span> {globalSpecs.internalIntermediateType}</span>
                    <span className="font-semibold text-green-800">{globalSpecs.internalIntermediateMicrons} μm</span>
                  </div>
                )}

                {globalSpecs?.internalTopcoatType && globalSpecs?.internalTopcoatMicrons && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Topcoat:</span> {globalSpecs.internalTopcoatType}</span>
                    <span className="font-semibold text-green-800">{globalSpecs.internalTopcoatMicrons} μm</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-300">
                  <span className="font-semibold text-green-800">Total DFT</span>
                  <span className="font-bold text-green-900">
                    {(globalSpecs.internalPrimerMicrons || 0) +
                     (globalSpecs.internalIntermediateMicrons || 0) +
                     (globalSpecs.internalTopcoatMicrons || 0)} μm
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'Paint'
                  })}
                  className="px-3 py-1.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 text-xs flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Specification
                </button>
              </div>
            </div>
          )}

          {/* Paint Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'Paint' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Paint Specifications</h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer Type</label>
                  <select
                    value={globalSpecs?.internalPrimerType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPrimerType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Epoxy Primer">Epoxy Primer</option>
                    <option value="Phenolic Epoxy">Phenolic Epoxy</option>
                    <option value="Novolac Epoxy">Novolac Epoxy</option>
                    <option value="Coal Tar Epoxy">Coal Tar Epoxy</option>
                    <option value="Polyurethane Primer">PU Primer</option>
                    <option value="Zinc Phosphate Epoxy">Zinc Phosphate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer (μm)</label>
                  <input
                    type="number"
                    value={globalSpecs?.internalPrimerMicrons || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPrimerMicrons: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="50-75"
                    min="0"
                    max="500"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate</label>
                  <select
                    value={globalSpecs?.internalIntermediateType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalIntermediateType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">None</option>
                    <option value="High Build Epoxy">High Build Epoxy</option>
                    <option value="Glass Flake Epoxy">Glass Flake Epoxy</option>
                    <option value="Phenolic Epoxy">Phenolic Epoxy</option>
                    <option value="Novolac Epoxy">Novolac Epoxy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {globalSpecs?.internalIntermediateType && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate (μm)</label>
                    <input
                      type="number"
                      value={globalSpecs?.internalIntermediateMicrons || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalIntermediateMicrons: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="125-200"
                      min="0"
                      max="500"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat</label>
                  <select
                    value={globalSpecs?.internalTopcoatType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalTopcoatType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">None</option>
                    <option value="Epoxy Topcoat">Epoxy Topcoat</option>
                    <option value="Phenolic Epoxy">Phenolic Epoxy</option>
                    <option value="Novolac Epoxy">Novolac Epoxy</option>
                    <option value="Polyurethane">Polyurethane</option>
                  </select>
                </div>

                {globalSpecs?.internalTopcoatType && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat (μm)</label>
                    <input
                      type="number"
                      value={globalSpecs?.internalTopcoatMicrons || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalTopcoatMicrons: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="50-75"
                      min="0"
                      max="500"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Paint Specification Summary - shows when primer is selected */}
              {globalSpecs?.internalPrimerType && globalSpecs?.internalPrimerMicrons && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-amber-800">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Review:</span>
                        <span>{globalSpecs.internalPrimerType} ({globalSpecs.internalPrimerMicrons}μm)</span>
                        {globalSpecs?.internalIntermediateType && globalSpecs?.internalIntermediateMicrons && (
                          <span>• {globalSpecs.internalIntermediateType} ({globalSpecs.internalIntermediateMicrons}μm)</span>
                        )}
                        {globalSpecs?.internalTopcoatType && globalSpecs?.internalTopcoatMicrons && (
                          <span>• {globalSpecs.internalTopcoatType} ({globalSpecs.internalTopcoatMicrons}μm)</span>
                        )}
                        <span className="font-semibold ml-1">= {(globalSpecs.internalPrimerMicrons || 0) + (globalSpecs.internalIntermediateMicrons || 0) + (globalSpecs.internalTopcoatMicrons || 0)}μm DFT</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          internalLiningConfirmed: true
                        })}
                        className="px-3 py-1 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

            {/* Confirm Surface Protection Button - Only show when not all confirmed */}
            {(!globalSpecs?.externalCoatingConfirmed || !globalSpecs?.internalLiningConfirmed) && (globalSpecs?.externalCoatingType || globalSpecs?.internalLiningType) && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: true,
                    internalLiningConfirmed: true,
                    surfaceProtectionConfirmed: true
                  })}
                  disabled={!globalSpecs?.externalCoatingType}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Surface Protection
                </button>
              </div>
            )}
          </div>
        )}


        {/* HDPE Pipes & Fittings Section */}
        {showHdpePipes && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">🔵</span>
              <h3 className="text-xl font-bold text-gray-900">HDPE Pipes & Fittings</h3>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-blue-800">Coming Soon</h4>
              </div>
              <p className="text-blue-700 text-sm">
                HDPE pipe specifications and configuration options will be available in a future update.
                This will include PE grades, SDR ratings, fusion joint specifications, and more.
              </p>
            </div>
          </div>
        )}

        {/* PVC Pipes & Fittings Section */}
        {showPvcPipes && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">⚪</span>
              <h3 className="text-xl font-bold text-gray-900">PVC Pipes & Fittings</h3>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-gray-800">Coming Soon</h4>
              </div>
              <p className="text-gray-700 text-sm">
                PVC pipe specifications and configuration options will be available in a future update.
                This will include PVC grades, pressure classes, joint types, and more.
              </p>
            </div>
          </div>
        )}

        {/* Nuts, Bolts, Washers & Gaskets Section */}
        {showFastenersGaskets && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">⚙️</span>
              <h3 className="text-xl font-bold text-gray-900">Nuts, Bolts, Washers & Gaskets</h3>
            </div>

            {/* Confirmed Fasteners & Gaskets */}
            {globalSpecs?.fastenersConfirmed && globalSpecs?.boltGrade && globalSpecs?.gasketType && (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Bolts:</span> {globalSpecs.boltGrade} <span className="mx-2">•</span> <span className="font-medium">Gasket:</span> {globalSpecs.gasketType}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      fastenersConfirmed: false
                    })}
                    className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Selection UI - Only show when not confirmed */}
            {!globalSpecs?.fastenersConfirmed && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bolt/Nut/Washer Grade Selection */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Bolt, Nut & Washer Grade
                    </label>
                    <select
                      value={globalSpecs?.boltGrade || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        boltGrade: e.target.value || undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    >
                      <option value="">Select bolt grade...</option>
                      <optgroup label="Carbon Steel (Standard Temperature)">
                        <option value="B7/2H">ASTM A193 B7 / A194 2H (Standard, -40°C to 400°C)</option>
                        <option value="B7/2H-HDG">ASTM A193 B7 / A194 2H - Hot Dip Galvanized</option>
                        <option value="B16/4">ASTM A193 B16 / A194 4 (High Temperature, to 540°C)</option>
                      </optgroup>
                      <optgroup label="Low Temperature Service">
                        <option value="B7M/2HM">ASTM A320 B7M / A194 2HM (-100°C to 200°C)</option>
                        <option value="L7/7">ASTM A320 L7 / A194 7 (-100°C to 200°C)</option>
                        <option value="L7M/7M">ASTM A320 L7M / A194 7M (-100°C to 200°C)</option>
                        <option value="L43/7">ASTM A320 L43 / A194 7 (to -100°C)</option>
                      </optgroup>
                      <optgroup label="Stainless Steel">
                        <option value="B8/8">ASTM A193 B8 / A194 8 (304 SS)</option>
                        <option value="B8M/8M">ASTM A193 B8M / A194 8M (316 SS)</option>
                        <option value="B8C/8C">ASTM A193 B8C / A194 8C (347 SS)</option>
                        <option value="B8T/8T">ASTM A193 B8T / A194 8T (321 SS)</option>
                      </optgroup>
                      <optgroup label="High Alloy / Special">
                        <option value="B8S/8S">ASTM A193 B8S / A194 8S (Duplex 2205)</option>
                        <option value="Monel">Monel 400/K-500</option>
                        <option value="Inconel">Inconel 625/718</option>
                      </optgroup>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Grade selection affects temperature range and corrosion resistance
                    </p>
                  </div>

                  {/* Gasket Type Selection */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Gasket Type & Thickness
                    </label>
                    <select
                      value={globalSpecs?.gasketType || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        gasketType: e.target.value || undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    >
                      <option value="">Select gasket type...</option>
                      <optgroup label="Spiral Wound (ASME B16.20)">
                        <option value="SW-CGI-316">Spiral Wound - CGI/316SS - 3.2mm (Standard)</option>
                        <option value="SW-CGI-316-IR">Spiral Wound - CGI/316SS with Inner Ring - 3.2mm</option>
                        <option value="SW-Graphite-316">Spiral Wound - Graphite/316SS - 4.5mm (High Temp)</option>
                        <option value="SW-PTFE-316">Spiral Wound - PTFE/316SS - 3.2mm (Chemical Service)</option>
                      </optgroup>
                      <optgroup label="Ring Joint (RTJ) - ASME B16.20">
                        <option value="RTJ-R-SS">RTJ Ring - Soft Iron/SS 304 (R-Series)</option>
                        <option value="RTJ-RX-SS">RTJ Ring - SS 316 (RX-Series, High Pressure)</option>
                        <option value="RTJ-BX-SS">RTJ Ring - SS 316 (BX-Series, API 6A)</option>
                        <option value="RTJ-R-Inconel">RTJ Ring - Inconel 625 (High Temp/Corrosive)</option>
                      </optgroup>
                      <optgroup label="Non-Metallic">
                        <option value="PTFE-1.5">PTFE Sheet - 1.5mm (Chemical Service)</option>
                        <option value="PTFE-3.0">PTFE Sheet - 3.0mm (Chemical Service)</option>
                        <option value="Graphite-1.5">Flexible Graphite - 1.5mm (High Temp to 450°C)</option>
                        <option value="Graphite-3.0">Flexible Graphite - 3.0mm (High Temp to 450°C)</option>
                        <option value="CAF-1.5">Compressed Asbestos Free (CAF) - 1.5mm</option>
                        <option value="CAF-3.0">Compressed Asbestos Free (CAF) - 3.0mm</option>
                      </optgroup>
                      <optgroup label="Rubber/Elastomer">
                        <option value="EPDM-3.0">EPDM Rubber - 3.0mm (Water/Steam)</option>
                        <option value="NBR-3.0">Nitrile (NBR) - 3.0mm (Oil/Fuel)</option>
                        <option value="Viton-3.0">Viton (FKM) - 3.0mm (Chemical/High Temp)</option>
                        <option value="Neoprene-3.0">Neoprene - 3.0mm (General Purpose)</option>
                      </optgroup>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Select based on pressure class, temperature, and media compatibility
                    </p>
                  </div>
                </div>

                {/* Info note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-amber-700 text-xs">
                      Bolt quantities and dimensions will be automatically calculated based on your flange selections per ASME B16.5/B16.47 standards.
                    </p>
                  </div>
                </div>

                {/* Confirm Button */}
                {globalSpecs?.boltGrade && globalSpecs?.gasketType && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        fastenersConfirmed: true
                      })}
                      className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      Confirm Fasteners & Gaskets
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Transportation & Installation Section */}
        {showTransportInstall && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">🚚</span>
              <h3 className="text-xl font-bold text-gray-900">Transportation & Installation</h3>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-green-800">Coming Soon</h4>
              </div>
              <p className="text-green-700 text-sm">
                Transportation and installation specifications will be available in a future update.
                This will include delivery requirements, site logistics, installation services, and more.
              </p>
            </div>
          </div>
        )}

        {/* No Products Selected Warning */}
        {!showSteelPipes && !showFastenersGaskets && !showHdpePipes && !showPvcPipes && !showStructuralSteel && !showSurfaceProtection && !showTransportInstall && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-lg font-semibold text-yellow-800">No Products Selected</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Please go back to Stage 1 and select at least one product or service type to configure specifications.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Material Suitability Warning Modal */}
        {materialWarning.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-red-600 px-6 py-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-white">Material Not Recommended</h3>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-gray-800 font-medium mb-3">
                  <span className="font-bold">{materialWarning.specName}</span> is not recommended for the selected operating conditions:
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                    {materialWarning.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>

                {materialWarning.limits && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{materialWarning.specName}</span> limits:
                    </p>
                    <ul className="text-sm text-gray-600 mt-1">
                      <li>Temperature: {materialWarning.limits.minTempC}°C to {materialWarning.limits.maxTempC}°C</li>
                      <li>Max Pressure: {materialWarning.limits.maxPressureBar} bar</li>
                      <li>Type: {materialWarning.limits.type}</li>
                    </ul>
                  </div>
                )}

                {materialWarning.recommendation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Recommendation:</span> {materialWarning.recommendation}
                    </p>
                  </div>
                )}

                <p className="text-gray-600 text-sm">
                  Do you want to proceed with this material anyway?
                </p>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => setMaterialWarning({ show: false, specName: '', specId: undefined, warnings: [] })}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-sm"
                >
                  Cancel - Select Different Material
                </button>
                <button
                  onClick={async () => {
                    // User chose to proceed despite warning
                    const newSpecId = materialWarning.specId;
                    let recommendedPressureClassId = globalSpecs?.flangePressureClassId;

                    if (newSpecId && globalSpecs?.flangeStandardId && globalSpecs?.workingPressureBar) {
                      const newSteelSpec = masterData.steelSpecs?.find((s: any) => s.id === newSpecId);
                      const materialGroup = getFlangeMaterialGroup(newSteelSpec?.steelSpecName);
                      recommendedPressureClassId = await fetchAndSelectPressureClass(
                        globalSpecs.flangeStandardId, globalSpecs.workingPressureBar, globalSpecs.workingTemperatureC, materialGroup
                      );
                    }

                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      steelSpecificationId: newSpecId,
                      flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                    });

                    setMaterialWarning({ show: false, specName: '', specId: undefined, warnings: [] });
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemUploadStep({ entries, globalSpecs, masterData, onAddEntry, onAddBendEntry, onAddFittingEntry, onUpdateEntry, onRemoveEntry, onCalculate, onCalculateBend, onCalculateFitting, errors, loading, fetchAvailableSchedules, availableSchedulesMap, setAvailableSchedulesMap, fetchBendOptions, bendOptionsCache, autoSelectFlangeSpecs, requiredProducts = [] }: any) {
  // State for hiding/showing 3D drawings per item
  const [hiddenDrawings, setHiddenDrawings] = React.useState<Record<string, boolean>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const processedEntriesRef = useRef<Set<string>>(new Set());
  // Track entries that have been manually updated by onChange - these should NOT be overwritten by useEffect
  const manuallyUpdatedEntriesRef = useRef<Set<string>>(new Set());
  const [availableNominalBores, setAvailableNominalBores] = useState<number[]>([]);
  const [isLoadingNominalBores, setIsLoadingNominalBores] = useState(false);

  // Fallback NB ranges for each steel specification type
  // Based on industry standards:
  // - SABS/SANS 62: Small bore ERW pipes up to 150mm (South African standard)
  // - SABS/SANS 719: Large bore ERW pipes from 200mm and above (South African standard)
  // - ASTM A106: Seamless carbon steel, full range
  // - ASTM A53: Welded and seamless, full range
  // - API 5L: Line pipe, full range including large sizes
  // - ASTM A333: Low temperature service, similar to A106
  // - ASTM A179/A192: Heat exchanger tubes, smaller sizes
  // - ASTM A500: Structural tubing
  // - ASTM A335: Alloy steel for high temp
  // - ASTM A312: Stainless steel pipe
  const STEEL_SPEC_NB_FALLBACK: Record<string, number[]> = {
    // South African Standards - SABS/SANS 62 (Small bore up to 150mm)
    'SABS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
    'SANS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
    // South African Standards - SABS/SANS 719 (Large bore from 200mm)
    'SABS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    'SANS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    // ASTM A106 - Seamless Carbon Steel (full standard range)
    'ASTM A106': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // ASTM A53 - Welded and Seamless (full standard range)
    'ASTM A53': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // API 5L - Line Pipe (wide range including large sizes)
    'API 5L': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    // ASTM A333 - Low Temperature Service
    'ASTM A333': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // ASTM A179 - Heat Exchanger Tubes (smaller sizes)
    'ASTM A179': [15, 20, 25, 32, 40, 50, 65, 80, 100],
    // ASTM A192 - Boiler Tubes (smaller sizes)
    'ASTM A192': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125],
    // ASTM A500 - Structural Tubing
    'ASTM A500': [25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500],
    // ASTM A335 - Alloy Steel for High Temperature
    'ASTM A335': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // ASTM A312 - Stainless Steel Pipe
    'ASTM A312': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  };

  // Get fallback NBs based on steel spec name
  const getFallbackNBsForSteelSpec = (steelSpecName: string): number[] | null => {
    if (!steelSpecName) return null;

    // Check each key pattern
    for (const [pattern, nbs] of Object.entries(STEEL_SPEC_NB_FALLBACK)) {
      if (steelSpecName.includes(pattern)) {
        return nbs;
      }
    }
    return null;
  };

  // Use nominal bores from master data, fallback to hardcoded values
  // Remove duplicates using Set and sort
  // Handle both snake_case (from API) and camelCase (from fallback data) property names
  const allNominalBores = (masterData.nominalBores?.length > 0
    ? Array.from(new Set(masterData.nominalBores.map((nb: any) => (nb.nominal_diameter_mm ?? nb.nominalDiameterMm) as number))).sort((a, b) => (a as number) - (b as number))
    : [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000]) as number[]; // fallback values

  // Filter available NB sizes based on the selected steel specification
  // Uses the STEEL_SPEC_NB_FALLBACK mapping to ensure correct NB ranges for each steel type
  useEffect(() => {
    const steelSpecId = globalSpecs?.steelSpecificationId;

    if (!steelSpecId) {
      // No steel spec selected, show all NBs
      console.log('[ItemUploadStep] No steel spec selected, showing all NBs');
      setAvailableNominalBores(allNominalBores);
      return;
    }

    // Get the steel spec name for lookup
    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === steelSpecId);
    const steelSpecName = steelSpec?.steelSpecName || '';

    console.log(`[ItemUploadStep] Steel spec selected: ${steelSpecId} - "${steelSpecName}"`);

    // ALWAYS use the fallback mapping based on steel spec name
    // This ensures proper filtering (e.g., SABS 719 only shows 200mm+)
    const filteredNBs = getFallbackNBsForSteelSpec(steelSpecName);

    if (filteredNBs && filteredNBs.length > 0) {
      console.log(`[ItemUploadStep] Filtered NBs for "${steelSpecName}":`, filteredNBs);
      setAvailableNominalBores(filteredNBs);
    } else {
      // No specific mapping found - show all NBs as fallback
      console.log(`[ItemUploadStep] No NB mapping for "${steelSpecName}", showing all NBs`);
      setAvailableNominalBores(allNominalBores);
    }
  }, [globalSpecs?.steelSpecificationId, masterData.steelSpecs]);

  // Use filtered NB list for the dropdown
  const nominalBores = availableNominalBores.length > 0 ? availableNominalBores : allNominalBores;

  // Check for potentially invalid schedules - these are now supported so removing this warning
  // const hasInvalidSchedules = entries.some((entry: StraightPipeEntry) => {
  //   const schedule = entry.specs.scheduleNumber;
  //   return schedule && (schedule === 'Sch10' || schedule === 'Sch20' || schedule === 'Sch30' || schedule === 'Sch5');
  // });

  const fixInvalidSchedules = () => {
    // This function is no longer needed since we support all standard schedules
    // entries.forEach((entry: StraightPipeEntry) => {
    //   const schedule = entry.specs.scheduleNumber;
    //   if (schedule === 'Sch10' || schedule === 'Sch20' || schedule === 'Sch30' || schedule === 'Sch5') {
    //     onUpdateEntry(entry.id, {
    //       specs: { ...entry.specs, scheduleNumber: 'STD' } // Default to STD
    //     });
    //   }
    // });
    // alert('Invalid schedules have been changed to STD. Please review and adjust if needed.');
  };

  const handleCalculateAll = async () => {
    setIsCalculating(true);
    try {
      await onCalculate();
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const formatWeight = (weight: number | undefined) => {
    if (weight === undefined) return 'Not calculated';
    return `${weight.toFixed(2)} kg`;
  };

  const getTotalWeight = () => {
    // Check if BNW should be included
    const showBnw = requiredProducts.includes('fasteners_gaskets');

    return entries.reduce((total: number, entry: StraightPipeEntry) => {
      const entryTotal = (entry.calculation?.totalSystemWeight || 0);

      // Add BNW and gasket weights if applicable
      let bnwWeight = 0;
      let gasketWeight = 0;
      if (showBnw) {
        const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
        const flangesPerPipe = getFlangesPerPipe(pipeEndConfig);
        const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0;

        if (flangesPerPipe > 0 && qty > 0) {
          const pressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
          const pressureClass = pressureClassId
            ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
            : 'PN16';
          const nbMm = entry.specs?.nominalBoreMm || 100;
          const bnwInfo = getBnwSetInfo(nbMm, pressureClass || 'PN16');
          const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
          bnwWeight = bnwWeightPerSet * qty;

          // Add gasket weight
          if (globalSpecs?.gasketType) {
            const singleGasketWeight = getGasketWeight(globalSpecs.gasketType, nbMm);
            gasketWeight = singleGasketWeight * qty;
          }
        }
      }

      return total + entryTotal + bnwWeight + gasketWeight;
    }, 0);
  };

  const generateItemDescription = (entry: any) => {
    // Handle bend items
    if (entry.itemType === 'bend') {
      const nb = entry.specs?.nominalBoreMm || 'XX';
      const schedule = entry.specs?.scheduleNumber || 'XX';
      const bendType = entry.specs?.bendType || 'X.XD';
      const bendAngle = entry.specs?.bendDegrees || 'XX';
      const pressure = globalSpecs?.workingPressureBar || entry.specs?.workingPressureBar || 'XX';
      
      // Get steel spec name if available
      const steelSpec = entry.specs?.steelSpecificationId 
        ? masterData.steelSpecs.find((s: any) => s.id === entry.specs.steelSpecificationId)?.steelSpecName
        : globalSpecs?.steelSpecificationId
          ? masterData.steelSpecs.find((s: any) => s.id === globalSpecs.steelSpecificationId)?.steelSpecName
          : undefined;
      
      let description = `${nb}NB Sch${schedule} ${bendAngle}° ${bendType} Bend for ${pressure} Bar Pipeline`;
      
      // Add tangent/stub info if present
      const numTangents = entry.specs?.numberOfTangents || 0;
      const numStubs = entry.specs?.numberOfStubs || 0;
      if (numTangents > 0 || numStubs > 0) {
        const parts = [];
        if (numTangents > 0) parts.push(`${numTangents} Tangent${numTangents > 1 ? 's' : ''}`);
        if (numStubs > 0) parts.push(`${numStubs} Stub${numStubs > 1 ? 's' : ''}`);
        description += ` with ${parts.join(' & ')}`;
      }
      
      if (steelSpec) {
        description += ` - ${steelSpec}`;
      }
      
      return description;
    }
    
    // Handle straight pipe items
    const nb = entry.specs.nominalBoreMm || 'XX';
    let schedule = entry.specs.scheduleNumber || (entry.specs.wallThicknessMm ? `${entry.specs.wallThicknessMm}WT` : 'XX');
    const wallThickness = entry.specs.wallThicknessMm;
    const pipeLength = entry.specs.individualPipeLength;
    const pipeEndConfig = entry.specs.pipeEndConfiguration || 'PE';

    if(schedule.startsWith('Sch')){
      schedule = schedule.substring(3);
    }

    // Convert pipe end config to flange display format
    const getFlangeDisplay = (config: string): string => {
      switch (config) {
        case 'FOE': return '1X R/F';
        case 'FBE': return '2X R/F';
        case 'FOE_LF': return '1X R/F, 1X L/F';
        case 'FOE_RF': return '2X R/F';
        case '2X_RF': return '2X R/F';
        case 'PE':
        default: return '';
      }
    };

    // Get flange standard and pressure class
    const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
    const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
    const flangeStandard = flangeStandardId
      ? masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code
      : '';
    const pressureClass = flangePressureClassId
      ? masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId)?.designation
      : '';

    // Build description: 500NB Sch10 6.35mm Pipe, 12.192Lg, 2X R/F, SABS 1123 1000/3
    let description = `${nb}NB Sch${schedule}`;

    // Add wall thickness if available
    if (wallThickness) {
      description += ` ${wallThickness}mm`;
    }

    description += ' Pipe';

    // Add pipe length if available
    if (pipeLength) {
      description += `, ${pipeLength}Lg`;
    }

    // Add flange configuration if not plain ended
    const flangeDisplay = getFlangeDisplay(pipeEndConfig);
    if (flangeDisplay) {
      description += `, ${flangeDisplay}`;
    }

    // Add flange spec and class if available and has flanges
    if (flangeDisplay && flangeStandard && pressureClass) {
      description += `, ${flangeStandard} ${pressureClass}`;
    }

    return description;
  };

  // Update item descriptions when globalSpecs.workingPressureBar changes
  useEffect(() => {
    if (globalSpecs?.workingPressureBar) {
      entries.forEach((entry: any) => {
        // Only update if the entry has required specs and a description
        if (entry.specs?.nominalBoreMm && entry.description) {
          const newDescription = generateItemDescription(entry);
          // Only update if description actually changed
          if (newDescription !== entry.description) {
            console.log(`[Description Update] Updating description for entry ${entry.id} with new pressure: ${globalSpecs.workingPressureBar} bar`);
            onUpdateEntry(entry.id, { description: newDescription });
          }
        }
      });
    }
  }, [globalSpecs?.workingPressureBar]);

  // Auto-calculate schedule and wall thickness when pressure and NB are available
  // Uses the new ASME B31.3 pipe schedule API for accurate pressure/temperature-based recommendations
  const autoCalculateSpecs = async (entry: any) => {
    const pressure = globalSpecs?.workingPressureBar;
    const nominalBore = entry.specs.nominalBoreMm;
    const temperature = entry.specs.workingTemperatureC || globalSpecs?.workingTemperatureC || 20;

    console.log('🔍 Auto-calculating specs using ASME B31.3:', { pressure, nominalBore, temperature });

    if (pressure && nominalBore) {
      try {
        const { pipeScheduleApi } = await import('@/app/lib/api/client');

        console.log('📡 Calling pipe-schedule API with:', {
          nbMm: nominalBore,
          pressureBar: pressure,
          temperatureCelsius: temperature
        });

        const recommended = await pipeScheduleApi.recommend({
          nbMm: nominalBore,
          pressureBar: pressure,
          temperatureCelsius: temperature,
          materialCode: 'ASTM_A106_Grade_B', // Default to carbon steel A106 Grade B
        });

        console.log('✅ Pipe schedule API returned:', recommended);

        // Also get available schedules for upgrade options
        let availableUpgrades: any[] = [];
        try {
          const allSchedules = await pipeScheduleApi.getSchedulesByNb(nominalBore);
          // Filter schedules that are thicker than the recommended one
          availableUpgrades = allSchedules
            .filter((s: any) => s.wallThicknessMm > recommended.recommendedWallMm)
            .map((s: any) => ({
              id: s.id,
              schedule_designation: s.schedule,
              wall_thickness_mm: s.wallThicknessMm
            }));
        } catch (err) {
          console.log('Could not fetch upgrade schedules:', err);
        }

        // CRITICAL FIX: Always use fallback schedule data for the schedule name
        // Find the lightest schedule that meets the minimum wall thickness requirement
        const fallbackSchedules = FALLBACK_PIPE_SCHEDULES[nominalBore] || [];
        const minWT = recommended.minRequiredThicknessMm;

        const eligibleSchedules = fallbackSchedules
          .filter(s => s.wallThicknessMm >= minWT)
          .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

        let finalScheduleName: string;
        let finalWT: number;

        if (eligibleSchedules.length > 0) {
          finalScheduleName = eligibleSchedules[0].scheduleDesignation;
          finalWT = eligibleSchedules[0].wallThicknessMm;
          console.log(`🔄 Using fallback schedule: ${finalScheduleName} (${finalWT}mm) for minWT=${minWT.toFixed(2)}mm`);
        } else if (fallbackSchedules.length > 0) {
          // No schedule meets requirements - use thickest available
          const sorted = [...fallbackSchedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
          finalScheduleName = sorted[0].scheduleDesignation;
          finalWT = sorted[0].wallThicknessMm;
          console.warn(`⚠️ No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${finalScheduleName} (${finalWT}mm)`);
        } else {
          // No fallback data - use API values as last resort
          finalScheduleName = recommended.recommendedSchedule;
          finalWT = recommended.recommendedWallMm;
          console.warn(`⚠️ No fallback data for ${nominalBore}mm, using API: ${finalScheduleName}`);
        }

        return {
          scheduleNumber: finalScheduleName,
          wallThicknessMm: finalWT,
          workingPressureBar: pressure,
          minimumSchedule: finalScheduleName,
          minimumWallThickness: minWT,
          availableUpgrades: availableUpgrades,
          isScheduleOverridden: false,
          scheduleWarnings: recommended.warnings
        };
      } catch (error) {
        // Silently handle API errors - fallback calculation will be used
        // Only log for debugging (not as error)
        console.log('ℹ️ Pipe schedule API unavailable, using Barlow formula fallback');

        // Fallback to Barlow formula calculation for ASTM A106 Grade B carbon steel
        // Barlow formula: t = (P × D) / (2 × S × E)
        // Where: P = pressure (bar), D = OD (mm), S = allowable stress (MPa), E = joint efficiency
        // For ASTM A106 Gr B: S ≈ 137.9 MPa (20,000 psi) at ambient, E = 1.0 for seamless
        // Simplified: t_min = (P_bar × 0.1 × OD_mm) / (2 × 137.9 × 1.0)

        // OD lookup based on NB (approximate values)
        const odLookup: Record<number, number> = {
          100: 114.3, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
          350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6
        };
        const od = odLookup[nominalBore] || (nominalBore * 1.05); // Fallback estimate

        // Calculate minimum wall thickness using Barlow formula with safety factor
        const pressureMpa = pressure * 0.1; // Convert bar to MPa
        const allowableStress = 137.9; // MPa for A106 Gr B
        const jointEfficiency = 1.0;
        const safetyFactor = 1.2; // Add 20% safety margin
        const minWallThickness = (pressureMpa * od * safetyFactor) / (2 * allowableStress * jointEfficiency);

        console.log(`🔧 Barlow calculation: ${minWallThickness.toFixed(2)}mm min WT for ${nominalBore}NB (OD=${od}mm) at ${pressure} bar`);

        // Find the best matching schedule from fallback data
        const fallbackSchedules = FALLBACK_PIPE_SCHEDULES[nominalBore] || [];
        let matchedSchedule = null;
        let matchedWT = minWallThickness;

        if (fallbackSchedules.length > 0) {
          // Find the first schedule that meets or exceeds minimum wall thickness
          const eligibleSchedules = fallbackSchedules
            .filter(s => s.wallThicknessMm >= minWallThickness)
            .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

          if (eligibleSchedules.length > 0) {
            matchedSchedule = eligibleSchedules[0].scheduleDesignation;
            matchedWT = eligibleSchedules[0].wallThicknessMm;
          } else {
            // Use thickest available if none meet minimum
            const sorted = [...fallbackSchedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
            matchedSchedule = sorted[0].scheduleDesignation;
            matchedWT = sorted[0].wallThicknessMm;
          }
        }

        console.log(`🔧 Fallback matched schedule: ${matchedSchedule} (${matchedWT}mm) for min ${minWallThickness.toFixed(2)}mm`);

        return {
          scheduleNumber: matchedSchedule,
          wallThicknessMm: matchedWT,
          workingPressureBar: pressure,
          minimumSchedule: matchedSchedule,
          minimumWallThickness: minWallThickness,
          availableUpgrades: [],
          isScheduleOverridden: false
        };
      }
    } else {
      console.log('⚠️ Skipping auto-calculation - missing pressure or nominal bore:', { pressure, nominalBore });
    }
    return {};
  };

  // Pre-fetch available schedules for entries that have NB set
  // NOTE: This effect only fetches schedules - it does NOT update the entry's scheduleNumber
  // The NB onChange handler is responsible for setting the schedule when user selects NB
  useEffect(() => {
    const prefetchSchedules = async () => {
      if (!masterData.nominalBores?.length) return;

      for (const entry of entries) {
        if (entry.itemType !== 'straight_pipe' && entry.itemType !== undefined) continue;

        const nominalBore = entry.specs?.nominalBoreMm;
        if (!nominalBore) continue;

        // Only fetch if we don't already have schedules for this entry
        if (availableSchedulesMap[entry.id]?.length > 0) continue;

        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
        await fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
      }
    };

    prefetchSchedules();
  }, [masterData.nominalBores?.length]);

  const calculateQuantities = (entry: any, field: string, value: number) => {
    const pipeLength = entry.specs.individualPipeLength || 12.192;
    
    if (field === 'totalLength') {
      // User changed total length -> calculate quantity
      const quantity = Math.ceil(value / pipeLength);
      return {
        ...entry,
        specs: {
          ...entry.specs,
          quantityValue: value,
          quantityType: 'total_length'
        },
        calculatedPipes: quantity
      };
    } else if (field === 'numberOfPipes') {
      // User changed quantity -> calculate total length
      const totalLength = value * pipeLength;
      return {
        ...entry,
        specs: {
          ...entry.specs,
          quantityValue: value,  // Store number of pipes
          quantityType: 'number_of_pipes'  // Set correct type
        },
        calculatedPipes: value
      };
    }
    return entry;
  };

  return (
    <div>
      {/* Show item type selection buttons when no items exist */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Item</h2>
          <p className="text-gray-600 mb-8">Select the type of steel item you want to add to this RFQ</p>
          <div className="flex gap-6">
            <button
              onClick={() => onAddEntry()}
              className="flex flex-col items-center justify-center w-48 h-40 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-lg font-semibold">Straight Pipe</span>
              <span className="text-xs text-blue-200 mt-1">Standard pipeline sections</span>
            </button>
            <button
              onClick={() => onAddBendEntry()}
              className="flex flex-col items-center justify-center w-48 h-40 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3-7 4 14 3-7h4" />
              </svg>
              <span className="text-lg font-semibold">Bend Section</span>
              <span className="text-xs text-blue-200 mt-1">Elbows and custom bends</span>
            </button>
            <button
              onClick={() => onAddFittingEntry()}
              className="flex flex-col items-center justify-center w-48 h-40 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-lg font-semibold">Fittings</span>
              <span className="text-xs text-blue-200 mt-1">Tees, laterals, and other fittings</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Items</h2>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-700 font-semibold">Auto-calculating</span>
              <span className="text-xs text-green-600">Results update automatically</span>
            </div>
          </div>

          <div className="space-y-3">
        {entries.map((entry: any, index: number) => (
          <div key={`${entry.id}-${index}`} className="border-2 border-gray-200 rounded-lg p-5 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                {/* Editable Item Number */}
                <div className="flex items-center gap-1">
                  <span className="text-base font-semibold text-gray-800">Item</span>
                  <input
                    type="text"
                    value={entry.clientItemNumber || `#${index + 1}`}
                    onChange={(e) => onUpdateEntry(entry.id, { clientItemNumber: e.target.value })}
                    className="w-20 px-2 py-0.5 text-base font-semibold text-gray-800 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`#${index + 1}`}
                  />
                </div>
                <span className={`px-3 py-1 ${
                  entry.itemType === 'bend' ? 'bg-purple-100 text-purple-800' :
                  entry.itemType === 'fitting' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                } text-xs font-semibold rounded-full`}>
                  {entry.itemType === 'bend' ? 'Bend Section' :
                   entry.itemType === 'fitting' ? 'Fittings' :
                   'Straight Pipe'}
                </span>
                {/* Sequential numbering checkbox */}
                {entry.specs?.quantityValue > 1 && (
                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={entry.useSequentialNumbering || false}
                      onChange={(e) => onUpdateEntry(entry.id, { useSequentialNumbering: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Sequential (e.g., {entry.clientItemNumber || `#${index + 1}`}-01, -02)</span>
                  </label>
                )}
              </div>
            </div>

            {entry.itemType === 'bend' ? (
              /* Bend Item Fields */
              <div className="space-y-5">
                {/* Item Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || ''}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    rows={2}
                    placeholder="e.g., 40NB 90° 1.5D Bend"
                    required
                  />
                </div>

                {/* 3D Bend Preview */}
                {entry.specs?.nominalBoreMm && entry.specs?.bendDegrees && (
                  <Bend3DPreview
                    nominalBore={entry.specs.nominalBoreMm}
                    outerDiameter={entry.calculation?.outsideDiameterMm || entry.specs.nominalBoreMm * 1.1}
                    wallThickness={entry.calculation?.wallThicknessMm || 5}
                    bendAngle={entry.specs.bendDegrees}
                    bendType={entry.specs.bendType || '1.5D'}
                    tangent1={entry.specs.tangent1Length}
                    tangent2={entry.specs.tangent2Length}
                    schedule={entry.specs.scheduleNumber}
                    materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                  />
                )}

                {/* Remove Item Button */}
                {entries.length > 1 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => onRemoveEntry(entry.id)}
                      className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                    >
                      Remove Item
                    </button>
                  </div>
                )}

                {/* Bend Specifications Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Nominal Bore (mm) *
                    </label>
                    <select
                      value={entry.specs?.nominalBoreMm || ''}
                      onChange={async (e) => {
                        const nominalBore = parseInt(e.target.value);
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, nominalBoreMm: nominalBore }
                        };
                        // Auto-update description
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                        // Auto-calculate if all required fields are filled
                        if (nominalBore && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                          setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select NB</option>
                      {entry.specs?.bendType && bendOptionsCache[entry.specs.bendType]?.nominalBores?.length > 0 ? (
                        // Use dynamic options from API if available
                        bendOptionsCache[entry.specs.bendType].nominalBores.map((nb: number) => (
                          <option key={nb} value={nb}>{nb} NB</option>
                        ))
                      ) : (
                        // Fallback to static options
                        <>
                          <option value="40">40 NB</option>
                          <option value="50">50 NB</option>
                          <option value="65">65 NB</option>
                          <option value="80">80 NB</option>
                          <option value="100">100 NB</option>
                          <option value="125">125 NB</option>
                          <option value="150">150 NB</option>
                          <option value="200">200 NB</option>
                          <option value="250">250 NB</option>
                          <option value="300">300 NB</option>
                          <option value="350">350 NB</option>
                          <option value="400">400 NB</option>
                          <option value="450">450 NB</option>
                          <option value="500">500 NB</option>
                          <option value="550">550 NB</option>
                          <option value="600">600 NB</option>
                          <option value="650">650 NB</option>
                          <option value="700">700 NB</option>
                          <option value="750">750 NB</option>
                          <option value="800">800 NB</option>
                          <option value="900">900 NB</option>
                          <option value="1000">1000 NB</option>
                          <option value="1050">1050 NB</option>
                          <option value="1100">1100 NB</option>
                          <option value="1150">1150 NB</option>
                          <option value="1200">1200 NB</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Schedule *
                    </label>
                    <select
                      value={entry.specs?.scheduleNumber || ''}
                      onChange={(e) => {
                        const schedule = e.target.value;
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, scheduleNumber: schedule }
                        };
                        // Auto-update description
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                        // Auto-calculate if all required fields are filled
                        if (schedule && entry.specs?.nominalBoreMm && entry.specs?.bendType && entry.specs?.bendDegrees) {
                          setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select Schedule</option>
                      <option value="10">Sch 10</option>
                      <option value="40">Sch 40</option>
                      <option value="80">Sch 80</option>
                      <option value="160">Sch 160</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Bend Type *
                    </label>
                    <select
                      value={entry.specs?.bendType || ''}
                      onChange={async (e) => {
                        const bendType = e.target.value;
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, bendType: bendType }
                        };
                        // Auto-update description
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                        
                        // Fetch available options for this bend type
                        if (bendType) {
                          await fetchBendOptions(bendType);
                        }
                        
                        // Auto-calculate if all required fields are filled
                        if (bendType && entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendDegrees) {
                          setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select Bend Type</option>
                      <option value="1D">1D</option>
                      <option value="1.5D">1.5D</option>
                      <option value="2D">2D</option>
                      <option value="3D">3D</option>
                      <option value="5D">5D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Bend Angle (degrees) *
                    </label>
                    <select
                      value={entry.specs?.bendDegrees || ''}
                      onChange={(e) => {
                        const bendDegrees = parseFloat(e.target.value);
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, bendDegrees: bendDegrees }
                        };
                        // Auto-update description
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                        // Auto-calculate if all required fields are filled
                        if (bendDegrees && entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType) {
                          setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select Angle</option>
                      {entry.specs?.bendType && bendOptionsCache[entry.specs.bendType]?.degrees?.length > 0 ? (
                        // Use dynamic options from API if available
                        bendOptionsCache[entry.specs.bendType].degrees.map((deg: number) => (
                          <option key={deg} value={deg}>{deg}°</option>
                        ))
                      ) : (
                        // Fallback to static options
                        <>
                          <option value="1">1°</option>
                          <option value="2">2°</option>
                          <option value="3">3°</option>
                          <option value="4">4°</option>
                          <option value="5">5°</option>
                          <option value="6">6°</option>
                          <option value="7">7°</option>
                          <option value="8">8°</option>
                          <option value="9">9°</option>
                          <option value="10">10°</option>
                          <option value="11.25">11.25°</option>
                          <option value="12.5">12.5°</option>
                          <option value="15">15°</option>
                          <option value="17.5">17.5°</option>
                          <option value="20">20°</option>
                          <option value="22.5">22.5°</option>
                          <option value="25">25°</option>
                          <option value="27.5">27.5°</option>
                          <option value="30">30°</option>
                          <option value="31">31°</option>
                          <option value="32">32°</option>
                          <option value="32.5">32.5°</option>
                          <option value="33">33°</option>
                          <option value="34">34°</option>
                          <option value="35">35°</option>
                          <option value="37.5">37.5°</option>
                          <option value="40">40°</option>
                          <option value="42.5">42.5°</option>
                          <option value="45">45°</option>
                          <option value="47.5">47.5°</option>
                          <option value="50">50°</option>
                          <option value="51">51°</option>
                          <option value="52">52°</option>
                          <option value="53">53°</option>
                          <option value="54">54°</option>
                          <option value="55">55°</option>
                          <option value="56">56°</option>
                          <option value="57">57°</option>
                          <option value="58">58°</option>
                          <option value="59">59°</option>
                          <option value="60">60°</option>
                          <option value="61">61°</option>
                          <option value="62">62°</option>
                          <option value="63">63°</option>
                          <option value="64">64°</option>
                          <option value="65">65°</option>
                          <option value="66">66°</option>
                          <option value="67">67°</option>
                          <option value="68">68°</option>
                          <option value="69">69°</option>
                          <option value="70">70°</option>
                          <option value="71">71°</option>
                          <option value="72">72°</option>
                          <option value="73">73°</option>
                          <option value="74">74°</option>
                          <option value="75">75°</option>
                          <option value="76">76°</option>
                          <option value="77">77°</option>
                          <option value="78">78°</option>
                          <option value="79">79°</option>
                          <option value="80">80°</option>
                          <option value="81">81°</option>
                          <option value="82">82°</option>
                          <option value="83">83°</option>
                          <option value="84">84°</option>
                          <option value="85">85°</option>
                          <option value="86">86°</option>
                          <option value="87">87°</option>
                          <option value="88">88°</option>
                          <option value="89">89°</option>
                          <option value="90">90°</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Center-to-Face (mm)
                    </label>
                    <input
                      type="text"
                      value={entry.calculation?.centerToFaceDimension?.toFixed(1) || 'Calculate to see'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                      placeholder="Auto-calculated"
                    />
                    <p className="mt-0.5 text-xs text-gray-500">
                      Auto-populated based on NB and angle
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={entry.specs?.quantityValue || ''}
                      onChange={(e) => {
                        const quantity = parseInt(e.target.value) || 1;
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, quantityValue: quantity }
                        });
                        // Auto-calculate if all required fields are filled
                        if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                          setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                      min="1"
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Operating Conditions - Item Level */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-900 mb-3">Operating Conditions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Pressure (bar) *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.workingPressureBar || ''}
                        onChange={async (e) => {
                          const pressure = parseFloat(e.target.value) || 10;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingPressureBar: pressure }
                          });
                          
                          // Auto-select flange specifications based on pressure and temperature
                          const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          const temperature = entry.specs?.workingTemperatureC ? parseFloat(String(entry.specs.workingTemperatureC)) : undefined;
                          // Get material group from steel specification
                          const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                          const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
                          if (pressure > 0 && flangeStandardId && autoSelectFlangeSpecs) {
                            setTimeout(() => {
                              autoSelectFlangeSpecs(
                                entry.id,
                                'bend',
                                pressure,
                                flangeStandardId,
                                (updates: any) => onUpdateEntry(entry.id, { specs: { ...entry.specs, ...updates } }),
                                temperature,
                                materialGroup
                              );
                            }, 300);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                        min="0"
                        step="0.1"
                        placeholder="10"
                      />
                      <p className="mt-0.5 text-xs text-gray-500">
                        Auto-selects recommended flange pressure class
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Temperature (°C) *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.workingTemperatureC || ''}
                        onChange={(e) => {
                          const temperature = parseFloat(e.target.value) || 20;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingTemperatureC: temperature }
                          });

                          // Re-select flange pressure class when temperature changes
                          const pressure = entry.specs?.workingPressureBar;
                          const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          // Get material group from steel specification
                          const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                          const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
                          if (pressure && pressure > 0 && flangeStandardId && autoSelectFlangeSpecs) {
                            setTimeout(() => {
                              autoSelectFlangeSpecs(
                                entry.id,
                                'bend',
                                pressure,
                                flangeStandardId,
                                (updates: any) => onUpdateEntry(entry.id, { specs: { ...entry.specs, ...updates } }),
                                temperature,
                                materialGroup
                              );
                            }, 300);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                        min="-200"
                        max="1000"
                        step="1"
                        placeholder="20"
                      />
                      <p className="mt-0.5 text-xs text-gray-500">
                        Operating temperature affects flange P/T rating
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tangents Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Number of Tangents
                      </label>
                      <select
                        value={entry.specs?.numberOfTangents || 0}
                        onChange={(e) => {
                          const count = parseInt(e.target.value) || 0;
                          const currentLengths = entry.specs?.tangentLengths || [];
                          const newLengths = count === 0 ? [] : 
                                           count === 1 ? [currentLengths[0] || 150] :
                                           [currentLengths[0] || 150, currentLengths[1] || 150];
                          const updatedEntry = {
                            ...entry,
                            specs: { 
                              ...entry.specs, 
                              numberOfTangents: count,
                              tangentLengths: newLengths
                            }
                          };
                          // Auto-update description
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                          // Auto-calculate if all required fields are filled
                          if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                            setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="0">0 - No Tangents</option>
                        <option value="1">1 - Single Tangent</option>
                        <option value="2">2 - Both Tangents</option>
                      </select>
                    </div>

                    {(entry.specs?.numberOfTangents || 0) >= 1 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Tangent 1 Length (mm)
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.tangentLengths?.[0] || ''}
                          onChange={(e) => {
                            const lengths = [...(entry.specs?.tangentLengths || [])];
                            lengths[0] = parseInt(e.target.value) || 0;
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, tangentLengths: lengths }
                            });
                            // Auto-calculate if all required fields are filled
                            if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                              setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          min="0"
                          placeholder="150"
                        />
                      </div>
                    )}

                    {(entry.specs?.numberOfTangents || 0) >= 2 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Tangent 2 Length (mm)
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.tangentLengths?.[1] || ''}
                          onChange={(e) => {
                            const lengths = [...(entry.specs?.tangentLengths || [])];
                            lengths[1] = parseInt(e.target.value) || 0;
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, tangentLengths: lengths }
                            });
                            // Auto-calculate if all required fields are filled
                            if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                              setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          min="0"
                          placeholder="150"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Stubs Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Number of Stubs
                    </label>
                    <select
                      value={entry.specs?.numberOfStubs || 0}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        const currentStubs = entry.specs?.stubs || [];
                        const newStubs = count === 0 ? [] :
                                        count === 1 ? [currentStubs[0] || { nominalBoreMm: 40, length: 150, flangeSpec: '' }] :
                                        [
                                          currentStubs[0] || { nominalBoreMm: 40, length: 150, flangeSpec: '' },
                                          currentStubs[1] || { nominalBoreMm: 40, length: 150, flangeSpec: '' }
                                        ];
                        const updatedEntry = {
                          ...entry,
                          specs: { 
                            ...entry.specs, 
                            numberOfStubs: count,
                            stubs: newStubs
                          }
                        };
                        // Auto-update description
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    >
                      <option value="0">0 - No Stubs</option>
                      <option value="1">1 - Single Stub</option>
                      <option value="2">2 - Both Stubs</option>
                    </select>
                  </div>

                  {(entry.specs?.numberOfStubs || 0) >= 1 && (
                    <div className="mb-3 p-3 bg-white rounded-lg border border-green-300">
                      <h5 className="text-xs font-bold text-green-900 mb-2">Stub 1 Specifications</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">NB (mm)</label>
                          <input
                            type="number"
                            value={entry.specs?.stubs?.[0]?.nominalBoreMm || ''}
                            onChange={(e) => {
                              const stubs = [...(entry.specs?.stubs || [])];
                              stubs[0] = { ...stubs[0], nominalBoreMm: parseInt(e.target.value) || 0 };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                            placeholder="40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Length (mm)</label>
                          <input
                            type="number"
                            value={entry.specs?.stubs?.[0]?.length || ''}
                            onChange={(e) => {
                              const stubs = [...(entry.specs?.stubs || [])];
                              stubs[0] = { ...stubs[0], length: parseInt(e.target.value) || 0 };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                            placeholder="150"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Flange Spec</label>
                          <input
                            type="text"
                            value={entry.specs?.stubs?.[0]?.flangeSpec || ''}
                            onChange={(e) => {
                              const stubs = [...(entry.specs?.stubs || [])];
                              stubs[0] = { ...stubs[0], flangeSpec: e.target.value };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                            placeholder="e.g., ASME 150#"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(entry.specs?.numberOfStubs || 0) >= 2 && (
                    <div className="p-3 bg-white rounded-lg border border-green-300">
                      <h5 className="text-xs font-bold text-green-900 mb-2">Stub 2 Specifications</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">NB (mm)</label>
                          <input
                            type="number"
                            value={entry.specs?.stubs?.[1]?.nominalBoreMm || ''}
                            onChange={(e) => {
                              const stubs = [...(entry.specs?.stubs || [])];
                              stubs[1] = { ...stubs[1], nominalBoreMm: parseInt(e.target.value) || 0 };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                            placeholder="40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Length (mm)</label>
                          <input
                            type="number"
                            value={entry.specs?.stubs?.[1]?.length || ''}
                            onChange={(e) => {
                              const stubs = [...(entry.specs?.stubs || [])];
                              stubs[1] = { ...stubs[1], length: parseInt(e.target.value) || 0 };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                            placeholder="150"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Flange Spec</label>
                          <input
                            type="text"
                            value={entry.specs?.stubs?.[1]?.flangeSpec || ''}
                            onChange={(e) => {
                              const stubs = [...(entry.specs?.stubs || [])];
                              stubs[1] = { ...stubs[1], flangeSpec: e.target.value };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                            placeholder="e.g., ASME 150#"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Flange Type Selection */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h5 className="text-sm font-bold text-orange-900 mb-3">Flange Specifications</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Flange Standard
                      </label>
                      <select
                        value={entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                        onChange={(e) => onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, flangeStandardId: parseInt(e.target.value) || undefined }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">Select Standard</option>
                        {masterData.flangeStandards?.map((standard: any) => (
                          <option key={standard.id} value={standard.id}>
                            {standard.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Pressure Class
                        {entry.specs?.autoSelectedPressureClass && (
                          <span className="ml-2 text-xs text-green-600 font-normal">Auto-selected</span>
                        )}
                      </label>
                      <select
                        value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                        onChange={(e) => onUpdateEntry(entry.id, {
                          specs: { 
                            ...entry.specs, 
                            flangePressureClassId: parseInt(e.target.value) || undefined,
                            autoSelectedPressureClass: false // Clear auto-selection flag on manual change
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">Select Class</option>
                        {masterData.pressureClasses?.map((pressureClass: any) => (
                          <option key={pressureClass.id} value={pressureClass.id}>
                            {pressureClass.designation}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Use Global Specs
                      </label>
                      <div className="flex items-center h-10">
                        <input
                          type="checkbox"
                          checked={entry.specs?.useGlobalFlangeSpecs ?? true}
                          onChange={(e) => onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, useGlobalFlangeSpecs: e.target.checked }
                          })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Use global flange specifications
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating Conditions - Item Level */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-900 mb-3">Operating Conditions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Pressure (bar) *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.workingPressureBar || ''}
                        onChange={async (e) => {
                          const pressure = parseFloat(e.target.value) || 10;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingPressureBar: pressure }
                          });
                          
                          // Auto-select flange specifications based on pressure and temperature
                          const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          const temperature = entry.specs?.workingTemperatureC ? parseFloat(String(entry.specs.workingTemperatureC)) : undefined;
                          // Get material group from steel specification
                          const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                          const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
                          if (pressure > 0 && flangeStandardId && autoSelectFlangeSpecs) {
                            setTimeout(() => {
                              autoSelectFlangeSpecs(
                                entry.id,
                                'straight-pipe',
                                pressure,
                                flangeStandardId,
                                (updates: any) => onUpdateEntry(entry.id, { specs: { ...entry.specs, ...updates } }),
                                temperature,
                                materialGroup
                              );
                            }, 300);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                        min="0"
                        step="0.1"
                        placeholder="10"
                      />
                      <p className="mt-0.5 text-xs text-gray-500">
                        Auto-selects recommended flange pressure class
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Temperature (°C) *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.workingTemperatureC || ''}
                        onChange={(e) => {
                          const temperature = parseFloat(e.target.value) || 20;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingTemperatureC: temperature }
                          });

                          // Re-select flange pressure class when temperature changes
                          const pressure = entry.specs?.workingPressureBar;
                          const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          // Get material group from steel specification
                          const steelSpec2 = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                          const materialGroup2 = getFlangeMaterialGroup(steelSpec2?.steelSpecName);
                          if (pressure && pressure > 0 && flangeStandardId && autoSelectFlangeSpecs) {
                            setTimeout(() => {
                              autoSelectFlangeSpecs(
                                entry.id,
                                'straight-pipe',
                                pressure,
                                flangeStandardId,
                                (updates: any) => onUpdateEntry(entry.id, { specs: { ...entry.specs, ...updates } }),
                                temperature,
                                materialGroup2
                              );
                            }, 300);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                        min="-200"
                        max="1000"
                        step="1"
                        placeholder="20"
                      />
                      <p className="mt-0.5 text-xs text-gray-500">
                        Operating temperature affects flange P/T rating
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-Calculating Indicator */}
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-purple-700 font-semibold">Auto-calculating</span>
                  <span className="text-xs text-purple-600">Results update automatically</span>
                </div>

                {/* Calculation Results */}
                {entry.calculation && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-3">Calculation Results:</h4>
                    
                    {/* Main metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Weight</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{entry.calculation.totalWeight?.toFixed(1)} kg</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Center-to-Face</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{entry.calculation.centerToFaceDimension?.toFixed(1)} mm</div>
                      </div>
                    </div>

                    {/* Weight breakdown */}
                    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Weight Breakdown:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">Bend:</span>
                          <span className="font-medium text-gray-900">{entry.calculation.bendWeight?.toFixed(1) || '0'} kg</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">Tangent:</span>
                          <span className="font-medium text-gray-900">{entry.calculation.tangentWeight?.toFixed(1) || '0'} kg</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">Flange:</span>
                          <span className="font-medium text-gray-900">{entry.calculation.flangeWeight?.toFixed(1) || '0'} kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Technical details */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Technical Details:</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Outside Diameter</span>
                          <span className="font-medium text-gray-900">{entry.calculation.outsideDiameterMm?.toFixed(1) || '0'} mm</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Wall Thickness</span>
                          <span className="font-medium text-gray-900">{entry.calculation.wallThicknessMm?.toFixed(2) || '0'} mm</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Flanges</span>
                          <span className="font-medium text-gray-900">{entry.calculation.numberOfFlanges || 0}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Weld Length</span>
                          <span className="font-medium text-gray-900">{(entry.calculation.totalFlangeWeldLength || 0).toFixed(2)} m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : entry.itemType === 'fitting' ? (
              /* Fitting Item Fields */
              <div className="space-y-5">
                {/* Item Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || '100NB Equal Tee Fitting'}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    rows={2}
                    placeholder="e.g., 100NB Equal Tee SABS62"
                    required
                  />
                </div>

                {/* Fitting Specifications Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Column 1 - Basic Specs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Fitting Specifications
                  </h4>                    {/* Fitting Standard */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting Standard *
                      </label>
                      <select
                        value={entry.specs?.fittingStandard || 'SABS62'}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, fittingStandard: e.target.value as 'SABS62' | 'SABS719' }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                      >
                        <option value="SABS62">SABS62 (Standard Fittings)</option>
                        <option value="SABS719">SABS719 (Fabricated Fittings)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {entry.specs?.fittingStandard === 'SABS719' 
                          ? 'Uses pipe table for cut lengths, tee/lateral weld + flange welds'
                          : 'Uses standard fitting dimensions from tables'}
                      </p>
                    </div>

                    {/* Fitting Type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting Type *
                      </label>
                      <select
                        value={entry.specs?.fittingType || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, fittingType: e.target.value }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                      >
                        <option value="">Select fitting type...</option>
                        {entry.specs?.fittingStandard === 'SABS62' ? (
                          <>
                            <option value="EQUAL_TEE">Equal Tee</option>
                            <option value="UNEQUAL_TEE">Unequal Tee</option>
                            <option value="LATERAL">Lateral</option>
                            <option value="SWEEP_TEE">Sweep Tee</option>
                            <option value="Y_PIECE">Y-Piece</option>
                            <option value="GUSSETTED_TEE">Gussetted Tee</option>
                            <option value="EQUAL_CROSS">Equal Cross</option>
                            <option value="UNEQUAL_CROSS">Unequal Cross</option>
                          </>
                        ) : (
                          <>
                            <option value="ELBOW">Elbow</option>
                            <option value="MEDIUM_RADIUS_BEND">Medium Radius Bend</option>
                            <option value="LONG_RADIUS_BEND">Long Radius Bend</option>
                            <option value="LATERAL">Lateral</option>
                            <option value="DUCKFOOT_SHORT">Duckfoot (Short)</option>
                            <option value="DUCKFOOT_GUSSETTED">Duckfoot (Gussetted)</option>
                            <option value="SWEEP_LONG_RADIUS">Sweep (Long Radius)</option>
                            <option value="SWEEP_MEDIUM_RADIUS">Sweep (Medium Radius)</option>
                            <option value="SWEEP_ELBOW">Sweep Elbow</option>
                          </>
                        )}
                        <option value="CON_REDUCER">Concentric Reducer</option>
                        <option value="ECCENTRIC_REDUCER">Eccentric Reducer</option>
                      </select>
                    </div>

                    {/* Nominal Diameter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Nominal Diameter (mm) *
                      </label>
                      <select
                        value={entry.specs?.nominalDiameterMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, nominalDiameterMm: Number(e.target.value) }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                      >
                        <option value="">Select diameter...</option>
                        {nominalBores.map((nb: number) => (
                          <option key={nb} value={nb}>{nb}mm</option>
                        ))}
                      </select>
                    </div>

                    {/* Angle Range (for Laterals and Y-Pieces) */}
                    {(entry.specs?.fittingType === 'LATERAL' || entry.specs?.fittingType === 'Y_PIECE') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Angle Range *
                        </label>
                        <select
                          value={entry.specs?.angleRange || ''}
                          onChange={(e) => {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, angleRange: e.target.value }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        >
                          <option value="">Select angle range...</option>
                          <option value="60-90">60° - 90°</option>
                          <option value="45-59">45° - 59°</option>
                          <option value="30-44">30° - 44°</option>
                        </select>
                      </div>
                    )}

                    {/* Degrees (for Laterals) */}
                    {entry.specs?.fittingType === 'LATERAL' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Degrees *
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.degrees || ''}
                          onChange={(e) => {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, degrees: Number(e.target.value) }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                          placeholder="e.g., 45, 60, 90"
                          min="30"
                          max="90"
                        />
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.quantityValue || 1}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, quantityValue: Number(e.target.value) }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Column 2 - Pipe Lengths & Location */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      📐 Pipe Lengths & Configuration
                    </h4>

                    {/* Pipe Length A */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Pipe Length A (mm) *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.pipeLengthAMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, pipeLengthAMm: Number(e.target.value) }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        placeholder="e.g., 1000"
                        min="0"
                      />
                    </div>

                    {/* Pipe Length B */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Pipe Length B (mm) *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.pipeLengthBMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, pipeLengthBMm: Number(e.target.value) }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        placeholder="e.g., 1000"
                        min="0"
                      />
                    </div>

                    {/* Stub/Lateral Location */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Location of Stub/Lateral
                      </label>
                      <input
                        type="text"
                        value={entry.specs?.stubLocation || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, stubLocation: e.target.value }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        placeholder="e.g., Center, 500mm from end"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Conditions Section */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-amber-900 mb-3">
                    Operating Conditions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Pressure (Bar)
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.workingPressureBar || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingPressureBar: Number(e.target.value) }
                          });
                        }}
                        className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                        placeholder="e.g., 16"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Temperature (°C)
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.workingTemperatureC || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingTemperatureC: Number(e.target.value) }
                          });
                        }}
                        className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                        placeholder="e.g., 20"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={entry.notes || ''}
                    onChange={(e) => onUpdateEntry(entry.id, { notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    rows={2}
                    placeholder="Any special requirements or notes..."
                  />
                </div>

                {/* Calculate Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => onCalculateFitting && onCalculateFitting(entry.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors"
                  >
                    Calculate Fitting Weight & Requirements
                  </button>
                </div>

                {/* Calculation Results */}
                {entry.calculation && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-green-900 text-sm flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Calculation Results
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Total Weight:</span>
                        <span className="ml-2 font-semibold text-gray-900">{entry.calculation.totalWeight?.toFixed(2)} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fitting Weight:</span>
                        <span className="ml-2 font-semibold text-gray-900">{entry.calculation.fittingWeight?.toFixed(2)} kg</span>
                      </div>
                      {entry.calculation.pipeWeight > 0 && (
                        <div>
                          <span className="text-gray-600">Pipe Weight:</span>
                          <span className="ml-2 font-semibold text-gray-900">{entry.calculation.pipeWeight?.toFixed(2)} kg</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Flange Weight:</span>
                        <span className="ml-2 font-semibold text-gray-900">{entry.calculation.flangeWeight?.toFixed(2)} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Flanges:</span>
                        <span className="ml-2 font-semibold text-gray-900">{entry.calculation.numberOfFlanges}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Flange Welds:</span>
                        <span className="ml-2 font-semibold text-gray-900">{entry.calculation.numberOfFlangeWelds}</span>
                      </div>
                      {entry.calculation.numberOfTeeWelds > 0 && (
                        <div>
                          <span className="text-gray-600">Tee/Lateral Welds:</span>
                          <span className="ml-2 font-semibold text-gray-900">{entry.calculation.numberOfTeeWelds}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">OD:</span>
                        <span className="ml-2 font-semibold text-gray-900">{entry.calculation.outsideDiameterMm?.toFixed(1)} mm</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Wall Thickness:</span>
                        <span className="ml-2 font-semibold text-gray-900">{entry.calculation.wallThicknessMm?.toFixed(2)} mm</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Straight Pipe Fields */
              <div className="space-y-5">
                {/* Item Description - Single Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || generateItemDescription(entry)}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    rows={2}
                    placeholder="Enter item description..."
                    required
                  />
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-gray-500">
                      Edit the description or use the auto-generated one
                    </p>
                    {entry.description && entry.description !== generateItemDescription(entry) && (
                      <button
                        type="button"
                        onClick={() => onUpdateEntry(entry.id, { description: generateItemDescription(entry) })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Reset to Auto-generated
                      </button>
                    )}
                  </div>
                </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1 - Specifications */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 border-b border-blue-500 pb-1.5">
                    Pipe Specifications
                  </h4>

                  {/* Nominal Bore */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Nominal Bore (mm) *
                    </label>
                    <select
                      value={entry.specs.nominalBoreMm}
                      onChange={async (e) => {
                        const nominalBore = Number(e.target.value);
                        if (!nominalBore) return;

                        console.log(`[NB onChange] Selected NB: ${nominalBore}mm`);

                        // Get steel spec ID and temperature
                        const steelSpecId = entry.specs.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
                        const pressure = globalSpecs?.workingPressureBar || 0;
                        const temperature = globalSpecs?.workingTemperatureC || 20;

                        // Get schedules from fallback data directly for synchronous dropdown update
                        const schedules = FALLBACK_PIPE_SCHEDULES[nominalBore] || [];
                        console.log(`[NB onChange] Using ${schedules.length} fallback schedules for ${nominalBore}mm`);

                        // CRITICAL: Set the availableSchedulesMap SYNCHRONOUSLY before updating entry
                        if (schedules.length > 0) {
                          setAvailableSchedulesMap((prev: Record<string, any[]>) => ({
                            ...prev,
                            [entry.id]: schedules
                          }));
                          console.log(`[NB onChange] Set availableSchedulesMap for entry ${entry.id} with ${schedules.length} schedules`);
                        }

                        // Try backend API for ASME B31.3 compliant schedule recommendation
                        let matchedSchedule: string | null = null;
                        let matchedWT = 0;
                        let minWT = 0;
                        let apiSucceeded = false;

                        if (pressure > 0) {
                          try {
                            console.log(`[NB onChange] Calling pipeScheduleApi.recommend with NB=${nominalBore}, P=${pressure}bar, T=${temperature}°C`);
                            const recommendation = await pipeScheduleApi.recommend({
                              nbMm: nominalBore,
                              pressureBar: pressure,
                              temperatureCelsius: temperature,
                              materialCode: steelSpecId === 1 ? 'ASTM_A53_Grade_B' : 'ASTM_A106_Grade_B'
                            });

                            if (recommendation && recommendation.minRequiredThicknessMm) {
                              minWT = recommendation.minRequiredThicknessMm;
                              console.log(`[NB onChange] API returned minWT: ${minWT.toFixed(2)}mm`);

                              if (recommendation.warnings?.length > 0) {
                                console.warn('[NB onChange] API warnings:', recommendation.warnings);
                              }

                              // CRITICAL FIX: Always use fallback schedule data for the schedule name
                              // Find the lightest schedule that meets the minimum wall thickness requirement
                              const eligibleSchedules = schedules
                                .filter(s => s.wallThicknessMm >= minWT)
                                .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

                              if (eligibleSchedules.length > 0) {
                                matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                                matchedWT = eligibleSchedules[0].wallThicknessMm;
                                apiSucceeded = true;
                                console.log(`[NB onChange] Using fallback schedule: ${matchedSchedule} (${matchedWT}mm) for minWT=${minWT.toFixed(2)}mm`);
                              } else {
                                // No schedule meets requirements - use thickest available
                                const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
                                matchedSchedule = sorted[0].scheduleDesignation;
                                matchedWT = sorted[0].wallThicknessMm;
                                apiSucceeded = true;
                                console.warn(`[NB onChange] No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${matchedSchedule} (${matchedWT}mm)`);
                              }
                            }
                          } catch (error) {
                            console.warn('[NB onChange] API call failed, using local calculation:', error);
                          }
                        }

                        // Fallback to local ASME B31.3 calculation if API failed
                        if (!apiSucceeded && schedules.length > 0) {
                          if (pressure > 0) {
                            // OD lookup based on NB
                            const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                            const materialCode = steelSpecId === 1 ? 'ASTM_A53_Grade_B' : 'ASTM_A106_Grade_B';

                            // Use ASME B31.3 formula: P = (2 × S × E × t) / OD
                            // Calculate minimum required wall thickness with 1.2x safety factor
                            minWT = calculateMinWallThickness(od, pressure, materialCode, temperature, 1.0, 0, 1.2);

                            console.log(`[NB onChange] ASME B31.3 calc minWT: ${minWT.toFixed(2)}mm for ${pressure} bar @ ${temperature}°C, OD=${od}mm`);

                            // Find recommended schedule using ASME B31.3 validation
                            const recommendation = findRecommendedSchedule(
                              schedules,
                              od,
                              pressure,
                              materialCode,
                              temperature,
                              1.2 // Minimum 1.2x safety factor
                            );

                            if (recommendation.schedule) {
                              matchedSchedule = recommendation.schedule.scheduleDesignation;
                              matchedWT = recommendation.schedule.wallThicknessMm;
                              const maxPressure = recommendation.validation?.maxAllowablePressure || 0;
                              const margin = recommendation.validation?.safetyMargin || 0;
                              console.log(`[NB onChange] ASME B31.3 recommended: ${matchedSchedule} (${matchedWT}mm), max ${maxPressure.toFixed(1)} bar, ${margin.toFixed(1)}x margin`);
                            } else {
                              // No schedule meets requirements - use thickest available with warning
                              const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
                              matchedSchedule = sorted[0].scheduleDesignation;
                              matchedWT = sorted[0].wallThicknessMm;
                              const validation = validateScheduleForPressure(od, matchedWT, pressure, materialCode, temperature);
                              console.warn(`[NB onChange] No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${matchedSchedule} (${matchedWT}mm). ${validation.message}`);
                            }
                          } else {
                            // No pressure set - use lightest schedule (Sch 10 or STD)
                            const sorted = [...schedules].sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);
                            matchedSchedule = sorted[0].scheduleDesignation;
                            matchedWT = sorted[0].wallThicknessMm;
                            console.log(`[NB onChange] No pressure set, using lightest schedule: ${matchedSchedule}`);
                          }
                        }

                        // Build the update object
                        const updatedEntry: any = {
                          ...entry,
                          minimumSchedule: matchedSchedule,
                          minimumWallThickness: minWT,
                          isScheduleOverridden: false,
                          specs: {
                            ...entry.specs,
                            nominalBoreMm: nominalBore,
                            scheduleNumber: matchedSchedule,
                            wallThicknessMm: matchedWT,
                          }
                        };

                        // Update description
                        updatedEntry.description = generateItemDescription(updatedEntry);

                        console.log(`[NB onChange] Updating entry ${entry.id} with schedule: ${matchedSchedule}, WT: ${matchedWT}mm (API: ${apiSucceeded})`);
                        onUpdateEntry(entry.id, updatedEntry);

                        // Also fetch from API to potentially get better data (runs async in background)
                        fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={isLoadingNominalBores}
                    >
                      <option value="">{isLoadingNominalBores ? 'Loading available sizes...' : 'Please Select NB'}</option>
                      {nominalBores.map((nb: number) => (
                        <option key={nb} value={nb}>
                          {nb}NB
                        </option>
                      ))}
                    </select>
                    {globalSpecs?.steelSpecificationId && nominalBores.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {nominalBores.length} sizes available for selected steel specification
                      </p>
                    )}
                    {errors[`pipe_${index}_nb`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`pipe_${index}_nb`]}</p>
                    )}
                  </div>

                  {/* Schedule/Wall Thickness - Auto/Manual with Upgrade Option */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Schedule/Wall Thickness
                      {globalSpecs?.workingPressureBar ? (
                        <span className="text-green-600 text-xs ml-2">(Automated)</span>
                      ) : (
                        <span className="text-orange-600 text-xs ml-2">(Manual Selection Required)</span>
                      )}
                      {entry.isScheduleOverridden && (
                        <span className="text-blue-600 text-xs ml-2 font-bold">(User Override)</span>
                      )}
                    </label>

                    {globalSpecs?.workingPressureBar && entry.specs.nominalBoreMm ? (
                      <>
                        <div className="bg-green-50 p-2 rounded-md space-y-2">
                          <p className="text-green-800 font-medium text-xs mb-2">
                            Auto-calculated based on {globalSpecs.workingPressureBar} bar and {entry.specs.nominalBoreMm}NB
                          </p>

                          {/* Schedule Dropdown with Recommended + Upgrades */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">
                              Schedule *
                            </label>
                            <select
                              value={entry.specs.scheduleNumber || ''}
                              onChange={async (e) => {
                                const newSchedule = e.target.value;

                                // Find the selected dimension to get wall thickness
                                // Handle both camelCase and snake_case property names
                                const availableSchedules = availableSchedulesMap[entry.id] || [];
                                const selectedDimension = availableSchedules.find((dim: any) => {
                                  const schedName = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString();
                                  return schedName === newSchedule;
                                });

                                // Use wall thickness from API data (handle both naming conventions)
                                const autoWallThickness = selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;

                                const updatedEntry: any = {
                                  specs: {
                                    ...entry.specs,
                                    scheduleNumber: newSchedule,
                                    wallThicknessMm: autoWallThickness || entry.specs.wallThicknessMm
                                  },
                                  isScheduleOverridden: newSchedule !== entry.minimumSchedule
                                };

                                // Auto-update description
                                updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                                onUpdateEntry(entry.id, updatedEntry);
                              }}
                              className="w-full px-2 py-1.5 text-black border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select schedule...</option>
                              {(() => {
                                // ALWAYS prefer FALLBACK_PIPE_SCHEDULES to ensure consistent schedule names
                                // API data may have different designations (e.g. "5S" for stainless) that break calculations
                                const fallbackSchedules = FALLBACK_PIPE_SCHEDULES[entry.specs.nominalBoreMm] || [];
                                const mapSchedules = availableSchedulesMap[entry.id] || [];
                                // Only use API data if no fallback exists
                                const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                                const minimumWT = entry.minimumWallThickness || 0;

                                // Filter to only show schedules >= minimum wall thickness, sorted by wall thickness
                                // Handle both camelCase and snake_case property names
                                const eligibleSchedules = allSchedules
                                  .filter((dim: any) => {
                                    const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                    return wt >= minimumWT;
                                  })
                                  .sort((a: any, b: any) => {
                                    const wtA = a.wallThicknessMm || a.wall_thickness_mm || 0;
                                    const wtB = b.wallThicknessMm || b.wall_thickness_mm || 0;
                                    return wtA - wtB;
                                  });

                                // Find the recommended schedule (closest to minimum wall thickness)
                                const recommendedSchedule = eligibleSchedules.length > 0 ? eligibleSchedules[0] : null;

                                if (eligibleSchedules.length === 0) {
                                  return null; // Will show "No schedules available" below
                                }

                                return eligibleSchedules.map((dim: any) => {
                                  const scheduleValue = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString() || 'Unknown';
                                  const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                  const isRecommended = recommendedSchedule && dim.id === recommendedSchedule.id;
                                  const label = isRecommended
                                    ? `★ ${scheduleValue} (${wt}mm) - RECOMMENDED`
                                    : `${scheduleValue} (${wt}mm)`;
                                  return (
                                    <option key={dim.id} value={scheduleValue}>
                                      {label}
                                    </option>
                                  );
                                });
                              })()}
                              {(() => {
                                // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                                const fallbackSchedules = FALLBACK_PIPE_SCHEDULES[entry.specs.nominalBoreMm] || [];
                                const mapSchedules = availableSchedulesMap[entry.id] || [];
                                const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                                const minimumWT = entry.minimumWallThickness || 0;
                                const eligibleSchedules = allSchedules.filter((dim: any) => {
                                  const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                  return wt >= minimumWT;
                                });
                                if (eligibleSchedules.length === 0) {
                                  return <option disabled>No schedules available - select nominal bore first</option>;
                                }
                                return null;
                              })()}
                            </select>
                            {entry.minimumSchedule && entry.minimumWallThickness && (
                              <p className="text-xs text-green-700 mt-1">
                                ASME B31.3 min WT: {Number(entry.minimumWallThickness).toFixed(2)}mm (schedule {entry.minimumSchedule} selected: {entry.specs.wallThicknessMm?.toFixed(2)}mm)
                              </p>
                            )}
                          </div>

                          {/* Wall Thickness (Read-only, derived from schedule) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Wall Thickness (mm)
                            </label>
                            <input
                              type="text"
                              value={entry.specs.wallThicknessMm ? `${entry.specs.wallThicknessMm}mm` : 'Select schedule above'}
                              readOnly
                              className="w-full px-2 py-1.5 text-black bg-gray-100 border border-gray-300 rounded-md text-xs"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <select
                          value={entry.specs.scheduleNumber || ''}
                          onChange={(e) => {
                            const newSchedule = e.target.value;

                            // Find the selected dimension to get wall thickness
                            // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                            const fallbackSchedules = FALLBACK_PIPE_SCHEDULES[entry.specs.nominalBoreMm] || [];
                            const mapSchedules = availableSchedulesMap[entry.id] || [];
                            const availableSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                            const selectedDimension = availableSchedules.find((dim: any) => {
                              const schedName = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString();
                              return schedName === newSchedule;
                            });

                            // Use wall thickness from data (handle both naming conventions)
                            const autoWallThickness = selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;

                            const updatedEntry: any = {
                              specs: {
                                ...entry.specs,
                                scheduleNumber: newSchedule,
                                wallThicknessMm: autoWallThickness || entry.specs.wallThicknessMm
                              }
                            };

                            // Auto-update description
                            updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Select schedule...</option>
                          {(() => {
                            // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                            const fallbackSchedules = FALLBACK_PIPE_SCHEDULES[entry.specs.nominalBoreMm] || [];
                            const mapSchedules = availableSchedulesMap[entry.id] || [];
                            const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;

                            if (allSchedules.length === 0) {
                              return <option disabled>No schedules available - select nominal bore first</option>;
                            }

                            return allSchedules.map((dim: any) => {
                              const scheduleValue = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString() || 'Unknown';
                              const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                              const label = `${scheduleValue} (${wt}mm)`;
                              return (
                                <option key={dim.id} value={scheduleValue}>
                                  {label}
                                </option>
                              );
                            });
                          })()}
                        </select>
                        <p className="mt-0.5 text-xs text-gray-700">
                          Select a schedule from available options for the selected nominal bore and steel specification.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Pipe Lengths */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Length of Each Pipe (m) *
                    </label>
                    <div className="flex gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 6.1;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-black text-xs rounded border ${entry.specs.individualPipeLength === 6.1 ? 'bg-blue-100 border-blue-300 font-medium' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
                      >
                        6.1m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 9.144;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-black text-xs rounded border ${entry.specs.individualPipeLength === 9.144 ? 'bg-blue-100 border-blue-300 font-medium' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
                      >
                        9.144m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 12.192;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-black text-xs rounded border ${entry.specs.individualPipeLength === 12.192 ? 'bg-blue-100 border-blue-300 font-medium' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
                      >
                        12.192m (Standard)
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      value={entry.specs.individualPipeLength || ''}
                      onChange={(e) => {
                        const pipeLength = e.target.value ? Number(e.target.value) : undefined;
                        const numPipes = pipeLength && entry.specs.quantityType === 'number_of_pipes'
                          ? (entry.specs.quantityValue || 1)
                          : pipeLength ? Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength) : undefined;
                        const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                        const newDescription = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, individualPipeLength: pipeLength },
                          calculatedPipes: numPipes,
                          description: newDescription
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Enter length or select above"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-700">
                      Standard imported lengths: 6.1m, 9.144m, or 12.192m (can be custom)
                    </p>
                  </div>
                </div>

                {/* Column 2 - Quantities & Configurations */}
                <div className="space-y-3">
                  <h4 className="text-base font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
                    Quantities & Configuration
                  </h4>

                  {/* Pipe End Configuration - NEW FIELD */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Pipe End Configuration *
                    </label>
                    <select
                      value={entry.specs.pipeEndConfiguration || 'PE'}
                      onChange={async (e) => {
                        const newConfig = e.target.value as any;
                        
                        // Get weld details for this configuration
                        let weldDetails = null;
                        try {
                          weldDetails = await getPipeEndConfigurationDetails(newConfig);
                        } catch (error) {
                          console.warn('Could not get pipe end configuration details:', error);
                        }
                        
                        const updatedEntry: any = {
                          specs: { ...entry.specs, pipeEndConfiguration: newConfig },
                          // Store weld count information if available
                          ...(weldDetails && { weldInfo: weldDetails })
                        };
                        
                        // Auto-update description
                        updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });
                        
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                    >
                      {PIPE_END_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="mt-0.5 text-xs text-gray-700">
                      Select how the pipe ends should be configured
                      {/* Show weld count based on selected configuration */}
                      {entry.specs.pipeEndConfiguration && (
                        <span className="ml-2 text-blue-600 font-medium">
                          • {getWeldCountPerPipe(entry.specs.pipeEndConfiguration)} weld{getWeldCountPerPipe(entry.specs.pipeEndConfiguration) !== 1 ? 's' : ''} per pipe
                        </span>
                      )}
                    </p>
                    {/* Weld Thickness Display - from fitting wall thickness tables (ASME B31.1) */}
                    {(() => {
                      const weldCount = getWeldCountPerPipe(entry.specs.pipeEndConfiguration || 'PE');
                      const dn = entry.specs.nominalBoreMm;
                      const schedule = entry.specs.scheduleNumber || '';

                      // Carbon Steel Weld Fittings wall thickness lookup (WPB Grade, ASME B31.1)
                      const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                        'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                        'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                        'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                      };

                      // Determine fitting class from schedule (STD, XH, or XXH)
                      const scheduleUpper = schedule.toUpperCase();
                      const fittingClass =
                        scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                          ? 'XXH'
                          : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                            ? 'XH'
                            : 'STD';

                      const weldThickness = dn ? FITTING_WALL_THICKNESS[fittingClass]?.[dn] : null;

                      // Show weld thickness if pipe has welds and DN is set
                      if (weldCount === 0) {
                        return null; // No welds for PE configuration
                      }

                      if (!dn) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-700">
                              Select Nominal Bore to see recommended weld thickness
                            </p>
                          </div>
                        );
                      }

                      if (!weldThickness) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-700">
                              Weld thickness data not available for DN {dn}mm
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-xs font-bold text-green-800">
                            Recommended Weld Thickness: {weldThickness.toFixed(2)} mm
                          </p>
                          <p className="text-xs text-green-700">
                            Based on {fittingClass} fitting class (ASME B31.1)
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Total Length - MOVED ABOVE QUANTITY */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Total Length of Line (m) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={
                        entry.specs.quantityType === 'total_length'
                          ? Number(entry.specs.quantityValue || 0).toFixed(3)
                          : Number((entry.specs.quantityValue || 1) * (entry.specs.individualPipeLength || 0)).toFixed(3)
                      }
                      onChange={(e) => {
                        const totalLength = Number(e.target.value);
                        const updatedEntry = calculateQuantities(entry, 'totalLength', totalLength);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="8000"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-700">
                      Total pipeline length required
                    </p>
                  </div>

                  {/* Quantity of Items - MOVED BELOW TOTAL LENGTH */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Quantity of Items (Each) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={
                        entry.specs.quantityType === 'number_of_pipes'
                          ? entry.specs.quantityValue || 1
                          : entry.specs.individualPipeLength ? Math.ceil((entry.specs.quantityValue || 0) / entry.specs.individualPipeLength) : 0
                      }
                      onChange={(e) => {
                        const numberOfPipes = Number(e.target.value);
                        const updatedEntry = calculateQuantities(entry, 'numberOfPipes', numberOfPipes);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="1000"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-700">
                      Number of individual pipes required
                    </p>
                  </div>

                  {/* Flange Specifications */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <label className="block text-xs font-semibold text-gray-900">
                        Flanges
                        {entry.hasFlangeOverride ? (
                          <span className="text-blue-600 text-xs ml-2">(Override Active)</span>
                        ) : globalSpecs?.flangeStandardId ? (
                          <span className="text-green-600 text-xs ml-2">(From Global Specs)</span>
                        ) : (
                          <span className="text-orange-600 text-xs ml-2">(Item Specific)</span>
                        )}
                      </label>
                      {globalSpecs?.flangeStandardId && (
                        <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                          <span className="text-gray-500 italic">(click here to change flanges)</span>
                          <input
                            type="checkbox"
                            checked={entry.hasFlangeOverride || false}
                            onChange={(e) => {
                              const override = e.target.checked;
                              onUpdateEntry(entry.id, {
                                hasFlangeOverride: override,
                                flangeOverrideConfirmed: false,
                                specs: override ? {
                                  ...entry.specs,
                                  // Copy global values to entry specs when enabling override
                                  flangeStandardId: entry.specs.flangeStandardId || globalSpecs?.flangeStandardId,
                                  flangePressureClassId: entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId
                                } : {
                                  ...entry.specs,
                                  flangeStandardId: undefined,
                                  flangePressureClassId: undefined
                                }
                              });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">Override</span>
                        </label>
                      )}
                    </div>

                    {/* Warning if deviating from recommended pressure class */}
                    {(() => {
                      const currentClassId = entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                      const recommendedClassId = globalSpecs?.flangePressureClassId;
                      const isOverride = entry.hasFlangeOverride && currentClassId && recommendedClassId && currentClassId !== recommendedClassId;
                      
                      if (isOverride) {
                        const currentClass = masterData.pressureClasses?.find((p: any) => p.id === currentClassId);
                        const recommendedClass = masterData.pressureClasses?.find((p: any) => p.id === recommendedClassId);
                        return (
                          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mb-2">
                            <div className="flex items-start gap-2">
                              <span className="text-red-600 text-base">⚠️</span>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-red-900">Pressure Rating Override</p>
                                <p className="text-xs text-red-700 mt-0.5">
                                  Selected <span className="font-semibold">{currentClass?.designation}</span> instead of recommended{' '}
                                  <span className="font-semibold">{recommendedClass?.designation}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {globalSpecs?.flangeStandardId && !entry.hasFlangeOverride ? (
                      <div className="bg-green-50 p-2 rounded-md space-y-2">
                        <p className="text-green-800 text-xs">
                          Using global flange standard from specifications page
                        </p>
                        {/* Display recommended flange specification */}
                        {globalSpecs?.flangePressureClassId && (
                          <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                            <p className="text-blue-800 text-xs font-semibold">
                              Recommended Flange Spec:
                              <span className="ml-1">
                                {(() => {
                                  // Find pressure class designation
                                  const pressureClass = masterData.pressureClasses.find(
                                    (pc: any) => pc.id === globalSpecs.flangePressureClassId
                                  );
                                  // Find flange standard code
                                  const flangeStandard = masterData.flangeStandards.find(
                                    (fs: any) => fs.id === globalSpecs.flangeStandardId
                                  );

                                  if (pressureClass && flangeStandard) {
                                    return `${flangeStandard.code}/${pressureClass.designation}`;
                                  }
                                  return 'N/A';
                                })()}
                              </span>
                            </p>
                            <p className="text-blue-600 text-xs mt-1">
                              For {entry.specs.workingPressureBar || globalSpecs?.workingPressureBar || 'N/A'} bar working pressure
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Show confirmed override summary when confirmed */}
                        {entry.flangeOverrideConfirmed ? (
                          <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                <span className="text-green-600">✓</span> Item-Specific Flange Confirmed
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: false })}
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="bg-white p-2 rounded border border-blue-200">
                              <p className="text-sm font-bold text-blue-800">
                                {(() => {
                                  const flangeStandard = masterData.flangeStandards.find(
                                    (fs: any) => fs.id === entry.specs.flangeStandardId
                                  );
                                  const pressureClass = masterData.pressureClasses.find(
                                    (pc: any) => pc.id === entry.specs.flangePressureClassId
                                  );
                                  if (flangeStandard && pressureClass) {
                                    return `${flangeStandard.code} / ${pressureClass.designation}`;
                                  }
                                  return 'N/A';
                                })()}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                This flange specification is locked for this item only
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <select
                              value={entry.specs.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                              onChange={(e) => {
                                const newFlangeStandardId = e.target.value ? Number(e.target.value) : undefined;
                                const updatedEntry = { ...entry, specs: { ...entry.specs, flangeStandardId: newFlangeStandardId } };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangeStandardId: newFlangeStandardId },
                                  description: newDescription
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                              <option value="">Select flange standard...</option>
                              {masterData.flangeStandards.map((standard: any) => (
                                <option key={standard.id} value={standard.id}>
                                  {standard.code}
                                </option>
                              ))}
                            </select>

                            <select
                              value={entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                              onChange={(e) => {
                                const newFlangePressureClassId = e.target.value ? Number(e.target.value) : undefined;
                                const updatedEntry = { ...entry, specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId } };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId },
                                  description: newDescription
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                              <option value="">Select pressure class...</option>
                              {masterData.pressureClasses.map((pc: any) => (
                                <option key={pc.id} value={pc.id}>
                                  {pc.designation}
                                </option>
                              ))}
                            </select>

                            {/* Confirm/Edit Buttons for Override */}
                            {entry.hasFlangeOverride && entry.specs.flangeStandardId && entry.specs.flangePressureClassId && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: true })}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <span>✓</span> Confirm Override
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Reset to global specs
                                    onUpdateEntry(entry.id, {
                                      hasFlangeOverride: false,
                                      flangeOverrideConfirmed: false,
                                      specs: {
                                        ...entry.specs,
                                        flangeStandardId: undefined,
                                        flangePressureClassId: undefined
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                >
                                  Use Global
                                </button>
                              </div>
                            )}

                            {/* Individual Item Flange Specification Display */}
                            {entry.specs.flangeStandardId && entry.specs.flangePressureClassId && !entry.hasFlangeOverride && (
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mt-2">
                                <h5 className="text-sm font-semibold text-blue-800 mb-2">
                                  Item-Specific Flange Specification
                                </h5>
                                <div className="bg-white p-2 rounded border border-blue-200">
                                  <p className="text-sm font-medium text-blue-900">
                                    Selected Specification:
                                    <span className="ml-2 font-bold text-lg text-blue-800">
                                      {(() => {
                                        const flangeStandard = masterData.flangeStandards.find(
                                          (fs: any) => fs.id === entry.specs.flangeStandardId
                                        );
                                        const pressureClass = masterData.pressureClasses.find(
                                          (pc: any) => pc.id === entry.specs.flangePressureClassId
                                        );

                                        if (flangeStandard && pressureClass) {
                                          return `${flangeStandard.code}/${pressureClass.designation}`;
                                        }
                                        return 'N/A';
                                      })()}
                                    </span>
                                  </p>
                                  <div className="text-xs text-blue-600 mt-1 grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="font-medium">Standard:</span> {masterData.flangeStandards.find((fs: any) => fs.id === entry.specs.flangeStandardId)?.code || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Pressure Class:</span> {masterData.pressureClasses.find((pc: any) => pc.id === entry.specs.flangePressureClassId)?.designation || 'N/A'}
                                    </div>
                                  </div>
                                  <p className="text-blue-600 text-xs mt-2">
                                    💡 This item uses individual flange specification (overrides global settings)
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* 3D Pipe Preview - below specifications, above calculations */}
              {entry.specs?.nominalBoreMm && (
                <div className="mt-4 relative">
                  {!hiddenDrawings[entry.id] && (
                    <Pipe3DPreview
                      length={entry.specs.individualPipeLength || 12.192}
                      outerDiameter={entry.calculation?.outsideDiameterMm || (entry.specs.nominalBoreMm * 1.1)}
                      wallThickness={entry.calculation?.wallThicknessMm || entry.specs.wallThicknessMm || 5}
                      endConfiguration={entry.specs.pipeEndConfiguration || 'PE'}
                      materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                    />
                  )}
                  <button
                    onClick={() => setHiddenDrawings(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                    className="absolute bottom-2 right-2 px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md transition-colors z-10"
                  >
                    {hiddenDrawings[entry.id] ? 'Show Drawing' : 'Hide Drawing'}
                  </button>
                </div>
              )}

              {/* Remove Item Button */}
              {entries.length > 1 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => onRemoveEntry(entry.id)}
                    className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                  >
                    Remove Item
                  </button>
                </div>
              )}

              {/* Calculation Results - Full Width Compact Layout */}
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
                  📊 Calculation Results
                </h4>

                {entry.calculation ? (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                    {/* Compact horizontal grid layout */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {/* Quantity of Pipes */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Qty Pipes</p>
                        <p className="text-lg font-bold text-gray-900">{entry.calculation.calculatedPipeCount}</p>
                        <p className="text-xs text-gray-500">pieces</p>
                      </div>

                      {/* Total Length */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Total Length</p>
                        <p className="text-lg font-bold text-gray-900">{entry.calculation.calculatedTotalLength?.toFixed(1)}m</p>
                      </div>

                      {/* Total System Weight */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Total Weight</p>
                        <p className="text-lg font-bold text-blue-900">{formatWeight(entry.calculation.totalSystemWeight)}</p>
                        <p className="text-xs text-gray-500">
                          (Pipe: {formatWeight(entry.calculation.totalPipeWeight)})
                        </p>
                      </div>

                      {/* Flanges */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Flanges</p>
                        <p className="text-lg font-bold text-gray-900">
                          {(() => {
                            const flangesPerPipe = getFlangesPerPipe(entry.specs.pipeEndConfiguration || 'PE');
                            return flangesPerPipe * (entry.calculation?.calculatedPipeCount || 0);
                          })()}
                        </p>
                        <p className="text-xs text-gray-500">{formatWeight(entry.calculation.totalFlangeWeight)}</p>
                      </div>

                      {/* Flange Welds */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Flange Welds</p>
                        <p className="text-lg font-bold text-gray-900">{entry.calculation.numberOfFlangeWelds}</p>
                        <p className="text-xs text-gray-500">{entry.calculation.totalFlangeWeldLength?.toFixed(2)}m</p>
                        {(() => {
                          const dn = entry.specs.nominalBoreMm;
                          const schedule = entry.specs.scheduleNumber || '';
                          if (!dn) return null;

                          // Determine fitting class from schedule
                          const scheduleUpper = schedule.toUpperCase();
                          const fittingClass =
                            scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                              ? 'XXH'
                              : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                                ? 'XH'
                                : 'STD';

                          // Carbon Steel Weld Fittings wall thickness (ASME B31.1)
                          const FITTING_WT: Record<string, Record<number, number>> = {
                            'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                            'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                            'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                          };

                          const wt = FITTING_WT[fittingClass]?.[dn];
                          if (!wt) return null;
                          return (
                            <div className="mt-1 p-1 bg-green-100 rounded">
                              <p className="text-xs font-bold text-green-700">Weld: {wt.toFixed(2)}mm</p>
                              <p className="text-[10px] text-green-600">{fittingClass}</p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Pipe End Config */}
                      <div className="bg-green-50 p-2 rounded text-center">
                        <p className="text-xs text-green-700 font-medium">Config Welds</p>
                        <p className="text-lg font-bold text-green-900">
                          {getWeldCountPerPipe(entry.specs.pipeEndConfiguration || 'PE') * (entry.calculation?.calculatedPipeCount || 0)}
                        </p>
                        <p className="text-xs text-green-600">{entry.specs.pipeEndConfiguration || 'PE'}</p>
                      </div>
                    </div>

                    {/* Weight breakdown (compact) */}
                    {(entry.calculation.totalBoltWeight > 0 || entry.calculation.totalNutWeight > 0) && (
                      <div className="mt-2 flex gap-4 text-xs text-gray-600 justify-center">
                        {entry.calculation.totalBoltWeight > 0 && (
                          <span>Bolts: {formatWeight(entry.calculation.totalBoltWeight)}</span>
                        )}
                        {entry.calculation.totalNutWeight > 0 && (
                          <span>Nuts: {formatWeight(entry.calculation.totalNutWeight)}</span>
                        )}
                      </div>
                    )}

                    {/* Weld Thickness Recommendation */}
                    {(() => {
                      const dn = entry.specs.nominalBoreMm;
                      const pressure = globalSpecs?.workingPressureBar || 0;
                      const temp = entry.specs.workingTemperatureC || globalSpecs?.workingTemperatureC || 20;
                      const schedule = entry.specs.scheduleNumber;

                      if (!dn || !pressure) return null;

                      const recommendation = recommendWallThicknessCarbonPipe(dn, pressure, temp, schedule);
                      if (!recommendation) return null;

                      return (
                        <div className={`mt-3 p-3 rounded-lg border-2 ${recommendation.isAdequate ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {recommendation.isAdequate ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            <span className={`text-sm font-semibold ${recommendation.isAdequate ? 'text-green-800' : 'text-amber-800'}`}>
                              Weld Thickness Verification
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="text-gray-600">Design Conditions:</div>
                            <div className="font-medium text-gray-900">{pressure} bar @ {temp}°C</div>
                            <div className="text-gray-600">Recommended Schedule:</div>
                            <div className="font-medium text-gray-900">{recommendation.recommendedSchedule}</div>
                            <div className="text-gray-600">Recommended Wall:</div>
                            <div className="font-medium text-gray-900">{recommendation.recommendedWallMm.toFixed(2)} mm</div>
                            <div className="text-gray-600">Max Allowable Pressure:</div>
                            <div className="font-medium text-gray-900">{recommendation.maxPressureBar} bar</div>
                            {schedule && (
                              <>
                                <div className="text-gray-600">Selected Schedule:</div>
                                <div className={`font-medium ${recommendation.isAdequate ? 'text-green-700' : 'text-amber-700'}`}>
                                  {schedule} {recommendation.currentWallMm ? `(${recommendation.currentWallMm.toFixed(2)} mm)` : ''}
                                </div>
                              </>
                            )}
                          </div>
                          {recommendation.warning && (
                            <div className="mt-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                              {recommendation.warning}
                            </div>
                          )}
                          {recommendation.isAdequate && (
                            <div className="mt-2 text-xs text-green-700">
                              Selected schedule meets ASME B31.3 / ASTM A106 requirements
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                    <p className="text-sm text-gray-600 text-center">
                      Fill in pipe specifications to see calculated results
                    </p>
                    {/* Debug info */}
                    <p className="text-xs text-gray-400 text-center mt-1">
                      NB={entry.specs.nominalBoreMm || '-'}, Sch={entry.specs.scheduleNumber || '-'}, Length={entry.specs.individualPipeLength || '-'}, Qty={entry.specs.quantityValue || '-'}
                    </p>
                    {entry.specs.nominalBoreMm && entry.specs.scheduleNumber && entry.specs.individualPipeLength && entry.specs.quantityValue && globalSpecs?.workingPressureBar && (
                      <div className="text-center mt-2">
                        <button
                          type="button"
                          onClick={() => onCalculate && onCalculate()}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Calculate Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>


            </div>
            )}
          </div>
        ))}

        {/* Total Summary */}
        <div className="border-2 border-blue-200 rounded-md p-3 bg-blue-50">
          {/* Header row with title and add buttons */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-bold text-blue-900">Project Summary</h3>
            {/* Add Item Buttons - inline with title */}
            <div className="flex gap-2">
              <button
                onClick={() => onAddEntry()}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-md border border-blue-300 transition-colors"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold text-blue-700">Pipe</span>
              </button>
              <button
                onClick={() => onAddBendEntry()}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-md border border-purple-300 transition-colors"
              >
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold text-purple-700">Bend</span>
              </button>
              <button
                onClick={() => onAddFittingEntry()}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-md border border-green-300 transition-colors"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold text-green-700">Fitting</span>
              </button>
            </div>
          </div>
          {/* Items table - each item on its own line */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-300">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-blue-800">Item #</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-blue-800">Description</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">Qty</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-blue-800">Weight/Item</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-blue-800">Line Weight</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: any, index: number) => {
                  const itemNumber = entry.clientItemNumber || `#${index + 1}`;
                  const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0;
                  const totalWeight = entry.itemType === 'bend' || entry.itemType === 'fitting'
                    ? (entry.calculation?.totalWeight || 0)
                    : (entry.calculation?.totalSystemWeight || 0);
                  const weightPerItem = qty > 0 ? totalWeight / qty : 0;

                  // Calculate BNW info if fasteners_gaskets is selected and item has flanges
                  const showBnw = requiredProducts?.includes('fasteners_gaskets');
                  const flangesPerPipe = entry.itemType === 'straight_pipe' || !entry.itemType
                    ? getFlangesPerPipe(entry.specs?.pipeEndConfiguration || 'PE')
                    : 0;
                  const totalFlanges = flangesPerPipe * qty;

                  // Get pressure class for BNW lookup
                  const pressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                  const pressureClass = pressureClassId
                    ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
                    : 'PN16';
                  const nbMm = entry.specs?.nominalBoreMm || 100;

                  // Get BNW set info
                  const bnwInfo = getBnwSetInfo(nbMm, pressureClass || 'PN16');
                  // Weight per set = weight for 1 flange (holesPerFlange × weightPerHole)
                  const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
                  const bnwTotalWeight = bnwWeightPerSet * qty;

                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="border-b border-blue-100 hover:bg-blue-100/50">
                        <td className="py-2 px-2 font-medium text-blue-900">{itemNumber}</td>
                        <td className="py-2 px-2 text-gray-800 max-w-xs truncate" title={entry.description}>
                          {entry.description || 'No description'}
                        </td>
                        <td className="py-2 px-2 text-center font-medium text-gray-900">{qty}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{formatWeight(weightPerItem)}</td>
                        <td className="py-2 px-2 text-right font-semibold text-blue-900">{formatWeight(totalWeight)}</td>
                      </tr>
                      {/* BNW Line Item - only show if fasteners selected and item has flanges */}
                      {showBnw && totalFlanges > 0 && (
                        <tr className="border-b border-orange-100 bg-orange-50/50 hover:bg-orange-100/50">
                          <td className="py-2 px-2 font-medium text-orange-800">BNW-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                          <td className="py-2 px-2 text-orange-700 text-xs">
                            {bnwInfo.boltSize} Bolt/Nut/Washer Sets ({bnwInfo.holesPerFlange} per set)
                          </td>
                          <td className="py-2 px-2 text-center font-medium text-orange-800">{qty}</td>
                          <td className="py-2 px-2 text-right text-orange-700">{formatWeight(bnwWeightPerSet)}</td>
                          <td className="py-2 px-2 text-right font-semibold text-orange-800">{formatWeight(bnwTotalWeight)}</td>
                        </tr>
                      )}
                      {/* Gasket Line Item - only show if fasteners selected and item has flanges */}
                      {showBnw && totalFlanges > 0 && globalSpecs?.gasketType && (() => {
                        const gasketWeight = getGasketWeight(globalSpecs.gasketType, entry.specs?.nominalBoreMm || 100);
                        const gasketTotalWeight = gasketWeight * qty;
                        return (
                          <tr className="border-b border-green-100 bg-green-50/50 hover:bg-green-100/50">
                            <td className="py-2 px-2 font-medium text-green-800">GAS-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                            <td className="py-2 px-2 text-green-700 text-xs">
                              {globalSpecs.gasketType} Gasket (1 per pipe)
                            </td>
                            <td className="py-2 px-2 text-center font-medium text-green-800">{qty}</td>
                            <td className="py-2 px-2 text-right text-green-700">{gasketWeight.toFixed(2)} kg</td>
                            <td className="py-2 px-2 text-right font-semibold text-green-800">{gasketTotalWeight.toFixed(2)} kg</td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-blue-400 bg-blue-100">
                  <td className="py-2 px-2 font-bold text-blue-900" colSpan={2}>TOTAL</td>
                  <td className="py-2 px-2 text-center font-bold text-blue-900">
                    {entries.reduce((total: number, entry: any) => {
                      return total + (entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0);
                    }, 0)}
                  </td>
                  <td className="py-2 px-2"></td>
                  <td className="py-2 px-2 text-right font-bold text-blue-900">{formatWeight(getTotalWeight())}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewSubmitStep({ entries, rfqData, onSubmit, onPrevStep, errors, loading }: any) {
  // Use unified items array that includes both straight pipes and bends
  const allItems = rfqData.items || entries || [];
  
  const getTotalWeight = () => {
    return allItems.reduce((total: number, entry: any) => {
      // Bends and fittings use totalWeight, straight pipes use totalSystemWeight
      const weight = (entry.itemType === 'bend' || entry.itemType === 'fitting')
        ? (entry.calculation?.totalWeight || 0)
        : (entry.calculation?.totalSystemWeight || 0);
      return total + weight;
    }, 0);
  };

  const getTotalLength = () => {
    return allItems.reduce((total: number, entry: any) => {
      // For bends and fittings, we don't have a total length concept, just count quantity
      // For straight pipes, use quantityValue (meters)
      if (entry.itemType === 'bend' || entry.itemType === 'fitting') {
        return total; // Bends and fittings don't add to total pipeline length
      }
      return total + (entry.specs.quantityValue || 0);
    }, 0);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Review & Submit RFQ</h2>
      
      <div className="space-y-8">
        {/* Project Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Project Name</p>
              <p className="font-medium text-gray-900">{rfqData.projectName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium text-gray-900">{rfqData.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Required Date</p>
              <p className="font-medium text-gray-900">{rfqData.requiredDate || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Email</p>
              <p className="font-medium text-gray-900">{rfqData.customerEmail || 'Not provided'}</p>
            </div>
          </div>
          {rfqData.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Description</p>
              <p className="font-medium text-gray-900">{rfqData.description}</p>
            </div>
          )}
        </div>

        {/* All Items Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Item Requirements</h3>
          <div className="space-y-4">
            {allItems.map((entry: any, index: number) => (
              <div key={`${entry.id}-${entry.itemType}-${index}`} className={`border border-gray-100 rounded-lg p-4 ${
                entry.itemType === 'bend' ? 'bg-purple-50' : 
                entry.itemType === 'fitting' ? 'bg-green-50' : 
                'bg-gray-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      entry.itemType === 'bend' ? 'bg-purple-200 text-purple-800' : 
                      entry.itemType === 'fitting' ? 'bg-green-200 text-green-800' : 
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {entry.itemType === 'bend' ? 'Bend' : 
                       entry.itemType === 'fitting' ? 'Fitting' : 
                       'Pipe'}
                    </span>
                    <h4 className="font-medium text-gray-800">Item #{index + 1}</h4>
                  </div>
                  <span className="text-sm text-gray-600">
                    {entry.calculation ? 
                      (entry.itemType === 'bend' || entry.itemType === 'fitting')
                        ? `${entry.calculation.totalWeight?.toFixed(2) || 0} kg`
                        : `${entry.calculation.totalSystemWeight?.toFixed(2) || 0} kg`
                      : 'Not calculated'
                    }
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                
                {/* Display fields based on item type */}
                {entry.itemType === 'bend' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                    <div>NB: {entry.specs.nominalBoreMm}mm</div>
                    <div>Angle: {entry.specs.bendDegrees}°</div>
                    <div>Type: {entry.specs.bendType}</div>
                    <div>Qty: {entry.specs.quantityValue || 1}</div>
                    {entry.specs.numberOfTangents > 0 && (
                      <div className="col-span-2">Tangents: {entry.specs.numberOfTangents}</div>
                    )}
                    {entry.specs.numberOfStubs > 0 && (
                      <div className="col-span-2">Stubs: {entry.specs.numberOfStubs}</div>
                    )}
                  </div>
                ) : entry.itemType === 'fitting' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                    <div>Type: {entry.specs.fittingType || 'N/A'}</div>
                    <div>Standard: {entry.specs.fittingStandard || 'N/A'}</div>
                    <div>NB: {entry.specs.nominalDiameterMm}mm</div>
                    <div>Qty: {entry.specs.quantityValue || 1}</div>
                    {entry.specs.angleRange && (
                      <div className="col-span-2">Angle Range: {entry.specs.angleRange}</div>
                    )}
                    {entry.specs.pipeLengthAMm && (
                      <div>Length A: {entry.specs.pipeLengthAMm}mm</div>
                    )}
                    {entry.specs.pipeLengthBMm && (
                      <div>Length B: {entry.specs.pipeLengthBMm}mm</div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                    <div>NB: {entry.specs.nominalBoreMm}mm</div>
                    <div>Pressure: {entry.specs.workingPressureBar} bar</div>
                    <div>Schedule: {entry.specs.scheduleNumber || `${entry.specs.wallThicknessMm}mm WT`}</div>
                    <div>Length: {Number(entry.specs.quantityValue || 0).toFixed(3)}m</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Total Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Entries</p>
              <p className="text-2xl font-bold text-blue-900">{allItems.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Length</p>
              <p className="text-2xl font-bold text-blue-900">{getTotalLength().toFixed(1)} m</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Weight</p>
              <p className="text-2xl font-bold text-blue-900">
                {getTotalWeight().toFixed(2)} kg
              </p>
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={onPrevStep}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              ← Previous Step
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting RFQ...' : 'Submit RFQ for Quotation'}
            </button>
          </div>
          
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
              <ul className="text-sm text-red-600 space-y-1">
                {Object.entries(errors).map(([key, message]) => (
                  <li key={key}>• {message as string}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MultiStepStraightPipeRfqForm({ onSuccess, onCancel }: Props) {
  const {
    currentStep,
    setCurrentStep,
    rfqData,
    updateRfqField,
    updateGlobalSpecs,
    addStraightPipeEntry,
    addBendEntry,
    addFittingEntry,
    updateStraightPipeEntry,
    updateItem,
    removeStraightPipeEntry,
    updateEntryCalculation,
    getTotalWeight,
    getTotalValue,
    nextStep: originalNextStep,
    prevStep,
  } = useRfqForm();

  const [masterData, setMasterData] = useState<MasterData>({
    steelSpecs: [],
    flangeStandards: [],
    pressureClasses: [],
    nominalBores: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);
  // Store available schedules per entry: { entryId: PipeDimension[] }
  const [availableSchedulesMap, setAvailableSchedulesMap] = useState<Record<string, any[]>>({});
  // Store available pressure classes for selected standard
  const [availablePressureClasses, setAvailablePressureClasses] = useState<any[]>([]);
  // Store dynamic bend options per bend type
  const [bendOptionsCache, setBendOptionsCache] = useState<Record<string, { nominalBores: number[]; degrees: number[] }>>({});
  // Store pending documents to upload
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  // Ref for scrollable content container
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Document upload handlers
  const handleAddDocument = (file: File) => {
    const newDoc: PendingDocument = {
      file,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setPendingDocuments(prev => [...prev, newDoc]);
  };

  const handleRemoveDocument = (id: string) => {
    setPendingDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Load master data from API
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setIsLoadingMasterData(true);
        const { masterDataApi } = await import('@/app/lib/api/client');
        
        const [steelSpecs, flangeStandards, pressureClasses, nominalBores] = await Promise.all([
          masterDataApi.getSteelSpecifications(),
          masterDataApi.getFlangeStandards(),
          masterDataApi.getFlangePressureClasses(),
          masterDataApi.getNominalBores()
        ]);

        setMasterData({
          steelSpecs,
          flangeStandards,
          pressureClasses,
          nominalBores
        });
      } catch (error) {
        // Silently handle backend unavailable - use fallback data
        if (error instanceof Error && error.message !== 'Backend unavailable') {
          console.error('Error loading master data:', error);
        }
        // Fallback steel specifications
        const fallbackSteelSpecs = [
          // South African Standards
          { id: 1, steelSpecName: 'SABS 62 ERW Medium' },
          { id: 2, steelSpecName: 'SABS 62 ERW Heavy' },
          { id: 3, steelSpecName: 'SABS 719 ERW' },
          // Carbon Steel - ASTM A106 (High-Temp Seamless)
          { id: 4, steelSpecName: 'ASTM A106 Grade A' },
          { id: 5, steelSpecName: 'ASTM A106 Grade B' },
          { id: 6, steelSpecName: 'ASTM A106 Grade C' },
          // Carbon Steel - ASTM A53 (General Purpose)
          { id: 7, steelSpecName: 'ASTM A53 Grade A' },
          { id: 8, steelSpecName: 'ASTM A53 Grade B' },
          // Line Pipe - API 5L (Oil/Gas Pipelines)
          { id: 9, steelSpecName: 'API 5L Grade A' },
          { id: 10, steelSpecName: 'API 5L Grade B' },
          { id: 11, steelSpecName: 'API 5L X42' },
          { id: 12, steelSpecName: 'API 5L X46' },
          { id: 13, steelSpecName: 'API 5L X52' },
          { id: 14, steelSpecName: 'API 5L X56' },
          { id: 15, steelSpecName: 'API 5L X60' },
          { id: 16, steelSpecName: 'API 5L X65' },
          { id: 17, steelSpecName: 'API 5L X70' },
          { id: 18, steelSpecName: 'API 5L X80' },
          // Low Temperature - ASTM A333
          { id: 19, steelSpecName: 'ASTM A333 Grade 1' },
          { id: 20, steelSpecName: 'ASTM A333 Grade 3' },
          { id: 21, steelSpecName: 'ASTM A333 Grade 6' },
          // Heat Exchangers/Boilers
          { id: 22, steelSpecName: 'ASTM A179' },
          { id: 23, steelSpecName: 'ASTM A192' },
          // Structural Tubing - ASTM A500
          { id: 24, steelSpecName: 'ASTM A500 Grade A' },
          { id: 25, steelSpecName: 'ASTM A500 Grade B' },
          { id: 26, steelSpecName: 'ASTM A500 Grade C' },
          // Alloy Steel - ASTM A335 (Chrome-Moly)
          { id: 27, steelSpecName: 'ASTM A335 P5' },
          { id: 28, steelSpecName: 'ASTM A335 P9' },
          { id: 29, steelSpecName: 'ASTM A335 P11' },
          { id: 30, steelSpecName: 'ASTM A335 P22' },
          { id: 31, steelSpecName: 'ASTM A335 P91' },
          // Stainless Steel - ASTM A312
          { id: 32, steelSpecName: 'ASTM A312 TP304' },
          { id: 33, steelSpecName: 'ASTM A312 TP304L' },
          { id: 34, steelSpecName: 'ASTM A312 TP316' },
          { id: 35, steelSpecName: 'ASTM A312 TP316L' },
          { id: 36, steelSpecName: 'ASTM A312 TP321' },
          { id: 37, steelSpecName: 'ASTM A312 TP347' },
        ];
        // Fallback flange standards - IDs must match database
        const fallbackFlangeStandards = [
          // British Standards
          { id: 1, code: 'BS 4504' },
          // South African Standards
          { id: 2, code: 'SABS 1123' },
          { id: 3, code: 'BS 10' },
          // American Standards (ASME/ANSI)
          { id: 4, code: 'ASME B16.5' },
          { id: 5, code: 'ASME B16.47' },
          // European Standards
          { id: 6, code: 'EN 1092-1' },
          { id: 7, code: 'DIN' },
          // Japanese Standards
          { id: 8, code: 'JIS B2220' },
          // API Standards
          { id: 9, code: 'API 6A' },
          { id: 10, code: 'AWWA C207' },
          // Australian Standards
          { id: 11, code: 'AS 2129' },
          { id: 12, code: 'AS 4087' },
          // Russian Standards
          { id: 13, code: 'GOST' },
        ];
        // Fallback nominal bores
        const fallbackNominalBores = [
          { id: 1, nominalDiameterMm: 15, outsideDiameterMm: 21.3 },
          { id: 2, nominalDiameterMm: 20, outsideDiameterMm: 26.7 },
          { id: 3, nominalDiameterMm: 25, outsideDiameterMm: 33.4 },
          { id: 4, nominalDiameterMm: 32, outsideDiameterMm: 42.2 },
          { id: 5, nominalDiameterMm: 40, outsideDiameterMm: 48.3 },
          { id: 6, nominalDiameterMm: 50, outsideDiameterMm: 60.3 },
          { id: 7, nominalDiameterMm: 65, outsideDiameterMm: 73.0 },
          { id: 8, nominalDiameterMm: 80, outsideDiameterMm: 88.9 },
          { id: 9, nominalDiameterMm: 100, outsideDiameterMm: 114.3 },
          { id: 10, nominalDiameterMm: 125, outsideDiameterMm: 139.7 },
          { id: 11, nominalDiameterMm: 150, outsideDiameterMm: 168.3 },
          { id: 12, nominalDiameterMm: 200, outsideDiameterMm: 219.1 },
          { id: 13, nominalDiameterMm: 250, outsideDiameterMm: 273.0 },
          { id: 14, nominalDiameterMm: 300, outsideDiameterMm: 323.8 },
          { id: 15, nominalDiameterMm: 350, outsideDiameterMm: 355.6 },
          { id: 16, nominalDiameterMm: 400, outsideDiameterMm: 406.4 },
          { id: 17, nominalDiameterMm: 450, outsideDiameterMm: 457.2 },
          { id: 18, nominalDiameterMm: 500, outsideDiameterMm: 508.0 },
          { id: 19, nominalDiameterMm: 600, outsideDiameterMm: 609.6 },
          { id: 20, nominalDiameterMm: 750, outsideDiameterMm: 762.0 },
          { id: 21, nominalDiameterMm: 900, outsideDiameterMm: 914.4 },
          { id: 22, nominalDiameterMm: 1000, outsideDiameterMm: 1016.0 },
          { id: 23, nominalDiameterMm: 1200, outsideDiameterMm: 1219.2 },
        ];
        setMasterData({
          steelSpecs: fallbackSteelSpecs,
          flangeStandards: fallbackFlangeStandards,
          pressureClasses: [],
          nominalBores: fallbackNominalBores
        });
      } finally {
        setIsLoadingMasterData(false);
      }
    };

    loadMasterData();
  }, []);

  // Temperature derating factors for flange pressure classes
  // SABS 1123 / EN 1092-1 / PN standards: No significant derating below 200°C for carbon steel
  // ASME B16.5: More aggressive derating curve
  // For simplicity, we use a conservative approach: no derating below 200°C (where most applications operate)
  const getTemperatureDerating = (temperatureCelsius: number): number => {
    // For temperatures below 200°C, no derating applied
    // This matches SABS 1123, EN 1092-1, and PN standards for carbon steel
    // These standards allow full rated pressure up to 200°C for P235GH / A105 materials
    if (temperatureCelsius <= 200) {
      return 1.0;
    }

    // Derating curve for temperatures above 200°C (based on EN 1092-1 for P235GH)
    const deratingCurve = [
      { temp: 200, factor: 1.00 },  // Full rating up to 200°C
      { temp: 250, factor: 0.94 },
      { temp: 300, factor: 0.87 },
      { temp: 350, factor: 0.80 },
      { temp: 400, factor: 0.70 },
      { temp: 450, factor: 0.57 },
    ];

    // Above maximum temp - use minimum factor
    if (temperatureCelsius >= deratingCurve[deratingCurve.length - 1].temp) {
      return deratingCurve[deratingCurve.length - 1].factor;
    }

    // Find surrounding points and interpolate
    for (let i = 0; i < deratingCurve.length - 1; i++) {
      if (temperatureCelsius >= deratingCurve[i].temp && temperatureCelsius <= deratingCurve[i + 1].temp) {
        const lower = deratingCurve[i];
        const upper = deratingCurve[i + 1];
        const tempRange = upper.temp - lower.temp;
        const factorRange = upper.factor - lower.factor;
        const tempOffset = temperatureCelsius - lower.temp;
        return lower.factor + (factorRange * tempOffset / tempRange);
      }
    }

    return 1.0;
  };

  // Helper function to recommend pressure class based on working pressure (in bar) and temperature
  const getRecommendedPressureClass = (workingPressureBar: number, pressureClasses: any[], temperatureCelsius?: number) => {
    if (!workingPressureBar || !pressureClasses.length) return null;

    // Get temperature derating factor (defaults to 1.0 for ambient/unknown)
    const deratingFactor = temperatureCelsius !== undefined ? getTemperatureDerating(temperatureCelsius) : 1.0;

    // Pressure class mappings for letter/special designations (bar ratings at ambient)
    const specialMappings: { [key: string]: number } = {
      // BS 10 & AS 2129 Table designations
      'T/D': 7,    // Table D: ~7 bar
      'T/E': 14,   // Table E: ~14 bar
      'T/F': 21,   // Table F: ~21 bar
      'T/H': 35,   // Table H: ~35 bar (AS 2129)
      // AWWA C207 Classes (approximate bar ratings)
      'Class B': 6,   // ~86 psi = 6 bar
      'Class D': 10,  // ~150 psi = 10 bar
      'Class E': 17,  // ~250 psi = 17 bar
      'Class F': 21,  // ~300 psi = 21 bar
    };

    // ASME Class to bar conversion (at ambient temperature ~38°C)
    const asmeClassToBar: { [key: string]: number } = {
      '75': 10,    // Class 75 ≈ 10 bar (B16.47)
      '150': 20,   // Class 150 ≈ 20 bar
      '300': 51,   // Class 300 ≈ 51 bar
      '400': 68,   // Class 400 ≈ 68 bar
      '600': 102,  // Class 600 ≈ 102 bar
      '900': 153,  // Class 900 ≈ 153 bar
      '1500': 255, // Class 1500 ≈ 255 bar
      '2500': 425, // Class 2500 ≈ 425 bar
    };

    // Extract rating from designation and apply temperature derating
    const classesWithRating = pressureClasses.map(pc => {
      const designation = pc.designation?.trim();
      let ambientRating = 0;

      // Check if it's a special letter-based designation (BS 10, AS 2129, AWWA)
      if (specialMappings[designation]) {
        ambientRating = specialMappings[designation];
      }
      // Check if it's ASME Class designation (75, 150, 300, etc.)
      else if (asmeClassToBar[designation]) {
        ambientRating = asmeClassToBar[designation];
      }
      // Check for API 6A psi format (2000 psi, 5000 psi, etc.)
      else {
        const psiMatch = designation?.match(/^(\d+)\s*psi$/i);
        if (psiMatch) {
          ambientRating = Math.round(parseInt(psiMatch[1]) * 0.0689);
        }
        // Check for PN (Pressure Nominal) format - EN, DIN, GOST, AS 4087
        else {
          const pnMatch = designation?.match(/^PN\s*(\d+)/i);
          if (pnMatch) {
            ambientRating = parseInt(pnMatch[1]);
          }
          // Check for JIS K format (5K, 10K, etc.)
          else {
            const jisMatch = designation?.match(/^(\d+)K$/i);
            if (jisMatch) {
              ambientRating = parseInt(jisMatch[1]);
            }
            // Handle "/X" format designations (both SABS 1123 and BS 4504)
            // SABS 1123: 600/3=6bar, 1000/3=10bar, 1600/3=16bar (divide by 100)
            // BS 4504: 6/3=6bar, 10/3=10bar, 16/3=16bar (use directly)
            else {
              const slashMatch = designation?.match(/^(\d+)\s*\/\s*\d+$/);
              if (slashMatch) {
                const numericValue = parseInt(slashMatch[1]);
                // SABS 1123 uses large numbers (600, 1000, 1600, etc.) - divide by 100
                // BS 4504 uses small numbers (6, 10, 16, 25, 40, etc.) - use directly
                if (numericValue >= 500) {
                  ambientRating = numericValue / 100; // SABS: 1000 → 10 bar
                } else {
                  ambientRating = numericValue; // BS 4504: 10 → 10 bar
                }
              }
              // Fallback: try to extract any leading number
              else {
                const numMatch = designation?.match(/^(\d+)/);
                if (numMatch) {
                  const num = parseInt(numMatch[1]);
                  ambientRating = num >= 500 ? num / 100 : num;
                }
              }
            }
          }
        }
      }

      // Apply temperature derating to get actual rating at operating temperature
      const actualRating = ambientRating * deratingFactor;
      return { ...pc, barRating: actualRating, ambientRating };
    }).filter(pc => pc.barRating > 0);

    if (classesWithRating.length === 0) return null;

    // Sort by bar rating ascending (ensure consistent ordering)
    classesWithRating.sort((a, b) => {
      // Primary sort by bar rating
      const ratingDiff = a.barRating - b.barRating;
      if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
      // Secondary sort by designation for consistency
      return (a.designation || '').localeCompare(b.designation || '');
    });

    // Log all available classes for debugging
    console.log(`Available pressure classes for ${workingPressureBar} bar at ${temperatureCelsius ?? 'ambient'}°C (derating: ${deratingFactor.toFixed(2)}):`,
      classesWithRating.map(pc => `${pc.designation}=${pc.barRating.toFixed(1)}bar`).join(', '));

    // Find the lowest rating that meets or exceeds the working pressure at operating temperature
    // Using small tolerance for floating point comparison
    const recommended = classesWithRating.find(pc => pc.barRating >= workingPressureBar - 0.01);

    if (recommended) {
      console.log(`Selected: ${recommended.designation} (${recommended.barRating.toFixed(1)} bar capacity) for ${workingPressureBar} bar working pressure`);
    } else {
      console.log(`No suitable class found for ${workingPressureBar} bar, using highest available`);
    }

    return recommended || classesWithRating[classesWithRating.length - 1]; // Return highest if none match
  };

  // Fallback pressure classes by flange standard - IDs must match database
  const getFallbackPressureClasses = (standardId: number) => {
    const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
    const code = standard?.code || '';

    // BS 4504 pressure classes (database IDs 1-8)
    if (code.includes('BS 4504')) {
      return [
        { id: 1, designation: '6/3', standardId },
        { id: 2, designation: '10/3', standardId },
        { id: 3, designation: '16/3', standardId },
        { id: 4, designation: '25/3', standardId },
        { id: 5, designation: '40/3', standardId },
        { id: 6, designation: '64/3', standardId },
        { id: 7, designation: '100/3', standardId },
        { id: 8, designation: '160/3', standardId },
      ];
    }
    // SABS 1123 pressure classes (database IDs 9-13)
    if (code.includes('SABS 1123')) {
      return [
        { id: 9, designation: '600/3', standardId },
        { id: 10, designation: '1000/3', standardId },
        { id: 11, designation: '1600/3', standardId },
        { id: 12, designation: '2500/3', standardId },
        { id: 13, designation: '4000/3', standardId },
      ];
    }
    // BS 10 pressure classes (database IDs 14-16)
    if (code.includes('BS 10')) {
      return [
        { id: 14, designation: 'T/D', standardId },
        { id: 15, designation: 'T/E', standardId },
        { id: 16, designation: 'T/F', standardId },
      ];
    }
    // ASME B16.5 / ANSI B16.5 pressure classes (database IDs 17-23)
    if (code.includes('ASME B16.5') || code.includes('ANSI B16.5')) {
      return [
        { id: 17, designation: '150', standardId },
        { id: 18, designation: '300', standardId },
        { id: 19, designation: '400', standardId },
        { id: 20, designation: '600', standardId },
        { id: 21, designation: '900', standardId },
        { id: 22, designation: '1500', standardId },
        { id: 23, designation: '2500', standardId },
      ];
    }
    // EN 1092-1 pressure classes (database IDs 24-31)
    if (code.includes('EN 1092')) {
      return [
        { id: 24, designation: 'PN 6', standardId },
        { id: 25, designation: 'PN 10', standardId },
        { id: 26, designation: 'PN 16', standardId },
        { id: 27, designation: 'PN 25', standardId },
        { id: 28, designation: 'PN 40', standardId },
        { id: 29, designation: 'PN 63', standardId },
        { id: 30, designation: 'PN 100', standardId },
        { id: 31, designation: 'PN 160', standardId },
      ];
    }
    // DIN pressure classes (database IDs 32-36)
    if (code.includes('DIN')) {
      return [
        { id: 32, designation: 'PN 6', standardId },
        { id: 33, designation: 'PN 10', standardId },
        { id: 34, designation: 'PN 16', standardId },
        { id: 35, designation: 'PN 25', standardId },
        { id: 36, designation: 'PN 40', standardId },
      ];
    }
    // JIS B2220 pressure classes (database IDs 37-43)
    if (code.includes('JIS')) {
      return [
        { id: 37, designation: '5K', standardId },
        { id: 38, designation: '10K', standardId },
        { id: 39, designation: '16K', standardId },
        { id: 40, designation: '20K', standardId },
        { id: 41, designation: '30K', standardId },
        { id: 42, designation: '40K', standardId },
        { id: 43, designation: '63K', standardId },
      ];
    }
    // AS 2129 pressure classes (database IDs 44-47)
    if (code.includes('AS 2129')) {
      return [
        { id: 44, designation: 'T/D', standardId },
        { id: 45, designation: 'T/E', standardId },
        { id: 46, designation: 'T/F', standardId },
        { id: 47, designation: 'T/H', standardId },
      ];
    }
    // AS 4087 pressure classes (database IDs 48-52)
    if (code.includes('AS 4087')) {
      return [
        { id: 48, designation: 'PN 14', standardId },
        { id: 49, designation: 'PN 16', standardId },
        { id: 50, designation: 'PN 21', standardId },
        { id: 51, designation: 'PN 25', standardId },
        { id: 52, designation: 'PN 35', standardId },
      ];
    }
    // GOST pressure classes (database IDs 53-58)
    if (code.includes('GOST')) {
      return [
        { id: 53, designation: 'PN 6', standardId },
        { id: 54, designation: 'PN 10', standardId },
        { id: 55, designation: 'PN 16', standardId },
        { id: 56, designation: 'PN 25', standardId },
        { id: 57, designation: 'PN 40', standardId },
        { id: 58, designation: 'PN 63', standardId },
      ];
    }
    // ASME B16.47 pressure classes (database IDs 59-64)
    if (code.includes('ASME B16.47')) {
      return [
        { id: 59, designation: '75', standardId },
        { id: 60, designation: '150', standardId },
        { id: 61, designation: '300', standardId },
        { id: 62, designation: '400', standardId },
        { id: 63, designation: '600', standardId },
        { id: 64, designation: '900', standardId },
      ];
    }
    // API 6A pressure classes (database IDs 65-70)
    if (code.includes('API 6A')) {
      return [
        { id: 65, designation: '2000 psi', standardId },
        { id: 66, designation: '3000 psi', standardId },
        { id: 67, designation: '5000 psi', standardId },
        { id: 68, designation: '10000 psi', standardId },
        { id: 69, designation: '15000 psi', standardId },
        { id: 70, designation: '20000 psi', standardId },
      ];
    }
    // AWWA C207 pressure classes (database IDs 71-74)
    if (code.includes('AWWA')) {
      return [
        { id: 71, designation: 'Class B', standardId },
        { id: 72, designation: 'Class D', standardId },
        { id: 73, designation: 'Class E', standardId },
        { id: 74, designation: 'Class F', standardId },
      ];
    }
    // BS 1560 pressure classes (same as ASME)
    if (code.includes('BS 1560')) {
      return [
        { id: 901, designation: '150', standardId },
        { id: 902, designation: '300', standardId },
        { id: 903, designation: '600', standardId },
        { id: 904, designation: '900', standardId },
        { id: 905, designation: '1500', standardId },
        { id: 906, designation: '2500', standardId },
      ];
    }
    // Default empty
    return [];
  };

  // Fetch available pressure classes for a standard and auto-select recommended
  const fetchAndSelectPressureClass = async (standardId: number, workingPressureBar?: number, temperatureCelsius?: number, materialGroup?: string) => {
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      const classes = await masterDataApi.getFlangePressureClassesByStandard(standardId);

      // Log what we got from the API
      const standardName = masterData.flangeStandards?.find((s: any) => s.id === standardId)?.code || standardId;
      console.log(`Fetched ${classes.length} pressure classes for ${standardName}:`, classes.map((c: any) => `${c.designation}(id=${c.id})`).join(', '));

      setAvailablePressureClasses(classes);

      // Auto-select recommended pressure class if working pressure is available
      if (workingPressureBar && classes.length > 0) {
        // Try P/T rating API for temperature-based selection (works for any standard with P/T data)
        if (temperatureCelsius !== undefined) {
          try {
            // Build URL with material group if provided
            const ptMaterialGroup = materialGroup || 'Carbon Steel A105 (Group 1.1)';
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/flange-pt-ratings/recommended-class?standardId=${standardId}&workingPressureBar=${workingPressureBar}&temperatureCelsius=${temperatureCelsius}&materialGroup=${encodeURIComponent(ptMaterialGroup)}`
            );
            if (response.ok) {
              const recommendedClassId = await response.json();
              if (recommendedClassId) {
                const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
                console.log(`P/T rating: Selected class ID ${recommendedClassId} for ${standard?.code || standardId} at ${workingPressureBar} bar, ${temperatureCelsius}°C (${ptMaterialGroup})`);
                return recommendedClassId;
              }
            }
          } catch (ptError) {
            // Silently fall back to ambient calculation if P/T API fails
          }
        }

        // Fallback to temperature-derated calculation if P/T API not available
        const recommended = getRecommendedPressureClass(workingPressureBar, classes, temperatureCelsius);
        if (recommended) {
          return recommended.id;
        }
      }

      return null;
    } catch (error) {
      // Use fallback pressure classes when backend is unavailable
      const fallbackClasses = getFallbackPressureClasses(standardId);
      setAvailablePressureClasses(fallbackClasses);

      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error('Error fetching pressure classes:', error);
      }

      // Auto-select recommended from fallback classes with temperature derating
      if (workingPressureBar && fallbackClasses.length > 0) {
        const recommended = getRecommendedPressureClass(workingPressureBar, fallbackClasses, temperatureCelsius);
        if (recommended) {
          return recommended.id;
        }
      }

      return null;
    }
  };

  // Fetch available schedules for a specific entry
  // IMPORTANT: This function should NOT replace working fallback data with API data
  // because API schedule names may differ from fallback names, breaking the selected value
  const fetchAvailableSchedules = async (entryId: string, steelSpecId: number, nominalBoreMm: number) => {
    // Check for fallback data first to provide immediate response
    const fallbackSchedules = FALLBACK_PIPE_SCHEDULES[nominalBoreMm] || [];

    // If we already have schedules for this entry, don't fetch from API
    // This prevents API data with different schedule names from breaking the selection
    const existingSchedules = availableSchedulesMap[entryId];
    if (existingSchedules && existingSchedules.length > 0) {
      console.log(`[fetchAvailableSchedules] Entry ${entryId} already has ${existingSchedules.length} schedules, skipping API fetch`);
      return existingSchedules;
    }

    // Use fallback data - it's reliable and consistent
    if (fallbackSchedules.length > 0) {
      console.log(`[fetchAvailableSchedules] Using ${fallbackSchedules.length} fallback schedules for ${nominalBoreMm}mm`);
      setAvailableSchedulesMap(prev => ({
        ...prev,
        [entryId]: fallbackSchedules
      }));
      return fallbackSchedules;
    }

    // Only try API if we have no fallback data
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');

      console.log(`[fetchAvailableSchedules] Entry: ${entryId}, Steel: ${steelSpecId}, NB: ${nominalBoreMm}mm`);

      // Find the nominal outside diameter ID from nominalBoreMm
      const nominalBore = masterData.nominalBores?.find((nb: any) => {
        const nbValue = nb.nominal_diameter_mm ?? nb.nominalDiameterMm;
        return nbValue === nominalBoreMm || nbValue === Number(nominalBoreMm);
      });

      if (!nominalBore) {
        console.warn(`[fetchAvailableSchedules] No nominal bore found for ${nominalBoreMm}mm in masterData`);
        return [];
      }

      console.log(`[fetchAvailableSchedules] Found nominalBore ID: ${nominalBore.id}`);

      const dimensions = await masterDataApi.getPipeDimensionsAll(steelSpecId, nominalBore.id);

      console.log(`[fetchAvailableSchedules] Got ${dimensions?.length || 0} dimensions from API`);

      if (dimensions && dimensions.length > 0) {
        setAvailableSchedulesMap(prev => ({
          ...prev,
          [entryId]: dimensions
        }));
        return dimensions;
      }

      return [];
    } catch (error) {
      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error('[fetchAvailableSchedules] Error:', error);
      }
      return [];
    }
  };

  // Fetch bend options (nominal bores and degrees) for a bend type
  const fetchBendOptions = async (bendType: string) => {
    // Return cached data if available
    if (bendOptionsCache[bendType]) {
      return bendOptionsCache[bendType];
    }

    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      const options = await masterDataApi.getBendOptions(bendType);

      // Cache the result
      setBendOptionsCache(prev => ({
        ...prev,
        [bendType]: options
      }));

      return options;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error(`Error fetching bend options for ${bendType}:`, error);
      }
      return { nominalBores: [], degrees: [] };
    }
  };

  // Auto-select flange specifications based on item-level operating conditions
  const autoSelectFlangeSpecs = async (
    entryId: string,
    entryType: 'straight-pipe' | 'bend',
    workingPressureBar: number,
    flangeStandardId?: number,
    updateCallback?: (updates: any) => void,
    temperatureCelsius?: number,
    materialGroup?: string
  ) => {
    if (!workingPressureBar || !flangeStandardId) return;

    try {
      // Fetch pressure classes for the standard and get recommendation
      const { masterDataApi } = await import('@/app/lib/api/client');
      const classes = await masterDataApi.getFlangePressureClassesByStandard(flangeStandardId);

      if (classes.length > 0) {
        let recommendedId: number | null = null;

        // Try P/T rating API for temperature-based selection with material group
        if (temperatureCelsius !== undefined) {
          try {
            const ptMaterialGroup = materialGroup || 'Carbon Steel A105 (Group 1.1)';
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/flange-pt-ratings/recommended-class?standardId=${flangeStandardId}&workingPressureBar=${workingPressureBar}&temperatureCelsius=${temperatureCelsius}&materialGroup=${encodeURIComponent(ptMaterialGroup)}`
            );
            if (response.ok) {
              recommendedId = await response.json();
              if (recommendedId && updateCallback) {
                const recommendedClass = classes.find((c: any) => c.id === recommendedId);
                updateCallback({
                  flangePressureClassId: recommendedId,
                  autoSelectedPressureClass: true
                });
                console.log(`Auto-selected pressure class ${recommendedClass?.designation || recommendedId} for ${workingPressureBar} bar at ${temperatureCelsius}°C (${ptMaterialGroup})`);
                return;
              }
            }
          } catch {
            // Fall back to local calculation
          }
        }

        // Fallback to local temperature-derated calculation
        const recommended = getRecommendedPressureClass(workingPressureBar, classes, temperatureCelsius);
        if (recommended && updateCallback) {
          updateCallback({
            flangePressureClassId: recommended.id,
            autoSelectedPressureClass: true
          });
          console.log(`Auto-selected pressure class ${recommended.designation} for ${workingPressureBar} bar at ${temperatureCelsius ?? 'ambient'}°C`);
        }
      }
    } catch (error) {
      console.error('Error auto-selecting flange specs:', error);
    }
  };

  // Refetch available schedules when global steel specification changes
  // NOTE: Removed rfqData.straightPipeEntries from dependencies to prevent re-fetching on every entry change
  // The NB onChange handler handles setting schedules when user selects a new NB
  useEffect(() => {
    const steelSpecId = rfqData.globalSpecs?.steelSpecificationId;
    if (!steelSpecId || !masterData.nominalBores?.length) return;

    // Only prefetch schedules when steel spec changes - this is a background operation
    // that won't overwrite existing schedule selections due to the check in fetchAvailableSchedules
    rfqData.straightPipeEntries.forEach((entry: StraightPipeEntry) => {
      if (entry.specs.nominalBoreMm) {
        fetchAvailableSchedules(entry.id, steelSpecId, entry.specs.nominalBoreMm);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqData.globalSpecs?.steelSpecificationId, masterData.nominalBores?.length]);

  // Auto-calculate when entry specifications change (with debounce)
  useEffect(() => {
    const calculateEntry = async (entry: StraightPipeEntry) => {
      // Get working pressure from entry specs or global specs
      const workingPressureBar = entry.specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar;
      const workingTemperatureC = entry.specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC;
      const steelSpecificationId = entry.specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId;
      const flangeStandardId = entry.specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId;
      const flangePressureClassId = entry.specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId;

      // Only auto-calculate if all required fields are present
      const hasRequiredFields =
        entry.specs.nominalBoreMm &&
        (entry.specs.scheduleNumber || entry.specs.wallThicknessMm) &&
        entry.specs.individualPipeLength &&
        entry.specs.quantityValue &&
        workingPressureBar;

      // Debug logging
      console.log('📊 Auto-calculate check:', {
        entryId: entry.id,
        nominalBoreMm: entry.specs.nominalBoreMm,
        scheduleNumber: entry.specs.scheduleNumber,
        wallThicknessMm: entry.specs.wallThicknessMm,
        individualPipeLength: entry.specs.individualPipeLength,
        quantityValue: entry.specs.quantityValue,
        workingPressureBar,
        hasRequiredFields
      });

      if (!hasRequiredFields) {
        console.log('❌ Missing required fields, skipping calculation');
        return;
      }

      try {
        const { rfqApi } = await import('@/app/lib/api/client');
        // Merge entry specs with global specs
        const calculationData = {
          ...entry.specs,
          workingPressureBar,
          workingTemperatureC,
          steelSpecificationId,
          flangeStandardId,
          flangePressureClassId,
        };
        console.log('🔄 Calling API with:', calculationData);
        const result = await rfqApi.calculate(calculationData);
        console.log('✅ Calculation result:', result);

        // Recalculate flange weight based on actual pressure class used (may be overridden)
        const pressureClassDesignation = masterData.pressureClasses?.find(
          (pc: { id: number; designation: string }) => pc.id === flangePressureClassId
        )?.designation;

        if (result && result.numberOfFlanges > 0 && pressureClassDesignation) {
          const flangeWeightPerUnit = getFlangeWeight(entry.specs.nominalBoreMm!, pressureClassDesignation);
          const totalFlangeWeight = result.numberOfFlanges * flangeWeightPerUnit;
          const totalSystemWeight = (result.totalPipeWeight || 0) + totalFlangeWeight;

          console.log(`🔧 Recalculating flange weight for ${pressureClassDesignation}: ${flangeWeightPerUnit}kg/flange × ${result.numberOfFlanges} = ${totalFlangeWeight}kg`);

          updateEntryCalculation(entry.id, {
            ...result,
            flangeWeightPerUnit,
            totalFlangeWeight,
            totalSystemWeight,
            pressureClassUsed: pressureClassDesignation
          } as any);
        } else {
          updateEntryCalculation(entry.id, result);
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If API returns 404 (NB/schedule combination not in database), use local calculation silently
        if (errorMessage.includes('API Error (404)') || errorMessage.includes('not available in the database')) {
          console.log('⚠️ API 404 - Using local calculation fallback for', entry.specs.nominalBoreMm, 'NB');
          const wallThickness = entry.specs.wallThicknessMm || 6.35; // Default wall thickness

          // Get pressure class designation for accurate flange weights
          const pressureClassDesignation = masterData.pressureClasses?.find(
            (pc: { id: number; designation: string }) => pc.id === flangePressureClassId
          )?.designation;

          const localResult = calculateLocalPipeResult(
            entry.specs.nominalBoreMm!,
            wallThickness,
            entry.specs.individualPipeLength!,
            entry.specs.quantityValue!,
            entry.specs.quantityType || 'number_of_pipes',
            entry.specs.pipeEndConfiguration || 'PE',
            pressureClassDesignation
          );
          console.log('✅ Local calculation result:', localResult);
          updateEntryCalculation(entry.id, localResult);
          return;
        }

        // Silently handle other expected errors (backend unavailable, bad request)
        const isExpectedError =
          errorMessage === 'Backend unavailable' ||
          errorMessage.includes('API Error (400)') ||
          errorMessage.includes('fetch failed');

        if (!isExpectedError) {
          console.error('❌ Calculation API error:', error);
        }
      }
    };

    // Debounce the calculation to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      // Calculate all entries that have complete data
      rfqData.straightPipeEntries.forEach((entry: StraightPipeEntry) => {
        calculateEntry(entry);
      });
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [
    // Watch for changes in any entry's specs (including flange overrides)
    JSON.stringify(rfqData.straightPipeEntries.map((e: StraightPipeEntry) => ({
      id: e.id,
      nominalBoreMm: e.specs.nominalBoreMm,
      scheduleNumber: e.specs.scheduleNumber,
      wallThicknessMm: e.specs.wallThicknessMm,
      individualPipeLength: e.specs.individualPipeLength,
      quantityValue: e.specs.quantityValue,
      quantityType: e.specs.quantityType,
      pipeEndConfiguration: e.specs.pipeEndConfiguration,
      flangeStandardId: e.specs.flangeStandardId,
      flangePressureClassId: e.specs.flangePressureClassId,
      hasFlangeOverride: e.hasFlangeOverride,
      flangeOverrideConfirmed: e.flangeOverrideConfirmed
    }))),
    // Also watch global specs for calculation
    rfqData.globalSpecs?.workingPressureBar,
    rfqData.globalSpecs?.workingTemperatureC,
    rfqData.globalSpecs?.steelSpecificationId,
    rfqData.globalSpecs?.flangeStandardId,
    rfqData.globalSpecs?.flangePressureClassId
  ]);

  // Initialize pressure classes when flange standard is set (e.g., from saved state or initial load)
  useEffect(() => {
    const initializePressureClasses = async () => {
      const standardId = rfqData.globalSpecs?.flangeStandardId;
      if (standardId && availablePressureClasses.length === 0) {
        console.log(`Initializing pressure classes for standard ${standardId}`);
        const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === rfqData.globalSpecs?.steelSpecificationId);
        const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
        const recommendedId = await fetchAndSelectPressureClass(
          standardId,
          rfqData.globalSpecs?.workingPressureBar,
          rfqData.globalSpecs?.workingTemperatureC,
          materialGroup
        );
        // Auto-select if not already set
        if (recommendedId && !rfqData.globalSpecs?.flangePressureClassId) {
          updateGlobalSpecs({
            ...rfqData.globalSpecs,
            flangePressureClassId: recommendedId
          });
        }
      }
    };
    initializePressureClasses();
  }, [rfqData.globalSpecs?.flangeStandardId, masterData.steelSpecs]);

  // Scroll to top helper function - scrolls the content container, not the window
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scroll to first error field helper function
  const scrollToFirstError = (errorKey: string) => {
    // Map error keys to field identifiers
    const errorKeyToSelector: Record<string, string> = {
      // Page 1 fields
      projectName: '[data-field="projectName"]',
      projectType: '[data-field="projectType"]',
      customerName: '[data-field="customerName"]',
      description: '[data-field="description"]',
      customerEmail: '[data-field="customerEmail"]',
      customerPhone: '[data-field="customerPhone"]',
      requiredDate: '[data-field="requiredDate"]',
      requiredProducts: '[data-field="requiredProducts"]',
      // Page 2 fields
      workingPressure: '[data-field="workingPressure"]',
      workingTemperature: '[data-field="workingTemperature"]',
      steelPipesConfirmation: '[data-field="steelPipesConfirmation"]',
      fastenersConfirmation: '[data-field="fastenersConfirmation"]',
    };

    // Check if it's a pipe-specific error (pipe_0_nb, pipe_1_length, etc.)
    let selector = errorKeyToSelector[errorKey];
    if (!selector && errorKey.startsWith('pipe_')) {
      // Extract index and field type from error key like "pipe_0_nb"
      const match = errorKey.match(/pipe_(\d+)_(\w+)/);
      if (match) {
        const [, index, fieldType] = match;
        selector = `[data-field="pipe_${index}_${fieldType}"]`;
      }
    }

    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add visual highlight effect
        element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
        }, 3000);
        // Try to focus the input element if it exists
        const input = element.querySelector('input, select, textarea') as HTMLElement;
        if (input) {
          setTimeout(() => input.focus(), 300);
        }
        return;
      }
    }

    // Fallback: try to find by name attribute or scroll to top
    const fallbackElement = document.querySelector(`[name="${errorKey}"]`) ||
                           document.querySelector(`#${errorKey}`);
    if (fallbackElement) {
      fallbackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      scrollToTop();
    }
  };

  // Enhanced next step function with validation
  const nextStep = () => {
    // Validate current step before proceeding
    let errors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        errors = validatePage1RequiredFields(rfqData);
        break;
      case 2:
        errors = validatePage2Specifications(rfqData.globalSpecs);
        // Check if steel pipes is selected but not confirmed
        if (rfqData.requiredProducts?.includes('fabricated_steel') && !rfqData.globalSpecs?.steelPipesSpecsConfirmed) {
          errors.steelPipesConfirmation = 'Please confirm the Steel Pipe Specifications before proceeding';
        }
        // Check if fasteners/gaskets is selected but not confirmed
        if (rfqData.requiredProducts?.includes('fasteners_gaskets') && !rfqData.globalSpecs?.fastenersConfirmed) {
          errors.fastenersConfirmation = 'Please confirm the Fasteners & Gaskets selection before proceeding';
        }
        break;
      case 3:
        errors = validatePage3Items(rfqData.straightPipeEntries);
        break;
    }

    setValidationErrors(errors);

    // Only proceed if no validation errors
    if (Object.keys(errors).length === 0) {
      originalNextStep();
      scrollToTop();
    } else {
      // Scroll to the first field with an error
      const firstErrorKey = Object.keys(errors)[0];
      scrollToFirstError(firstErrorKey);
    }
  };

  // Previous step function with scroll to top
  const handlePrevStep = () => {
    prevStep();
    scrollToTop();
  };

  // Step click handler with scroll to top
  const handleStepClick = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    scrollToTop();
  };

  // Auto-generate client item numbers based on customer name
  useEffect(() => {
    if (rfqData.customerName) {
      rfqData.straightPipeEntries.forEach((entry, index) => {
        if (!entry.clientItemNumber || entry.clientItemNumber.trim() === '') {
          const autoGenNumber = generateClientItemNumber(rfqData.customerName, index + 1);
          updateStraightPipeEntry(entry.id, { clientItemNumber: autoGenNumber });
        }
      });
    }
  }, [rfqData.straightPipeEntries, rfqData.customerName, updateStraightPipeEntry]);

  const handleCalculateAll = async () => {
    try {
      for (const entry of rfqData.straightPipeEntries) {
        try {
          // Merge entry specs with global specs (same as auto-calculate)
          const workingPressureBar = entry.specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10;
          const workingTemperatureC = entry.specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC || 20;
          const steelSpecificationId = entry.specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId || 2;
          const flangeStandardId = entry.specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId || 1;
          const flangePressureClassId = entry.specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId;

          const calculationData = {
            ...entry.specs,
            workingPressureBar,
            workingTemperatureC,
            steelSpecificationId,
            flangeStandardId,
            flangePressureClassId,
          };

          console.log('🔄 Manual calculate for entry:', entry.id, calculationData);
          const result = await rfqApi.calculate(calculationData);
          console.log('✅ Manual calculation result:', result);
          updateEntryCalculation(entry.id, result);
        } catch (error: any) {
          console.error(`Calculation error for entry ${entry.id}:`, error);
          const errorMessage = error.message || String(error);

          // If API returns 404, use local calculation fallback
          if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('not available')) {
            console.log('⚠️ API 404 - Using local calculation fallback for entry:', entry.id);
            const wallThickness = entry.specs.wallThicknessMm || 6.35;

            // Get pressure class designation for accurate flange weights
            const entryPressureClassId = entry.specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId;
            const pressureClassDesignation = masterData.pressureClasses?.find(
              (pc: { id: number; designation: string }) => pc.id === entryPressureClassId
            )?.designation;

            const localResult = calculateLocalPipeResult(
              entry.specs.nominalBoreMm!,
              wallThickness,
              entry.specs.individualPipeLength!,
              entry.specs.quantityValue!,
              entry.specs.quantityType || 'number_of_pipes',
              entry.specs.pipeEndConfiguration || 'PE',
              pressureClassDesignation
            );
            console.log('✅ Local calculation result:', localResult);
            updateEntryCalculation(entry.id, localResult);
          } else {
            alert(`Calculation error for item: ${entry.description || 'Untitled'}\n\n${errorMessage}`);
          }
        }
      }
    } catch (error) {
      console.error('Calculation error:', error);
      alert('An unexpected error occurred during calculation. Please check your inputs and try again.');
    }
  };

  const handleCalculateBend = async (entryId: string) => {
    try {
      const { bendRfqApi } = await import('@/app/lib/api/client');
      
      const entry = rfqData.items.find(e => e.id === entryId && e.itemType === 'bend');
      if (!entry || entry.itemType !== 'bend') return;

      const bendEntry = entry;
      const calculationData = {
        nominalBoreMm: bendEntry.specs?.nominalBoreMm || 40,
        scheduleNumber: bendEntry.specs?.scheduleNumber || '40',
        bendDegrees: bendEntry.specs?.bendDegrees || 90,
        bendType: bendEntry.specs?.bendType || '1.5D',
        quantityValue: bendEntry.specs?.quantityValue || 1,
        quantityType: 'number_of_items' as const,
        numberOfTangents: bendEntry.specs?.numberOfTangents || 0,
        tangentLengths: bendEntry.specs?.tangentLengths || [],
        workingPressureBar: bendEntry.specs?.workingPressureBar || rfqData.globalSpecs.workingPressureBar || 10,
        workingTemperatureC: bendEntry.specs?.workingTemperatureC || rfqData.globalSpecs.workingTemperatureC || 20,
        steelSpecificationId: bendEntry.specs?.steelSpecificationId || rfqData.globalSpecs.steelSpecificationId || 2,
        useGlobalFlangeSpecs: true,
      };

      const result = await bendRfqApi.calculate(calculationData);

      updateItem(entryId, {
        calculation: result,
      });

    } catch (error) {
      console.error('Bend calculation failed:', error);
      alert('Bend calculation failed. Please check your specifications.');
    }
  };

  const handleCalculateFitting = async (entryId: string) => {
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      
      const entry = rfqData.items.find(e => e.id === entryId && e.itemType === 'fitting');
      if (!entry || entry.itemType !== 'fitting') return;

      const fittingEntry = entry;
      
      // Validation for required fields
      if (!fittingEntry.specs?.fittingStandard) {
        alert('Please select a fitting standard (SABS62 or SABS719)');
        return;
      }
      if (!fittingEntry.specs?.fittingType) {
        alert('Please select a fitting type');
        return;
      }
      if (!fittingEntry.specs?.nominalDiameterMm) {
        alert('Please select a nominal diameter');
        return;
      }

      // Additional validation for SABS719
      if (fittingEntry.specs.fittingStandard === 'SABS719') {
        if (!fittingEntry.specs.scheduleNumber) {
          alert('Please select a schedule number for SABS719 fittings');
          return;
        }
        if (fittingEntry.specs.pipeLengthAMm === undefined || fittingEntry.specs.pipeLengthBMm === undefined) {
          alert('Please enter pipe lengths A and B for SABS719 fittings');
          return;
        }
      }

      const calculationData = {
        fittingStandard: fittingEntry.specs.fittingStandard,
        fittingType: fittingEntry.specs.fittingType,
        nominalDiameterMm: fittingEntry.specs.nominalDiameterMm,
        angleRange: fittingEntry.specs.angleRange,
        pipeLengthAMm: fittingEntry.specs.pipeLengthAMm,
        pipeLengthBMm: fittingEntry.specs.pipeLengthBMm,
        quantityValue: fittingEntry.specs.quantityValue || 1,
        scheduleNumber: fittingEntry.specs.scheduleNumber,
        workingPressureBar: fittingEntry.specs.workingPressureBar || rfqData.globalSpecs.workingPressureBar,
        workingTemperatureC: fittingEntry.specs.workingTemperatureC || rfqData.globalSpecs.workingTemperatureC,
        steelSpecificationId: fittingEntry.specs.steelSpecificationId || rfqData.globalSpecs.steelSpecificationId,
        flangeStandardId: fittingEntry.specs.flangeStandardId || rfqData.globalSpecs.flangeStandardId,
        flangePressureClassId: fittingEntry.specs.flangePressureClassId || rfqData.globalSpecs.flangePressureClassId,
      };

      const result = await masterDataApi.calculateFitting(calculationData);

      updateItem(entryId, {
        calculation: result,
      });

    } catch (error: any) {
      console.error('Fitting calculation failed:', error);
      alert(`Fitting calculation failed: ${error.message || 'Please check your specifications.'}`);
    }
  };

  // Unified update handler for all item types
  const handleUpdateEntry = (id: string, updates: any) => {
    const entry = rfqData.items.find(e => e.id === id);
    if (entry?.itemType === 'bend' || entry?.itemType === 'fitting') {
      updateItem(id, updates);
    } else {
      updateStraightPipeEntry(id, updates);
    }
  };

  // State for save progress feedback
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Save progress handler - saves current RFQ data to localStorage
  const handleSaveProgress = () => {
    try {
      const saveData = {
        rfqData,
        pendingDocuments: pendingDocuments.map((doc: any) => ({
          name: doc.name || doc.file?.name,
          size: doc.size || doc.file?.size,
          type: doc.type || doc.file?.type,
          // Note: Cannot save actual file objects to localStorage, only metadata
        })),
        currentStep,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem('annix_rfq_draft', JSON.stringify(saveData));

      // Show confirmation
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 3000);

      console.log('✅ RFQ progress saved to localStorage');
    } catch (error) {
      console.error('Failed to save progress:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setValidationErrors({});
    
    try {
      // Use unified items array that includes both straight pipes and bends
      const allItems = rfqData.items || rfqData.straightPipeEntries || [];
      
      // Validate we have at least one item
      if (allItems.length === 0) {
        setValidationErrors({ submit: 'Please add at least one item before submitting.' });
        setIsSubmitting(false);
        return;
      }

      // Separate items by type
      const straightPipeItems = allItems.filter((item: any) => item.itemType !== 'bend' && item.itemType !== 'fitting');
      const bendItems = allItems.filter((item: any) => item.itemType === 'bend');
      const fittingItems = allItems.filter((item: any) => item.itemType === 'fitting');

      console.log(`📊 Submitting: ${straightPipeItems.length} straight pipe(s), ${bendItems.length} bend(s), ${fittingItems.length} fitting(s)`);

      // Import the API clients
      const { rfqApi, bendRfqApi } = await import('@/app/lib/api/client');
      
      const results = [];
      
      // ========== PROCESS ALL STRAIGHT PIPES ==========
      if (straightPipeItems.length > 0) {
        console.log(`📏 Processing ${straightPipeItems.length} straight pipe(s)...`);
        
        for (let i = 0; i < straightPipeItems.length; i++) {
          const entry = straightPipeItems[i];
          
          // Validate entry has calculation results
          if (!entry.calculation) {
            setValidationErrors({ 
              submit: `Straight Pipe #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before submitting.` 
            });
            setIsSubmitting(false);
            return;
          }

          // Prepare Straight Pipe RFQ payload
          const rfqPayload = {
            rfq: {
              projectName: straightPipeItems.length > 1 
                ? `${rfqData.projectName} - Straight Pipe ${i + 1}/${straightPipeItems.length}`
                : rfqData.projectName,
              description: rfqData.description,
              customerName: rfqData.customerName,
              customerEmail: rfqData.customerEmail,
              customerPhone: rfqData.customerPhone,
              requiredDate: rfqData.requiredDate,
              status: 'draft' as const,
              notes: rfqData.notes,
            },
            straightPipe: {
              nominalBoreMm: (entry.specs as any).nominalBoreMm,
              scheduleType: (entry.specs as any).scheduleType,
              scheduleNumber: (entry.specs as any).scheduleNumber,
              wallThicknessMm: (entry.specs as any).wallThicknessMm,
              pipeEndConfiguration: (entry.specs as any).pipeEndConfiguration,
              individualPipeLength: (entry.specs as any).individualPipeLength,
              lengthUnit: (entry.specs as any).lengthUnit,
              quantityType: (entry.specs as any).quantityType,
              quantityValue: (entry.specs as any).quantityValue,
              workingPressureBar: (entry.specs as any).workingPressureBar,
              workingTemperatureC: (entry.specs as any).workingTemperatureC,
              steelSpecificationId: (entry.specs as any).steelSpecificationId,
              flangeStandardId: (entry.specs as any).flangeStandardId,
              flangePressureClassId: (entry.specs as any).flangePressureClassId,
            },
            itemDescription: entry.description || `Pipe Item ${i + 1}`,
            itemNotes: entry.notes,
          };

          console.log(`📏 Submitting Straight Pipe #${i + 1}:`, rfqPayload);
          
          // Submit to straight pipe RFQ endpoint
          const result = await rfqApi.create(rfqPayload);
          results.push({ ...result, itemType: 'straightPipe' });
          
          console.log(`✅ Straight Pipe #${i + 1} submitted successfully:`, result);
        }
      }
      
      // ========== PROCESS ALL BENDS ==========
      if (bendItems.length > 0) {
        console.log(`🔄 Processing ${bendItems.length} bend(s)...`);
        
        for (let i = 0; i < bendItems.length; i++) {
          const entry = bendItems[i];
          
          // Validate entry has calculation results
          if (!entry.calculation) {
            setValidationErrors({ 
              submit: `Bend #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before submitting.` 
            });
            setIsSubmitting(false);
            return;
          }

          // Validate required bend fields
          if (!(entry.specs as any).nominalBoreMm || !(entry.specs as any).scheduleNumber || !(entry.specs as any).bendType || !(entry.specs as any).bendDegrees) {
            setValidationErrors({ 
              submit: `Bend #${i + 1} is missing required fields. Please complete all bend specifications.` 
            });
            setIsSubmitting(false);
            return;
          }
          
          // Prepare Bend RFQ payload
          const bendPayload = {
            rfq: {
              projectName: bendItems.length > 1 
                ? `${rfqData.projectName} - Bend ${i + 1}/${bendItems.length}`
                : rfqData.projectName,
              description: rfqData.description,
              customerName: rfqData.customerName,
              customerEmail: rfqData.customerEmail,
              customerPhone: rfqData.customerPhone,
              requiredDate: rfqData.requiredDate,
              status: 'draft' as const,
              notes: rfqData.notes,
            },
            bend: {
              nominalBoreMm: (entry.specs as any).nominalBoreMm!,
              scheduleNumber: (entry.specs as any).scheduleNumber!,
              bendType: (entry.specs as any).bendType!,
              bendDegrees: (entry.specs as any).bendDegrees!,
              numberOfTangents: (entry.specs as any).numberOfTangents || 0,
              tangentLengths: (entry.specs as any).tangentLengths || [],
              quantityType: 'number_of_items' as const,
              quantityValue: (entry.specs as any).quantityValue || 1,
              workingPressureBar: (entry.specs as any).workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: (entry.specs as any).workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC || 20,
              steelSpecificationId: (entry.specs as any).steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId || 2,
              flangeStandardId: (entry.specs as any).flangeStandardId || rfqData.globalSpecs?.flangeStandardId || 1,
              flangePressureClassId: (entry.specs as any).flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId || 1,
            },
            itemDescription: entry.description || `Bend Item ${i + 1}`,
            itemNotes: entry.notes,
          };

          console.log(`🔄 Submitting Bend #${i + 1}:`, bendPayload);
          
          // Submit to bend RFQ endpoint
          const result = await bendRfqApi.create(bendPayload);
          results.push({ ...result, itemType: 'bend' });
          
          console.log(`✅ Bend #${i + 1} submitted successfully:`, result);
        }
      }

      // ========== PROCESS ALL FITTINGS ==========
      if (fittingItems.length > 0) {
        console.log(`⚙️ Processing ${fittingItems.length} fitting(s)...`);
        
        for (let i = 0; i < fittingItems.length; i++) {
          const entry = fittingItems[i];
          
          // Validate entry has calculation results
          if (!entry.calculation) {
            setValidationErrors({ 
              submit: `Fitting #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before submitting.` 
            });
            setIsSubmitting(false);
            return;
          }

          // For now, we'll skip RFQ submission for fittings as there's no backend endpoint yet
          // Just log them as success
          console.log(`⚙️ Fitting #${i + 1} would be submitted:`, entry);
          results.push({ 
            rfq: { rfqNumber: `FITTING-${i + 1}`, id: `fitting-${i + 1}` },
            itemType: 'fitting' 
          });
          
          console.log(`✅ Fitting #${i + 1} noted successfully`);
        }
      }

      // All items submitted successfully
      const itemSummary = results.map((r) => {
        const itemType = r.itemType === 'bend' ? 'Bend' : r.itemType === 'fitting' ? 'Fitting' : 'Pipe';
        return `${itemType}: RFQ #${r.rfq?.rfqNumber || r.rfq?.id || 'Created'}`;
      }).join('\n');

      // Upload pending documents to the first RFQ created
      if (pendingDocuments.length > 0 && results[0]?.rfq?.id) {
        const rfqId = results[0].rfq.id;
        console.log(`📎 Uploading ${pendingDocuments.length} document(s) to RFQ #${rfqId}...`);

        let uploadedCount = 0;
        let failedCount = 0;

        for (const doc of pendingDocuments) {
          try {
            await rfqDocumentApi.upload(rfqId, doc.file);
            uploadedCount++;
            console.log(`✅ Uploaded: ${doc.file.name}`);
          } catch (uploadError) {
            failedCount++;
            console.error(`❌ Failed to upload ${doc.file.name}:`, uploadError);
          }
        }

        if (failedCount > 0) {
          console.warn(`⚠️ ${failedCount} document(s) failed to upload`);
        }

        // Clear pending documents after upload attempt
        setPendingDocuments([]);
      }

      alert(`Success! ${results.length} RFQ${results.length > 1 ? 's' : ''} created successfully!\n\n${itemSummary}`);

      // Call the success callback with the first RFQ ID
      onSuccess(results[0]?.rfq?.id || 'success');
      
    } catch (error: any) {
      console.error('Submission error:', error);
      
      // Extract error message
      let errorMessage = 'Failed to submit RFQ. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setValidationErrors({ submit: errorMessage });
      
      alert(`❌ Submission failed:\n\n${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Project/RFQ Details', description: 'Basic project and customer information' },
    { number: 2, title: 'Specifications', description: 'Working conditions and material specs' },
    { number: 3, title: 'Items', description: 'Add pipes, bends, and fittings' },
    { number: 4, title: 'Review & Submit', description: 'Final review and submission' }
  ];

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProjectDetailsStep
            rfqData={rfqData}
            onUpdate={updateRfqField}
            errors={validationErrors}
            globalSpecs={rfqData.globalSpecs}
            onUpdateGlobalSpecs={updateGlobalSpecs}
            pendingDocuments={pendingDocuments}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
          />
        );
      case 2:
        return (
          <SpecificationsStep
            globalSpecs={rfqData.globalSpecs}
            onUpdateGlobalSpecs={updateGlobalSpecs}
            masterData={masterData}
            errors={validationErrors}
            fetchAndSelectPressureClass={fetchAndSelectPressureClass}
            availablePressureClasses={availablePressureClasses}
            requiredProducts={rfqData.requiredProducts}
            rfqData={rfqData}
          />
        );
      case 3:
        return (
          <ItemUploadStep
            entries={rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries}
            globalSpecs={rfqData.globalSpecs}
            masterData={masterData}
            onAddEntry={addStraightPipeEntry}
            onAddBendEntry={addBendEntry}
            onAddFittingEntry={addFittingEntry}
            onUpdateEntry={handleUpdateEntry}
            onRemoveEntry={removeStraightPipeEntry}
            onCalculate={handleCalculateAll}
            onCalculateBend={handleCalculateBend}
            onCalculateFitting={handleCalculateFitting}
            errors={validationErrors}
            loading={false}
            fetchAvailableSchedules={fetchAvailableSchedules}
            availableSchedulesMap={availableSchedulesMap}
            setAvailableSchedulesMap={setAvailableSchedulesMap}
            fetchBendOptions={fetchBendOptions}
            bendOptionsCache={bendOptionsCache}
            autoSelectFlangeSpecs={autoSelectFlangeSpecs}
            requiredProducts={rfqData.requiredProducts}
          />
        );
      case 4:
        return (
          <ReviewSubmitStep
            entries={rfqData.straightPipeEntries}
            rfqData={rfqData}
            onSubmit={handleSubmit}
            onPrevStep={handlePrevStep}
            errors={validationErrors}
            loading={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Save Progress Confirmation Toast */}
      {showSaveConfirmation && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Progress Saved!</span>
          </div>
        </div>
      )}

      {/* Fixed Top Header Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Create RFQ</h1>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm font-medium text-blue-600">
              {steps.find(s => s.number === currentStep)?.title || 'RFQ'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {rfqData?.projectName || 'New RFQ'}
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-xl px-2"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content - grows to fill space, with padding for fixed bottom bar */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-4">
              {isLoadingMasterData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading system data...</span>
                  </div>
                </div>
              ) : (
                renderCurrentStep()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation Toolbar - always visible at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] px-4 py-3 shadow-2xl border-t border-gray-700"
        style={{ backgroundColor: '#001F3F' }}
      >
        <div className="flex items-center justify-between max-w-full">
          {/* Left side - Previous button */}
          <div className="w-32">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentStep === 1 ? 'transparent' : '#003366',
                color: '#FFA500',
                border: '1px solid #FFA500'
              }}
            >
              ← Previous
            </button>
          </div>

          {/* Center - Step Navigation Icons */}
          <div className="flex items-center gap-3">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step.number)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: step.number === currentStep
                      ? '#FFA500'
                      : step.number < currentStep
                      ? '#003366'
                      : 'transparent',
                    border: step.number === currentStep
                      ? '2px solid #FFA500'
                      : step.number < currentStep
                      ? '1px solid #4CAF50'
                      : '1px solid rgba(255, 165, 0, 0.3)'
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: step.number === currentStep
                        ? '#001F3F'
                        : step.number < currentStep
                        ? '#4CAF50'
                        : 'rgba(255, 165, 0, 0.3)',
                      color: '#FFFFFF'
                    }}
                  >
                    {step.number < currentStep ? '✓' : step.number}
                  </div>
                  <span
                    className="text-sm font-medium hidden md:inline"
                    style={{
                      color: step.number === currentStep
                        ? '#001F3F'
                        : step.number < currentStep
                        ? '#4CAF50'
                        : 'rgba(255, 165, 0, 0.6)'
                    }}
                  >
                    {step.title}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className="w-8 h-0.5 mx-1"
                    style={{ backgroundColor: step.number < currentStep ? '#4CAF50' : 'rgba(255, 165, 0, 0.3)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Right side - Save Progress & Next/Submit buttons */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleSaveProgress}
              className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all"
              style={{
                backgroundColor: '#003366',
                color: '#FFA500',
                border: '1px solid #FFA500'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Progress
            </button>
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#FFA500', color: '#001F3F' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => {/* Submit logic handled in step 4 */}}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#4CAF50', color: '#FFFFFF' }}
              >
                Submit RFQ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
