'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  supplierPortalApi,
  SupplierBoqDetailResponse,
  SupplierBoqStatus,
  BoqSection,
  ConsolidatedItem,
  RfqItemDetail,
} from '@/app/lib/api/supplierApi';
import { useToast } from '@/app/components/Toast';
import { formatDateTimeZA, nowISO } from '@/app/lib/datetime';
import { currencyByCode, DEFAULT_CURRENCY, vatRateForCurrency } from '@/app/lib/currencies';
import {
  NB_TO_OD_LOOKUP,
  flangeWeightSync as flangeWeight,
  blankFlangeWeightSync as blankFlangeWeight,
  sansBlankFlangeWeightSync as sansBlankFlangeWeight,
} from '@/app/lib/hooks/useFlangeWeights';
import { weldCountPerPipe, weldCountPerBend, weldCountPerFitting } from '@/app/lib/config/rfq/pipeEndOptions';
import { log } from '@/app/lib/logger';

interface PricingInputs {
  steelSpecs: Record<string, number>;
  weldTypes: Record<string, number>;
  flangeTypes: Record<string, number>;
  bnwTypes: Record<string, number>;
  labourExtrasPercent: number;
  contingenciesPercent: number;
}

interface ExtractedSpecs {
  steelSpecs: string[];
  weldTypes: {
    flangeWeld: boolean;
    mitreWeld: boolean;
    teeWeld: boolean;
    tackWeld: boolean;
  };
  flangeTypes: {
    slipOn: boolean;
    rotating: boolean;
    blank: boolean;
  };
  bnwGrade: string | null;
}

interface WeldTotals {
  flangeWeld: number;
  mitreWeld: number;
  teeWeld: number;
  tackWeld: number;
}

const normalizeSteelSpec = (spec: string): string => {
  return spec
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/SABS\s*(\d+)/g, 'SABS $1')
    .trim();
};

const isRotatingFlange = (config: string): boolean => {
  return config.includes('RF') || config.includes('R/F');
};

const isSlipOnFlange = (config: string): boolean => {
  return Boolean(config) && config !== 'PE' && !isRotatingFlange(config);
};

const flangeCountFromConfig = (config: string | undefined, itemType: string): number => {
  if (!config || config === 'PE') return 0;
  if (itemType === 'bend' || itemType === 'straight_pipe') {
    const counts: Record<string, number> = {
      'FOE': 1, 'FBE': 2, 'FOE_LF': 2, 'FOE_RF': 2, '2X_RF': 2, '2xLF': 2,
    };
    return counts[config] || 0;
  }
  if (itemType === 'fitting') {
    const counts: Record<string, number> = {
      'FAE': 3, 'FFF': 3, 'F2E': 2, 'F2E_RF': 3, 'F2E_LF': 3, '3X_RF': 3, '2X_RF_FOE': 3,
      'FFP': 2, 'PFF': 2, 'PPF': 1, 'FPP': 1, 'PFP': 1,
    };
    return counts[config] || 0;
  }
  return 0;
};

const recalculateFlangeWeight = (description: string, qty: number, isBlankFlange: boolean): number => {
  const nbMatch = description.match(/(\d+)\s*NB/i);
  const nb = nbMatch ? parseInt(nbMatch[1]) : 0;
  if (nb === 0) return 0;

  const pressureClassMatch = description.match(/(\d+\/\d)/);
  const pressureClass = pressureClassMatch ? pressureClassMatch[1] : 'PN16';

  const isSans = description.toUpperCase().includes('SABS') || description.toUpperCase().includes('SANS') || pressureClassMatch;
  const flangeStandard = isSans ? 'SANS 1123' : '';

  if (isBlankFlange || description.toUpperCase().includes('BLANK')) {
    if (isSans) {
      return sansBlankFlangeWeight(nb, pressureClass) * qty;
    }
    return blankFlangeWeight(nb, pressureClass) * qty;
  }

  return flangeWeight(nb, pressureClass, flangeStandard) * qty;
};

const extractUniqueSpecs = (items: RfqItemDetail[]): ExtractedSpecs => {
  const steelSpecs = new Set<string>();
  const flangeTypes = { slipOn: false, rotating: false, blank: false };

  items.forEach((item) => {
    const straightDetails = item.straightPipeDetails;
    const bendDetails = item.bendDetails;
    const fittingDetails = item.fittingDetails;

    if (straightDetails) {
      if (straightDetails.pipeStandard) {
        steelSpecs.add(normalizeSteelSpec(straightDetails.pipeStandard));
      }
      const config = straightDetails.pipeEndConfiguration;
      if (config && config !== 'PE') {
        if (isRotatingFlange(config)) {
          flangeTypes.rotating = true;
        }
        if (isSlipOnFlange(config)) {
          flangeTypes.slipOn = true;
        }
      }
    }

    if (bendDetails) {
      if (bendDetails.pipeStandard) {
        steelSpecs.add(normalizeSteelSpec(bendDetails.pipeStandard));
      }
      const config = bendDetails.bendEndConfiguration;
      if (config && config !== 'PE') {
        if (isRotatingFlange(config)) {
          flangeTypes.rotating = true;
        }
        if (isSlipOnFlange(config)) {
          flangeTypes.slipOn = true;
        }
      }
    }

    if (fittingDetails) {
      if (fittingDetails.fittingStandard) {
        steelSpecs.add(normalizeSteelSpec(fittingDetails.fittingStandard));
      }
      const config = fittingDetails.pipeEndConfiguration;
      if (config && config !== 'PE') {
        if (isRotatingFlange(config)) {
          flangeTypes.rotating = true;
        }
        if (isSlipOnFlange(config)) {
          flangeTypes.slipOn = true;
        }
      }
      if (fittingDetails.addBlankFlange) {
        flangeTypes.blank = true;
      }
    }

    const description = item.description.toUpperCase();
    const sabsMatch = description.match(/SABS\s*(\d+)/);
    if (sabsMatch) {
      steelSpecs.add(`SABS ${sabsMatch[1]}`);
    }
    if (description.includes('BLANK') && description.includes('FLANGE')) {
      flangeTypes.blank = true;
    }
  });

  return {
    steelSpecs: Array.from(steelSpecs).sort(),
    weldTypes: { flangeWeld: false, mitreWeld: false, teeWeld: false, tackWeld: false },
    flangeTypes,
    bnwGrade: null,
  };
};

const NOMINAL_TO_OD_MM: Record<number, number> = {
  15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3,
  65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1,
  250: 273.1, 300: 323.9, 350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0,
  550: 558.8, 600: 609.6, 650: 660.4, 700: 711.2, 750: 762.0, 800: 812.8,
  850: 863.6, 900: 914.4, 950: 965.2, 1000: 1016.0, 1050: 1066.8, 1100: 1117.6,
  1200: 1219.2, 1400: 1422.4, 1500: 1524.0, 1600: 1625.6, 1800: 1828.8, 2000: 2032.0,
};

const nominalToOutsideDiameter = (nominalBoreMm: number | undefined): number => {
  if (!nominalBoreMm) return 0;
  const roundedNominal = Math.round(nominalBoreMm);
  if (NOMINAL_TO_OD_MM[roundedNominal]) {
    return NOMINAL_TO_OD_MM[roundedNominal];
  }
  const keys = Object.keys(NOMINAL_TO_OD_MM).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - roundedNominal) < Math.abs(prev - roundedNominal) ? curr : prev
  );
  return NOMINAL_TO_OD_MM[closest] || roundedNominal * 1.05;
};

const calculateWeldCircumference = (diameterMm: number | undefined): number => {
  if (!diameterMm) return 0;
  return (Math.PI * diameterMm) / 1000;
};

const countFlangesFromConfig = (config: string | undefined, itemType: string): number => {
  if (!config || config === 'PE') return 0;
  if (itemType === 'straight_pipe') {
    const counts: Record<string, number> = { 'FOE': 1, 'FBE': 2, 'FOE_LF': 2, 'FOE_RF': 2, '2X_RF': 2, '2xLF': 4 };
    return counts[config] || 0;
  }
  if (itemType === 'bend') {
    const counts: Record<string, number> = { 'FOE': 1, 'FBE': 2, 'FOE_LF': 2, 'FOE_RF': 2, '2X_RF': 2, '2xLF': 4 };
    return counts[config] || 0;
  }
  if (itemType === 'fitting') {
    const counts: Record<string, number> = {
      'FAE': 3, 'FFF': 3, 'F2E': 2, 'F2E_RF': 3, 'F2E_LF': 3, '3X_RF': 3, '2X_RF_FOE': 3,
      'FFP': 2, 'PFF': 2, 'PPF': 1, 'FPP': 1, 'PFP': 1
    };
    return counts[config] || 0;
  }
  return 0;
};

const hasLooseFlanges = (config: string | undefined): boolean => {
  if (!config) return false;
  return config.includes('LF') || config.includes('_L') || config === '2xLF';
};

const countLooseFlanges = (config: string | undefined, itemType: string): number => {
  if (!config) return 0;
  if (itemType === 'straight_pipe' || itemType === 'bend') {
    const counts: Record<string, number> = {
      'FOE_LF': 1, '2xLF': 2, '2X_RF': 0,
    };
    if (counts[config] !== undefined) return counts[config];
    if (config.includes('LF')) return 1;
    if (config.includes('_L')) return 1;
  }
  if (itemType === 'fitting') {
    const counts: Record<string, number> = {
      'F2E_LF': 1, 'FAE_LF': 1,
    };
    if (counts[config] !== undefined) return counts[config];
    if (config.includes('LF')) return 1;
    if (config.includes('_L')) return 1;
  }
  return 0;
};

const extractWeldTypesFromRfqItems = (items: RfqItemDetail[]): { weldTypes: ExtractedSpecs['weldTypes']; totals: WeldTotals } => {
  const weldTypes = { flangeWeld: false, mitreWeld: false, teeWeld: false, tackWeld: false };
  const totals = { flangeWeld: 0, mitreWeld: 0, teeWeld: 0, tackWeld: 0 };

  items.forEach((item) => {
    const qty = item.quantity || 1;

    if (item.straightPipeDetails) {
      const details = item.straightPipeDetails;
      const outsideDiameter = details.calculatedOdMm || nominalToOutsideDiameter(details.nominalBoreMm);
      const circumference = calculateWeldCircumference(outsideDiameter);
      const flangeCount = countFlangesFromConfig(details.pipeEndConfiguration, 'straight_pipe');
      const hasLoose = hasLooseFlanges(details.pipeEndConfiguration);

      if (details.totalButtWeldLengthM && details.totalButtWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalButtWeldLengthM * qty;
      } else if (details.numberOfButtWelds && details.numberOfButtWelds > 0 && circumference > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * details.numberOfButtWelds * qty;
      }

      if (details.totalFlangeWeldLengthM && details.totalFlangeWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalFlangeWeldLengthM * qty;
      } else if (circumference > 0 && flangeCount > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * flangeCount * qty;
      }

      if (hasLoose) {
        const looseFlangeCount = countLooseFlanges(details.pipeEndConfiguration, 'straight_pipe');
        if (looseFlangeCount > 0) {
          weldTypes.tackWeld = true;
          totals.tackWeld += 0.08 * looseFlangeCount * qty;
        }
      }
    }

    if (item.bendDetails) {
      const details = item.bendDetails;
      const outsideDiameter = nominalToOutsideDiameter(details.nominalBoreMm);
      const circumference = calculateWeldCircumference(outsideDiameter);
      const flangeCount = countFlangesFromConfig(details.bendEndConfiguration, 'bend');
      const numberOfTangents = details.numberOfTangents || 0;
      const hasLoose = hasLooseFlanges(details.bendEndConfiguration);

      if (numberOfTangents > 0 && circumference > 0) {
        weldTypes.mitreWeld = true;
        totals.mitreWeld += circumference * (numberOfTangents + 1) * qty;
      }

      if (details.totalButtWeldLengthM && details.totalButtWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalButtWeldLengthM * qty;
      } else if (numberOfTangents > 0 && circumference > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * numberOfTangents * qty;
      }

      if (details.totalFlangeWeldLengthM && details.totalFlangeWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalFlangeWeldLengthM * qty;
      } else if (circumference > 0 && flangeCount > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * flangeCount * qty;
      }

      if (hasLoose) {
        const looseFlangeCount = countLooseFlanges(details.bendEndConfiguration, 'bend');
        if (looseFlangeCount > 0) {
          weldTypes.tackWeld = true;
          totals.tackWeld += 0.08 * looseFlangeCount * qty;
        }
      }
    }

    if (item.fittingDetails) {
      const details = item.fittingDetails;
      const mainOd = nominalToOutsideDiameter(details.nominalDiameterMm);
      const branchOd = details.branchNominalDiameterMm ? nominalToOutsideDiameter(details.branchNominalDiameterMm) : mainOd;
      const mainCircumference = calculateWeldCircumference(mainOd);
      const branchCircumference = calculateWeldCircumference(branchOd);
      const flangeCount = details.numberOfFlanges || countFlangesFromConfig(details.pipeEndConfiguration, 'fitting');
      const fittingType = (details.fittingType || '').toLowerCase();
      const isTee = fittingType.includes('tee') || fittingType.includes('stub');
      const hasLoose = hasLooseFlanges(details.pipeEndConfiguration);

      if (mainCircumference > 0 && flangeCount > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += mainCircumference * flangeCount * qty;
      }

      if (details.numberOfTeeWelds && details.numberOfTeeWelds > 0) {
        weldTypes.teeWeld = true;
        totals.teeWeld += branchCircumference * details.numberOfTeeWelds * qty;
      } else if (isTee && branchCircumference > 0) {
        weldTypes.teeWeld = true;
        totals.teeWeld += branchCircumference * qty;
      }

      if (hasLoose) {
        const looseFlangeCount = countLooseFlanges(details.pipeEndConfiguration, 'fitting');
        if (looseFlangeCount > 0) {
          weldTypes.tackWeld = true;
          totals.tackWeld += 0.08 * looseFlangeCount * qty;
        }
      }
    }
  });

  return { weldTypes, totals };
};

const statusColors: Record<SupplierBoqStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  viewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Viewed' },
  quoted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Quoted' },
  declined: { bg: 'bg-red-100', text: 'text-red-800', label: 'Declined' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SupplierBoqDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const boqId = parseInt(resolvedParams.id, 10);

  const [boqDetail, setBoqDetail] = useState<SupplierBoqDetailResponse | null>(null);
  const [rfqItems, setRfqItems] = useState<RfqItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfqLoading, setRfqLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [decliningLoading, setDecliningLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [viewMode, setViewMode] = useState<'boq' | 'rfq'>('boq');
  const [supplierCurrency, setSupplierCurrency] = useState(DEFAULT_CURRENCY);
  const [unitPrices, setUnitPrices] = useState<Record<string, Record<number, number>>>({});
  const [extractedSpecs, setExtractedSpecs] = useState<ExtractedSpecs>({
    steelSpecs: [],
    weldTypes: { flangeWeld: false, mitreWeld: false, teeWeld: false, tackWeld: false },
    flangeTypes: { slipOn: false, rotating: false, blank: false },
    bnwGrade: null,
  });
  const [weldTotals, setWeldTotals] = useState<WeldTotals>({
    flangeWeld: 0,
    mitreWeld: 0,
    teeWeld: 0,
    tackWeld: 0,
  });
  const [pricingInputs, setPricingInputs] = useState<PricingInputs>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('supplier_pricing_inputs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          steelSpecs: parsed.steelSpecs || {},
          weldTypes: parsed.weldTypes || {},
          flangeTypes: parsed.flangeTypes || {},
          bnwTypes: parsed.bnwTypes || {},
          labourExtrasPercent: parsed.labourExtrasPercent || 0,
          contingenciesPercent: parsed.contingenciesPercent ?? 5,
        };
      }
    }
    return {
      steelSpecs: {},
      weldTypes: {},
      flangeTypes: {},
      bnwTypes: {},
      labourExtrasPercent: 0,
      contingenciesPercent: 5,
    };
  });
  const [weldUnitPrices, setWeldUnitPrices] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('supplier_weld_unit_prices');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return {};
  });

  useEffect(() => {
    loadBoqDetails();
    loadSupplierCurrency();
    loadRfqItems();
  }, [boqId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('supplier_pricing_inputs', JSON.stringify(pricingInputs));
    }
  }, [pricingInputs]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('supplier_weld_unit_prices', JSON.stringify(weldUnitPrices));
    }
  }, [weldUnitPrices]);

  useEffect(() => {
    if (rfqItems.length > 0) {
      const { weldTypes, totals } = extractWeldTypesFromRfqItems(rfqItems);
      setExtractedSpecs((prev) => ({ ...prev, weldTypes }));
      setWeldTotals(totals);
    }
  }, [rfqItems]);

  useEffect(() => {
    if (boqDetail?.sections) {
      const hasBlankFlangesSection = boqDetail.sections.some(
        (section) => section.sectionType === 'blank_flanges' && section.items.length > 0
      );

      const hasFlangesSection = boqDetail.sections.some(
        (section) => (section.sectionType === 'flanges' || section.sectionType === 'blank_flanges') && section.items.length > 0
      );

      const bnwSection = boqDetail.sections.find(
        (section) => section.sectionType === 'bnw_sets' && section.items.length > 0
      );

      setExtractedSpecs((prev) => {
        let bnwGrade: string | null = null;
        if (bnwSection && bnwSection.items.length > 0) {
          const firstItemDesc = bnwSection.items[0].description.toUpperCase();
          const gradeMatch = firstItemDesc.match(/GRADE\s*([\d.]+)/i) || firstItemDesc.match(/GR\s*([\d.]+)/i);
          bnwGrade = gradeMatch ? `Grade ${gradeMatch[1]}` : 'Standard';
        }

        return {
          ...prev,
          flangeTypes: hasBlankFlangesSection ? { ...prev.flangeTypes, blank: true } : prev.flangeTypes,
          bnwGrade,
        };
      });
    }
  }, [boqDetail, rfqItems]);

  const loadSupplierCurrency = async () => {
    try {
      const profile = await supplierPortalApi.getProfile();
      if (profile?.company?.currencyCode) {
        setSupplierCurrency(profile.company.currencyCode);
      }
    } catch (err) {
      log.error('Failed to load supplier currency:', err);
    }
  };

  const handleUnitPriceChange = (sectionId: string, itemIndex: number, value: number) => {
    setUnitPrices((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemIndex]: value,
      },
    }));
  };

  const loadRfqItems = async () => {
    try {
      setRfqLoading(true);
      const items = await supplierPortalApi.getRfqItems(boqId);
      setRfqItems(items);
      const specs = extractUniqueSpecs(items);
      setExtractedSpecs((prev) => ({
        ...specs,
        bnwGrade: prev.bnwGrade,
      }));
    } catch (err) {
      log.error('Failed to load RFQ items:', err);
    } finally {
      setRfqLoading(false);
    }
  };

  const handlePricingInputChange = (
    category: 'steelSpecs' | 'weldTypes' | 'flangeTypes' | 'bnwTypes',
    key: string,
    value: number
  ) => {
    setPricingInputs((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handlePercentageChange = (
    field: 'labourExtrasPercent' | 'contingenciesPercent',
    value: number
  ) => {
    setPricingInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleWeldUnitPriceChange = (weldType: string, value: number) => {
    setWeldUnitPrices((prev) => ({
      ...prev,
      [weldType]: value,
    }));
  };

  const loadBoqDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await supplierPortalApi.getBoqDetails(boqId);
      setBoqDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOQ details');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      showToast('Please provide a reason for declining', 'warning');
      return;
    }

    try {
      setDecliningLoading(true);
      await supplierPortalApi.declineBoq(boqId, declineReason);
      setShowDeclineModal(false);
      showToast('BOQ declined successfully', 'success');
      loadBoqDetails();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline BOQ', 'error');
    } finally {
      setDecliningLoading(false);
    }
  };

  const handleSaveProgress = async () => {
    try {
      setSavingProgress(true);
      await supplierPortalApi.saveQuoteProgress(boqId, {
        pricingInputs,
        unitPrices,
        weldUnitPrices,
      });
      showToast('Progress saved successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save progress', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSubmitQuote = async () => {
    try {
      setSubmittingQuote(true);
      await supplierPortalApi.submitQuote(boqId, {
        pricingInputs,
        unitPrices,
        weldUnitPrices,
      });
      showToast('Quote submitted successfully', 'success');
      loadBoqDetails();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit quote', 'error');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const exportToExcel = () => {
    if (!boqDetail) return;

    const workbook = XLSX.utils.book_new();

    if (viewMode === 'rfq' && rfqItems.length > 0) {
      const headers = [
        'Line #', 'Type', 'Description', 'Qty', 'NB (mm)', 'Wall/Sch',
        'End Config', 'Weight/Unit (kg)', 'Total Weight (kg)', 'Notes'
      ];

      const rows = rfqItems.map((item) => {
        const details = item.straightPipeDetails || item.bendDetails || item.fittingDetails;
        const nb = item.straightPipeDetails?.nominalBoreMm ||
                   item.bendDetails?.nominalBoreMm ||
                   item.fittingDetails?.nominalDiameterMm || '-';
        const wallSch = details?.scheduleNumber
          ? `Sch ${details.scheduleNumber}`
          : details?.wallThicknessMm
            ? `${details.wallThicknessMm}mm`
            : '-';
        const endConfig = item.straightPipeDetails?.pipeEndConfiguration ||
                          item.bendDetails?.bendEndConfiguration ||
                          item.fittingDetails?.pipeEndConfiguration || '-';

        return [
          item.lineNumber,
          item.itemType,
          item.description,
          item.quantity,
          nb,
          wallSch,
          endConfig,
          Number(item.weightPerUnitKg || 0).toFixed(2),
          Number(item.totalWeightKg || 0).toFixed(2),
          item.notes || ''
        ];
      });

      const totalWeight = rfqItems.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0);
      rows.push(['', '', 'TOTAL', '', '', '', '', '', totalWeight.toFixed(2), '']);

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 60 }, { wch: 6 }, { wch: 8 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(workbook, ws, 'RFQ Items');

      const fileName = `RFQ_${boqDetail.boq.boqNumber}_${nowISO().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } else {
      boqDetail.sections.forEach((section) => {
        const hasWelds = section.items.some(
          (item) =>
            item.welds?.flangeWeld || item.welds?.mitreWeld || item.welds?.teeWeld
        );
        const hasAreas = section.items.some((item) => item.areas?.intAreaM2 || item.areas?.extAreaM2);

        const headers = ['#', 'Description', 'Qty', 'Unit'];
        if (hasWelds) {
          headers.push('Flange Weld (m)', 'Mitre Weld (m)', 'Tee Weld (m)');
        }
        if (hasAreas) {
          headers.push('Int Area (m²)', 'Ext Area (m²)');
        }
        headers.push('Weight (kg)');

        const rows = section.items.map((item, idx) => {
          const row: (string | number)[] = [idx + 1, item.description, item.qty, item.unit];
          if (hasWelds) {
            row.push(
              item.welds?.flangeWeld ? Number(item.welds.flangeWeld).toFixed(3) : '-',
              item.welds?.mitreWeld ? Number(item.welds.mitreWeld).toFixed(3) : '-',
              item.welds?.teeWeld ? Number(item.welds.teeWeld).toFixed(3) : '-'
            );
          }
          if (hasAreas) {
            row.push(
              item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : '-',
              item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : '-'
            );
          }
          row.push(Number(item.weightKg || 0).toFixed(2));
          return row;
        });

        const totalWeightIdx = headers.indexOf('Weight (kg)');
        const totalsRow: (string | number)[] = headers.map((_, idx) => {
          if (idx === 1) return 'TOTAL';
          if (idx === totalWeightIdx) return Number(section.totalWeightKg || 0).toFixed(2);
          return '';
        });
        rows.push(totalsRow);

        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
          { wch: 5 },
          { wch: 50 },
          { wch: 8 },
          { wch: 8 },
          ...Array(headers.length - 4).fill({ wch: 15 }),
        ];

        const sheetName = section.sectionTitle.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      });

      const fileName = `BOQ_${boqDetail.boq.boqNumber}_${nowISO().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return formatDateTimeZA(dateString);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading BOQ details...</span>
        </div>
      </div>
    );
  }

  if (error || !boqDetail) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error || 'BOQ not found'}</div>
          <Link
            href="/supplier/portal/boqs"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to BOQ List
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = statusColors[boqDetail.accessStatus];

  return (
    <div className="space-y-6">
      {/* Project & Customer Info - Compact 3-column layout */}
      {(boqDetail.projectInfo || boqDetail.customerInfo) && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            {/* Row 1 */}
            <div>
              <span className="text-xs font-medium text-gray-500">Project</span>
              <p className="text-sm text-gray-900">{boqDetail.projectInfo?.name || '-'}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Description</span>
              <p className="text-sm text-gray-900 truncate">{boqDetail.projectInfo?.description || '-'}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Required Date</span>
              <p className="text-sm text-gray-900">{boqDetail.projectInfo?.requiredDate ? formatDate(boqDetail.projectInfo.requiredDate) : '-'}</p>
            </div>
            {/* Row 2 */}
            <div>
              <span className="text-xs font-medium text-gray-500">Customer</span>
              <p className="text-sm text-gray-900">{boqDetail.customerInfo?.company || '-'}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Contact</span>
              <p className="text-sm text-gray-900">{boqDetail.customerInfo?.name || '-'}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Email</span>
              <p className="text-sm text-gray-900">
                {boqDetail.customerInfo?.email ? (
                  <a href={`mailto:${boqDetail.customerInfo.email}`} className="text-blue-600 hover:underline">
                    {boqDetail.customerInfo.email}
                  </a>
                ) : '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Inputs Section */}
      <PricingInputsSection
        extractedSpecs={extractedSpecs}
        pricingInputs={pricingInputs}
        onPricingInputChange={handlePricingInputChange}
        onPercentageChange={handlePercentageChange}
        currencyCode={supplierCurrency}
      />

      {/* Header with BOQ Number and Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/supplier/portal/boqs"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">
                {boqDetail.boq.boqNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusStyle.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {boqDetail.projectInfo?.name || boqDetail.boq.title}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'boq' ? 'rfq' : 'boq')}
              className="inline-flex items-center px-4 py-2 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              {viewMode === 'boq' ? 'RFQ View' : 'BOQ View'}
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            {boqDetail.accessStatus !== 'declined' && boqDetail.accessStatus !== 'quoted' && (
              <button
                onClick={() => setShowDeclineModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Decline
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOQ/RFQ Content */}
      {viewMode === 'boq' ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Bill of Quantities ({boqDetail.sections.length} sections)
          </h2>

          <div className="space-y-8">
            {boqDetail.sections.map((section) => (
              <SectionTable
                key={section.id}
                section={section}
                currencyCode={supplierCurrency}
                unitPrices={unitPrices[String(section.id)] || {}}
                onUnitPriceChange={(itemIndex, value) => handleUnitPriceChange(String(section.id), itemIndex, value)}
                pricingInputs={pricingInputs}
                rfqItems={rfqItems}
              />
            ))}

            {/* Welding Section */}
            <WeldsSection
              weldTotals={weldTotals}
              extractedSpecs={extractedSpecs}
              pricingInputs={pricingInputs}
              currencyCode={supplierCurrency}
              weldUnitPrices={weldUnitPrices}
              onWeldUnitPriceChange={handleWeldUnitPriceChange}
            />
          </div>

          {/* Grand Totals Section */}
          <GrandTotalsSection
            sections={boqDetail.sections}
            unitPrices={unitPrices}
            pricingInputs={pricingInputs}
            currencyCode={supplierCurrency}
            rfqItems={rfqItems}
            weldTotals={weldTotals}
            extractedSpecs={extractedSpecs}
            weldUnitPrices={weldUnitPrices}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            RFQ Item Details ({rfqItems.length > 0 ? rfqItems.length : boqDetail.sections.reduce((sum, s) => sum + s.items.length, 0)} items)
          </h2>

          {rfqLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading RFQ details...</span>
            </div>
          ) : rfqItems.length > 0 ? (
            <div className="space-y-6">
              <RfqItemsDetailedView
                items={rfqItems}
                sections={boqDetail.sections}
                currencyCode={supplierCurrency}
                pricingInputs={pricingInputs}
                unitPrices={unitPrices}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {boqDetail.sections.map((section) => (
                <RfqSectionTable key={section.id} section={section} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Progress and Submit Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Save your progress at any time and return to complete your quote later.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSaveProgress}
              disabled={savingProgress || submittingQuote}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProgress ? 'Saving...' : 'Save Progress'}
            </button>
            <button
              onClick={handleSubmitQuote}
              disabled={savingProgress || submittingQuote || boqDetail?.accessStatus === 'quoted'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingQuote ? 'Submitting...' : 'Submit Quote'}
            </button>
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDeclineModal(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Decline to Quote</h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide a reason for declining this quotation request.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Enter your reason..."
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={decliningLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={decliningLoading}
                >
                  {decliningLoading ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PricingInputsSectionProps {
  extractedSpecs: ExtractedSpecs;
  pricingInputs: PricingInputs;
  onPricingInputChange: (category: 'steelSpecs' | 'weldTypes' | 'flangeTypes' | 'bnwTypes', key: string, value: number) => void;
  onPercentageChange: (field: 'labourExtrasPercent' | 'contingenciesPercent', value: number) => void;
  currencyCode: string;
}

function PricingInputsSection({
  extractedSpecs,
  pricingInputs,
  onPricingInputChange,
  onPercentageChange,
  currencyCode,
}: PricingInputsSectionProps) {
  const currency = currencyByCode(currencyCode);
  const currencySymbol = currency?.symbol || currencyCode;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 w-full">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing Inputs</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your prices below and the BOQ item unit prices will be automatically calculated based on weight.
      </p>

      <div className="flex flex-wrap gap-6 w-full [&>div]:flex-1 [&>div]:min-w-[200px]">
        {/* Steel Specifications */}
        <div className="space-y-3 min-w-0">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Steel Specifications (Price/kg)</h3>
          {extractedSpecs.steelSpecs.length > 0 ? (
            extractedSpecs.steelSpecs.map((spec) => (
              <div key={spec} className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1 min-w-0 truncate" title={spec}>
                  {spec}
                </label>
                <div className="flex items-center flex-shrink-0">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.steelSpecs[spec] || ''}
                    onChange={(e) => onPricingInputChange('steelSpecs', spec, parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Kg</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex-1">
                Steel (General)
              </label>
              <div className="flex items-center flex-shrink-0">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingInputs.steelSpecs['Steel'] || ''}
                  onChange={(e) => onPricingInputChange('steelSpecs', 'Steel', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
          )}
        </div>

        {/* Weld Types - only show types used in this RFQ */}
        {(extractedSpecs.weldTypes.flangeWeld ||
          extractedSpecs.weldTypes.mitreWeld || extractedSpecs.weldTypes.teeWeld || extractedSpecs.weldTypes.tackWeld) && (
          <div className="space-y-3 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Weld Types (Price/Lm)</h3>
            {extractedSpecs.weldTypes.flangeWeld && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1">Flange Weld</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.weldTypes['flangeWeld'] || ''}
                    onChange={(e) => onPricingInputChange('weldTypes', 'flangeWeld', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Lm</span>
                </div>
              </div>
            )}
            {extractedSpecs.weldTypes.mitreWeld && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1">Mitre Weld</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.weldTypes['mitreWeld'] || ''}
                    onChange={(e) => onPricingInputChange('weldTypes', 'mitreWeld', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Lm</span>
                </div>
              </div>
            )}
            {extractedSpecs.weldTypes.teeWeld && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1">Tee Weld</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.weldTypes['teeWeld'] || ''}
                    onChange={(e) => onPricingInputChange('weldTypes', 'teeWeld', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Lm</span>
                </div>
              </div>
            )}
            {extractedSpecs.weldTypes.tackWeld && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1">Tack Weld (Loose Flange)</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.weldTypes['tackWeld'] || ''}
                    onChange={(e) => onPricingInputChange('weldTypes', 'tackWeld', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Lm</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flange Price Centers - only show types used in this RFQ */}
        {(extractedSpecs.flangeTypes.slipOn || extractedSpecs.flangeTypes.rotating || extractedSpecs.flangeTypes.blank) && (
          <div className="space-y-3 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Flange Pricing (Price/unit)</h3>
            {extractedSpecs.flangeTypes.slipOn && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1">Slip On Flange</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.flangeTypes['slipOn'] || ''}
                    onChange={(e) => onPricingInputChange('flangeTypes', 'slipOn', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Kg</span>
                </div>
              </div>
            )}
            {extractedSpecs.flangeTypes.rotating && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1">Rotating Flange (R/F)</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.flangeTypes['rotating'] || ''}
                    onChange={(e) => onPricingInputChange('flangeTypes', 'rotating', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Kg</span>
                </div>
              </div>
            )}
            {extractedSpecs.flangeTypes.blank && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1">Blank Flange</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.flangeTypes['blank'] || ''}
                    onChange={(e) => onPricingInputChange('flangeTypes', 'blank', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Kg</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bolts, Nuts & Washers Pricing - only show if BNW section exists */}
        {extractedSpecs.bnwGrade && (
          <div className="space-y-3 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Bolts, Nuts & Washers - {extractedSpecs.bnwGrade} (Price/Kg)
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex-1">Bolts</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingInputs.bnwTypes['bolts'] || ''}
                  onChange={(e) => onPricingInputChange('bnwTypes', 'bolts', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex-1">Nuts</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingInputs.bnwTypes['nuts'] || ''}
                  onChange={(e) => onPricingInputChange('bnwTypes', 'nuts', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex-1">Washers</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingInputs.bnwTypes['washers'] || ''}
                  onChange={(e) => onPricingInputChange('bnwTypes', 'washers', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Labour & Extras and Contingencies */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Labour & Extras
            </label>
            <div className="flex items-center w-28">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pricingInputs.labourExtrasPercent || ''}
                onChange={(e) => onPercentageChange('labourExtrasPercent', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">(Added to each line item)</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Contingencies
            </label>
            <div className="flex items-center w-28">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pricingInputs.contingenciesPercent || ''}
                onChange={(e) => onPercentageChange('contingenciesPercent', parseFloat(e.target.value) || 0)}
                placeholder="5"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">(Added to grand total)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GrandTotalsSectionProps {
  sections: BoqSection[];
  unitPrices: Record<string, Record<number, number>>;
  pricingInputs: PricingInputs;
  currencyCode: string;
  rfqItems: RfqItemDetail[];
  weldTotals: WeldTotals;
  extractedSpecs: ExtractedSpecs;
  weldUnitPrices: Record<string, number>;
}

function GrandTotalsSection({ sections, unitPrices, pricingInputs, currencyCode, rfqItems, weldTotals, extractedSpecs, weldUnitPrices }: GrandTotalsSectionProps) {
  const currency = currencyByCode(currencyCode);
  const currencySymbol = currency?.symbol || currencyCode;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateSuggestedPriceForItem = (item: ConsolidatedItem, sectionType: string): number => {
    const isFabricatedSection = ['straight_pipes', 'bends', 'fittings', 'tees'].includes(sectionType);
    const isFlangesSection = sectionType === 'flanges' || sectionType === 'blank_flanges';
    const isBlankFlangesSection = sectionType === 'blank_flanges';
    const isBnwSection = sectionType === 'bnw_sets';
    const description = item.description.toUpperCase();
    const weightPerUnit = item.qty > 0 ? (item.weightKg / item.qty) : 0;

    if (isBnwSection) {
      const totalBnwWeight = weightPerUnit;
      const boltWeight = totalBnwWeight * 0.55;
      const nutWeight = totalBnwWeight * 0.30;
      const washerWeight = totalBnwWeight * 0.15;

      const boltPrice = (pricingInputs.bnwTypes['bolts'] || 0) * boltWeight;
      const nutPrice = (pricingInputs.bnwTypes['nuts'] || 0) * nutWeight;
      const washerPrice = (pricingInputs.bnwTypes['washers'] || 0) * washerWeight;

      return boltPrice + nutPrice + washerPrice;
    }

    if (isFlangesSection) {
      let flangePrice = 0;
      if (isBlankFlangesSection || description.includes('BLANK')) {
        flangePrice = (pricingInputs.flangeTypes['blank'] || 0) * weightPerUnit;
      } else if (description.includes('ROTATING') || description.includes('R/F')) {
        flangePrice = (pricingInputs.flangeTypes['rotating'] || 0) * weightPerUnit;
      } else {
        flangePrice = (pricingInputs.flangeTypes['slipOn'] || 0) * weightPerUnit;
      }
      const labourExtras = flangePrice * (pricingInputs.labourExtrasPercent / 100);
      return flangePrice + labourExtras;
    }

    if (!isFabricatedSection) return 0;

    let basePrice = 0;

    const rfqItem = item.entries.length > 0
      ? rfqItems.find(ri => ri.lineNumber === item.entries[0] || ri.id === item.entries[0])
      : null;

    const itemSteelSpec = rfqItem
      ? normalizeSteelSpec(
          rfqItem.straightPipeDetails?.pipeStandard ||
          rfqItem.bendDetails?.pipeStandard ||
          rfqItem.fittingDetails?.fittingStandard ||
          ''
        )
      : '';

    Object.entries(pricingInputs.steelSpecs).forEach(([spec, pricePerKg]) => {
      if (pricePerKg > 0) {
        const normalizedSpec = spec.toUpperCase();
        if (description.includes(normalizedSpec) || itemSteelSpec === normalizedSpec) {
          basePrice += weightPerUnit * pricePerKg;
        }
      }
    });

    if (basePrice === 0) {
      const defaultSteelPrice = Object.values(pricingInputs.steelSpecs)[0] || 0;
      if (defaultSteelPrice > 0) {
        basePrice = weightPerUnit * defaultSteelPrice;
      }
    }

    let flangePrice = 0;
    if (rfqItem) {
      const endConfig = rfqItem.straightPipeDetails?.pipeEndConfiguration ||
                        rfqItem.bendDetails?.bendEndConfiguration ||
                        rfqItem.fittingDetails?.pipeEndConfiguration || '';

      if (endConfig && endConfig !== 'PE') {
        const flangeCount = flangeCountFromConfig(endConfig, rfqItem.itemType);
        if (isRotatingFlange(endConfig)) {
          flangePrice += (pricingInputs.flangeTypes['rotating'] || 0) * flangeCount;
        } else {
          flangePrice += (pricingInputs.flangeTypes['slipOn'] || 0) * flangeCount;
        }
      }

      if (rfqItem.fittingDetails?.addBlankFlange && rfqItem.fittingDetails.blankFlangeCount) {
        flangePrice += (pricingInputs.flangeTypes['blank'] || 0) * rfqItem.fittingDetails.blankFlangeCount;
      }
    }

    const subtotal = basePrice + flangePrice;
    const labourExtras = subtotal * (pricingInputs.labourExtrasPercent / 100);

    return subtotal + labourExtras;
  };

  const calculateWeldingSectionTotal = (): number => {
    const weldTypes = Object.entries(extractedSpecs.weldTypes)
      .filter(([, hasWeld]) => hasWeld)
      .map(([type]) => type);

    return weldTypes.reduce((sum, weldType) => {
      const quantity = weldTotals[weldType as keyof WeldTotals];
      const manualPrice = weldUnitPrices[weldType];
      const pricePerLm = pricingInputs.weldTypes[weldType] || 0;
      const labourExtras = pricePerLm * (pricingInputs.labourExtrasPercent / 100);
      const suggestedPrice = pricePerLm + labourExtras;
      const effectivePrice = (manualPrice !== undefined && manualPrice > 0) ? manualPrice : suggestedPrice;
      return sum + (quantity * effectivePrice);
    }, 0);
  };

  const sectionsSubtotal = sections.reduce((total, section) => {
    const sectionPrices = unitPrices[String(section.id)] || {};
    const sectionTotal = section.items.reduce((sum, item, idx) => {
      const manualPrice = sectionPrices[idx];
      const effectivePrice = (manualPrice !== undefined && manualPrice > 0)
        ? manualPrice
        : calculateSuggestedPriceForItem(item, section.sectionType);
      return sum + (item.qty * effectivePrice);
    }, 0);
    return total + sectionTotal;
  }, 0);

  const weldingTotal = calculateWeldingSectionTotal();
  const subtotal = sectionsSubtotal + weldingTotal;

  const contingenciesAmount = subtotal * (pricingInputs.contingenciesPercent / 100);
  const grandTotalExVat = subtotal + contingenciesAmount;
  const vatRate = vatRateForCurrency(currencyCode);
  const vatAmount = grandTotalExVat * (vatRate / 100);
  const grandTotalIncVat = grandTotalExVat + vatAmount;

  return (
    <div className="mt-8 border-t-2 border-gray-300 pt-6">
      <div className="flex flex-col items-end space-y-2">
        <div className="flex justify-between w-80 text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between w-80 text-sm">
          <span className="text-gray-600">Contingencies ({pricingInputs.contingenciesPercent}%):</span>
          <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(contingenciesAmount)}</span>
        </div>
        <div className="flex justify-between w-80 text-sm font-semibold border-t border-gray-300 pt-2 mt-2">
          <span className="text-gray-900">Grand Total (ex VAT):</span>
          <span className="text-gray-900">{currencySymbol} {formatCurrency(grandTotalExVat)}</span>
        </div>
        <div className="flex justify-between w-80 text-sm">
          <span className="text-gray-600">VAT ({vatRate}%):</span>
          <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(vatAmount)}</span>
        </div>
        <div className="flex justify-between w-80 text-lg font-bold border-t border-gray-300 pt-2 mt-2">
          <span className="text-gray-900">Total (inc VAT):</span>
          <span className="text-green-700">{currencySymbol} {formatCurrency(grandTotalIncVat)}</span>
        </div>
      </div>
    </div>
  );
}

interface WeldsSectionProps {
  weldTotals: WeldTotals;
  extractedSpecs: ExtractedSpecs;
  pricingInputs: PricingInputs;
  currencyCode: string;
  weldUnitPrices: Record<string, number>;
  onWeldUnitPriceChange: (weldType: string, value: number) => void;
}

const WELD_TYPE_LABELS: Record<string, string> = {
  flangeWeld: 'Flange Weld',
  mitreWeld: 'Mitre Weld',
  teeWeld: 'Tee Weld',
  tackWeld: 'Tack Weld (Loose Flange)',
};

function WeldsSection({
  weldTotals,
  extractedSpecs,
  pricingInputs,
  currencyCode,
  weldUnitPrices,
  onWeldUnitPriceChange,
}: WeldsSectionProps) {
  const currency = currencyByCode(currencyCode);
  const currencySymbol = currency?.symbol || currencyCode;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const weldTypes = Object.entries(extractedSpecs.weldTypes)
    .filter(([, hasWeld]) => hasWeld)
    .map(([type]) => type);

  if (weldTypes.length === 0) {
    return null;
  }

  const calculateSuggestedPrice = (weldType: string): number => {
    const pricePerLm = pricingInputs.weldTypes[weldType] || 0;
    const labourExtras = pricePerLm * (pricingInputs.labourExtrasPercent / 100);
    return pricePerLm + labourExtras;
  };

  const effectiveUnitPrice = (weldType: string): number => {
    const manualPrice = weldUnitPrices[weldType];
    if (manualPrice !== undefined && manualPrice > 0) {
      return manualPrice;
    }
    return calculateSuggestedPrice(weldType);
  };

  const totalAmount = weldTypes.reduce((sum, weldType) => {
    const quantity = weldTotals[weldType as keyof WeldTotals];
    const unitPrice = effectiveUnitPrice(weldType);
    return sum + (quantity * unitPrice);
  }, 0);

  return (
    <div className="mb-8">
      <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
        Welding
        <span className="text-sm font-normal text-gray-500">({weldTypes.length} types)</span>
      </h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weld Type</th>
              <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total (Lm)</th>
              <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="w-32 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Unit Price ({currencySymbol})
              </th>
              <th className="w-32 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Line Total ({currencySymbol})
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {weldTypes.map((weldType, idx) => {
              const quantity = weldTotals[weldType as keyof WeldTotals];
              const suggestedPrice = calculateSuggestedPrice(weldType);
              const manualPrice = weldUnitPrices[weldType];
              const currentUnitPrice = effectiveUnitPrice(weldType);
              const lineTotalValue = quantity * currentUnitPrice;
              const isAutoCalculated = (manualPrice === undefined || manualPrice === 0) && suggestedPrice > 0;

              return (
                <tr key={weldType}>
                  <td className="w-12 px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{WELD_TYPE_LABELS[weldType] || weldType}</td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">{quantity.toFixed(3)}</td>
                  <td className="w-16 px-3 py-2 text-sm text-gray-500">Lm</td>
                  <td className="w-32 px-2 py-1">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualPrice || ''}
                        onChange={(e) => onWeldUnitPriceChange(weldType, parseFloat(e.target.value) || 0)}
                        placeholder={suggestedPrice > 0 ? suggestedPrice.toFixed(2) : '0.00'}
                        className={`w-full px-2 py-1 text-sm text-right border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isAutoCalculated ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                      />
                    </div>
                    {isAutoCalculated && (
                      <div className="text-xs text-green-600 text-right mt-0.5">Auto</div>
                    )}
                  </td>
                  <td className="w-32 px-3 py-2 text-sm text-gray-900 text-right font-medium">
                    {currencySymbol} {formatCurrency(lineTotalValue)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-medium">
              <td className="px-3 py-2 text-sm text-gray-900" colSpan={2}>
                TOTAL
              </td>
              <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                {(weldTotals.flangeWeld + weldTotals.mitreWeld + weldTotals.teeWeld + weldTotals.tackWeld).toFixed(3)}
              </td>
              <td className="w-16 px-3 py-2 text-sm text-gray-500">Lm</td>
              <td className="w-32 px-3 py-2 text-sm text-gray-500"></td>
              <td className="w-32 px-3 py-2 text-sm text-green-700 text-right font-semibold">
                {currencySymbol} {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SectionTableProps {
  section: BoqSection;
  currencyCode: string;
  unitPrices: Record<number, number>;
  onUnitPriceChange: (itemIndex: number, value: number) => void;
  pricingInputs: PricingInputs;
  rfqItems: RfqItemDetail[];
}

function SectionTable({ section, currencyCode, unitPrices, onUnitPriceChange, pricingInputs, rfqItems }: SectionTableProps) {
  const hasWelds = section.items.some(
    (item) =>
      item.welds?.flangeWeld || item.welds?.mitreWeld || item.welds?.teeWeld
  );
  const hasAreas = section.items.some((item) => item.areas?.intAreaM2 || item.areas?.extAreaM2);

  const currency = currencyByCode(currencyCode);
  const currencySymbol = currency?.symbol || currencyCode;

  const isFabricatedSection = ['straight_pipes', 'bends', 'fittings', 'tees'].includes(section.sectionType);
  const isFlangesSection = section.sectionType === 'flanges' || section.sectionType === 'blank_flanges';
  const isBlankFlangesSection = section.sectionType === 'blank_flanges';
  const isBnwSection = section.sectionType === 'bnw_sets';

  const effectiveItemWeight = (item: ConsolidatedItem): number => {
    if (isFlangesSection) {
      return recalculateFlangeWeight(item.description, item.qty, isBlankFlangesSection);
    }
    return Number(item.weightKg || 0);
  };

  const calculateSuggestedPrice = (item: ConsolidatedItem): number => {
    const description = item.description.toUpperCase();
    const itemWeight = effectiveItemWeight(item);
    const weightPerUnit = item.qty > 0 ? (itemWeight / item.qty) : 0;

    if (isBnwSection) {
      const totalBnwWeight = weightPerUnit;
      const boltWeight = totalBnwWeight * 0.55;
      const nutWeight = totalBnwWeight * 0.30;
      const washerWeight = totalBnwWeight * 0.15;

      const boltPrice = (pricingInputs.bnwTypes['bolts'] || 0) * boltWeight;
      const nutPrice = (pricingInputs.bnwTypes['nuts'] || 0) * nutWeight;
      const washerPrice = (pricingInputs.bnwTypes['washers'] || 0) * washerWeight;

      return boltPrice + nutPrice + washerPrice;
    }

    if (isFlangesSection) {
      let flangePrice = 0;
      if (isBlankFlangesSection || description.includes('BLANK')) {
        flangePrice = (pricingInputs.flangeTypes['blank'] || 0) * weightPerUnit;
      } else if (description.includes('ROTATING') || description.includes('R/F')) {
        flangePrice = (pricingInputs.flangeTypes['rotating'] || 0) * weightPerUnit;
      } else {
        flangePrice = (pricingInputs.flangeTypes['slipOn'] || 0) * weightPerUnit;
      }
      const labourExtras = flangePrice * (pricingInputs.labourExtrasPercent / 100);
      return flangePrice + labourExtras;
    }

    if (!isFabricatedSection) return 0;

    let basePrice = 0;

    const rfqItem = item.entries.length > 0
      ? rfqItems.find(ri => ri.lineNumber === item.entries[0] || ri.id === item.entries[0])
      : null;

    const itemSteelSpec = rfqItem
      ? normalizeSteelSpec(
          rfqItem.straightPipeDetails?.pipeStandard ||
          rfqItem.bendDetails?.pipeStandard ||
          rfqItem.fittingDetails?.fittingStandard ||
          ''
        )
      : '';

    Object.entries(pricingInputs.steelSpecs).forEach(([spec, pricePerKg]) => {
      if (pricePerKg > 0) {
        const normalizedSpec = spec.toUpperCase();
        if (description.includes(normalizedSpec) || itemSteelSpec === normalizedSpec) {
          basePrice += weightPerUnit * pricePerKg;
        }
      }
    });

    if (basePrice === 0) {
      const defaultSteelPrice = Object.values(pricingInputs.steelSpecs)[0] || 0;
      if (defaultSteelPrice > 0) {
        basePrice = weightPerUnit * defaultSteelPrice;
      }
    }

    let flangePrice = 0;
    if (rfqItem) {
      const endConfig = rfqItem.straightPipeDetails?.pipeEndConfiguration ||
                        rfqItem.bendDetails?.bendEndConfiguration ||
                        rfqItem.fittingDetails?.pipeEndConfiguration || '';

      if (endConfig && endConfig !== 'PE') {
        const flangeCount = flangeCountFromConfig(endConfig, rfqItem.itemType);
        if (isRotatingFlange(endConfig)) {
          flangePrice += (pricingInputs.flangeTypes['rotating'] || 0) * flangeCount;
        } else {
          flangePrice += (pricingInputs.flangeTypes['slipOn'] || 0) * flangeCount;
        }
      }

      if (rfqItem.fittingDetails?.addBlankFlange && rfqItem.fittingDetails.blankFlangeCount) {
        flangePrice += (pricingInputs.flangeTypes['blank'] || 0) * rfqItem.fittingDetails.blankFlangeCount;
      }
    }

    const subtotal = basePrice + flangePrice;
    const labourExtras = subtotal * (pricingInputs.labourExtrasPercent / 100);

    return subtotal + labourExtras;
  };

  const effectiveUnitPrice = (itemIndex: number, item: ConsolidatedItem): number => {
    const manualPrice = unitPrices[itemIndex];
    if (manualPrice !== undefined && manualPrice > 0) {
      return manualPrice;
    }
    return calculateSuggestedPrice(item);
  };

  const lineTotal = (itemIndex: number, item: ConsolidatedItem): number => {
    const unitPrice = effectiveUnitPrice(itemIndex, item);
    return item.qty * unitPrice;
  };

  const totalLineAmount = section.items.reduce(
    (sum, item, idx) => sum + lineTotal(idx, item),
    0
  );

  const totals = {
    flangeWeld: section.items.reduce((sum, item) => sum + (item.welds?.flangeWeld || 0), 0),
    mitreWeld: section.items.reduce((sum, item) => sum + (item.welds?.mitreWeld || 0), 0),
    teeWeld: section.items.reduce((sum, item) => sum + (item.welds?.teeWeld || 0), 0),
    intArea: section.items.reduce((sum, item) => sum + (item.areas?.intAreaM2 || 0), 0),
    extArea: section.items.reduce((sum, item) => sum + (item.areas?.extAreaM2 || 0), 0),
    weight: isFlangesSection
      ? section.items.reduce((sum, item) => sum + effectiveItemWeight(item), 0)
      : Number(section.totalWeightKg) || 0,
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
        {section.sectionTitle}
        <span className="text-sm font-normal text-gray-500">({section.itemCount} items)</span>
      </h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="w-16 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="w-32 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Unit Price ({currencySymbol})
              </th>
              <th className="w-32 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Line Total ({currencySymbol})
              </th>
              {hasWelds && (
                <>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Flange Weld (m)</th>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Mitre Weld (m)</th>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tee Weld (m)</th>
                </>
              )}
              {hasAreas && (
                <>
                  <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Int m²</th>
                  <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ext m²</th>
                </>
              )}
              <th className="w-28 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {section.items.map((item, idx) => {
              const manualPrice = unitPrices[idx];
              const suggestedPrice = calculateSuggestedPrice(item);
              const currentUnitPrice = effectiveUnitPrice(idx, item);
              const lineTotalValue = lineTotal(idx, item);
              const isAutoCalculated = (manualPrice === undefined || manualPrice === 0) && suggestedPrice > 0;
              const totalWeldLm = (item.welds?.flangeWeld || 0) +
                                  (item.welds?.mitreWeld || 0) + (item.welds?.teeWeld || 0);

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td className="w-12 px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.description}</td>
                    <td className="w-16 px-3 py-2 text-sm text-gray-900 text-right">{item.qty}</td>
                    <td className="w-16 px-3 py-2 text-sm text-gray-500">{item.unit}</td>
                    <td className="w-32 px-2 py-1">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualPrice || ''}
                          onChange={(e) => onUnitPriceChange(idx, parseFloat(e.target.value) || 0)}
                          placeholder={suggestedPrice > 0 ? suggestedPrice.toFixed(2) : '0.00'}
                          className={`w-full px-2 py-1 text-sm text-right border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isAutoCalculated ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                        />
                      </div>
                      {isAutoCalculated && (
                        <div className="text-xs text-green-600 text-right mt-0.5">Auto</div>
                      )}
                    </td>
                    <td className="w-32 px-3 py-2 text-sm text-gray-900 text-right font-medium">
                      {currencySymbol} {formatCurrency(lineTotalValue)}
                    </td>
                    {hasWelds && (
                      <>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.flangeWeld ? Number(item.welds.flangeWeld).toFixed(3) : '-'}
                        </td>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.mitreWeld ? Number(item.welds.mitreWeld).toFixed(3) : '-'}
                        </td>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.teeWeld ? Number(item.welds.teeWeld).toFixed(3) : '-'}
                        </td>
                      </>
                    )}
                    {hasAreas && (
                      <>
                        <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : '-'}
                        </td>
                        <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : '-'}
                        </td>
                      </>
                    )}
                    <td className="w-28 px-3 py-2 text-sm text-gray-900 text-right font-medium">
                      {effectiveItemWeight(item).toFixed(2)}
                    </td>
                  </tr>
                  {isFabricatedSection && totalWeldLm > 0 && (
                    <tr className="bg-blue-50 border-b border-blue-100">
                      <td className="w-12"></td>
                      <td className="px-3 py-1 text-xs text-blue-700" colSpan={hasWelds ? 9 : hasAreas ? 7 : 5}>
                        <span className="font-medium">Total Weld Length:</span> {totalWeldLm.toFixed(3)} Lm
                      </td>
                      <td className="w-28"></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* Totals row */}
            <tr className="bg-gray-100 font-medium">
              <td className="px-3 py-2 text-sm text-gray-900" colSpan={2}>
                TOTAL
              </td>
              <td className="w-16 px-3 py-2 text-sm text-gray-900 text-right">
                {section.items.reduce((sum, item) => sum + (item.qty || 0), 0)}
              </td>
              <td className="w-16 px-3 py-2 text-sm text-gray-500"></td>
              <td className="w-32 px-3 py-2 text-sm text-gray-500"></td>
              <td className="w-32 px-3 py-2 text-sm text-green-700 text-right font-semibold">
                {currencySymbol} {formatCurrency(totalLineAmount)}
              </td>
              {hasWelds && (
                <>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.flangeWeld || 0).toFixed(3)}</td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.mitreWeld || 0).toFixed(3)}</td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.teeWeld || 0).toFixed(3)}</td>
                </>
              )}
              {hasAreas && (
                <>
                  <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.intArea || 0).toFixed(2)}</td>
                  <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.extArea || 0).toFixed(2)}</td>
                </>
              )}
              <td className="w-28 px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.weight || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RfqSectionTable({ section }: { section: BoqSection }) {
  const hasAreas = section.items.some((item) => item.areas?.intAreaM2 || item.areas?.extAreaM2);

  // Calculate section totals
  const sectionTotals = section.items.reduce(
    (acc, item) => ({
      qty: acc.qty + (item.qty || 0),
      weight: acc.weight + Number(item.weightKg || 0),
      extArea: acc.extArea + Number(item.areas?.extAreaM2 || 0),
      intArea: acc.intArea + Number(item.areas?.intAreaM2 || 0),
    }),
    { qty: 0, weight: 0, extArea: 0, intArea: 0 }
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-2">
        <h3 className="text-white font-semibold text-sm">
          {section.sectionTitle}
          <span className="ml-2 text-blue-200 font-normal">({section.itemCount} items)</span>
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-50 border-b border-blue-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-blue-800 w-24">Item #</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-blue-800">Description</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">Weld WT</th>
              {hasAreas && (
                <>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">Ext m²</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">Int m²</th>
                </>
              )}
              <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-16">Qty</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-blue-800 w-28">Weight/Item</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-blue-800 w-28">Line Weight</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, idx) => {
              const itemNumber = `${section.sectionType.substring(0, 3).toUpperCase()}-${String(idx + 1).padStart(3, '0')}`;
              const weightPerItem = item.qty > 0 ? Number(item.weightKg || 0) / item.qty : 0;
              const lineWeight = Number(item.weightKg || 0);

              // Extract wall thickness from description if available
              const wtMatch = item.description.match(/W\/T\s*(\d+(?:\.\d+)?)\s*mm|(\d+(?:\.\d+)?)\s*mm\s*W\/T|Sch\w*\s*\((\d+(?:\.\d+)?)mm\)/i);
              const weldWt = wtMatch ? (wtMatch[1] || wtMatch[2] || wtMatch[3]) : null;

              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 text-xs text-blue-600 font-medium">{itemNumber}</td>
                  <td className="py-2 px-3 text-xs text-gray-700">{item.description}</td>
                  <td className="py-2 px-3 text-xs text-gray-600 text-center">
                    {weldWt ? `${weldWt}mm` : '-'}
                  </td>
                  {hasAreas && (
                    <>
                      <td className="py-2 px-3 text-xs text-gray-600 text-center">
                        {item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 text-center">
                        {item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : '-'}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-3 text-xs text-gray-900 text-center font-medium">{item.qty}</td>
                  <td className="py-2 px-3 text-xs text-gray-600 text-right">
                    {weightPerItem.toFixed(2)} kg
                  </td>
                  <td className="py-2 px-3 text-xs text-green-700 text-right font-semibold">
                    {lineWeight.toFixed(2)} kg
                  </td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-blue-100 border-t-2 border-blue-300 font-semibold">
              <td className="py-2 px-3 text-xs text-blue-800" colSpan={2}>TOTAL</td>
              <td className="py-2 px-3 text-xs text-blue-800 text-center">-</td>
              {hasAreas && (
                <>
                  <td className="py-2 px-3 text-xs text-blue-800 text-center">
                    {sectionTotals.extArea > 0 ? sectionTotals.extArea.toFixed(2) : '-'}
                  </td>
                  <td className="py-2 px-3 text-xs text-blue-800 text-center">
                    {sectionTotals.intArea > 0 ? sectionTotals.intArea.toFixed(2) : '-'}
                  </td>
                </>
              )}
              <td className="py-2 px-3 text-xs text-blue-800 text-center">{sectionTotals.qty}</td>
              <td className="py-2 px-3 text-xs text-blue-800 text-right">-</td>
              <td className="py-2 px-3 text-xs text-green-700 text-right">{sectionTotals.weight.toFixed(2)} kg</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RfqItemsDetailedViewProps {
  items: RfqItemDetail[];
  sections?: BoqSection[];
  currencyCode: string;
  pricingInputs: PricingInputs;
  unitPrices: Record<string, Record<number, number>>;
}

function RfqItemsDetailedView({ items, sections, currencyCode, pricingInputs, unitPrices }: RfqItemsDetailedViewProps) {
  const currency = currencyByCode(currencyCode);
  const currencySymbol = currency?.symbol || currencyCode;
  const totalWeight = items.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0);

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const accessorySectionOrder = ['bnw_sets', 'gaskets'];
  const accessorySections = sections?.filter(s =>
    accessorySectionOrder.includes(s.sectionType)
  ).sort((a, b) => accessorySectionOrder.indexOf(a.sectionType) - accessorySectionOrder.indexOf(b.sectionType)) || [];

  const accessoryWeight = accessorySections.reduce((sum, s) => sum + Number(s.totalWeightKg || 0), 0);

  const itemTypeColors: Record<string, { bg: string; badge: string; badgeText: string }> = {
    straight_pipe: { bg: 'bg-blue-50', badge: 'bg-blue-200', badgeText: 'text-blue-800' },
    bend: { bg: 'bg-purple-50', badge: 'bg-purple-200', badgeText: 'text-purple-800' },
    fitting: { bg: 'bg-green-50', badge: 'bg-green-200', badgeText: 'text-green-800' },
  };

  const formatItemType = (type: string) => {
    const labels: Record<string, string> = {
      straight_pipe: 'Pipe',
      bend: 'Bend',
      fitting: 'Fitting',
    };
    return labels[type] || type;
  };

  const formatScheduleDisplay = (scheduleNumber?: string, wallThicknessMm?: number): string => {
    if (!scheduleNumber && !wallThicknessMm) return '-';
    if (scheduleNumber?.startsWith('WT') || scheduleNumber?.includes('719')) {
      const wt = Number(wallThicknessMm) || parseFloat(scheduleNumber.replace(/[^0-9.]/g, ''));
      return wt && !isNaN(wt) ? `${wt.toFixed(2)}mm W/T` : (scheduleNumber || '-');
    }
    return scheduleNumber || (wallThicknessMm ? `${Number(wallThicknessMm).toFixed(2)}mm W/T` : '-');
  };

  const roundToNearestWeldThickness = (wt: number): number => {
    return Math.round(wt / 1.5) * 1.5;
  };

  interface WeldBreakdown {
    flangeWeldMeters: number;
    buttWeldMeters: number;
    mitreWeldMeters: number;
    teeWeldMeters: number;
    tackWeldMeters: number;
    totalLinearMeters: number;
    wallThicknessMm: number;
  }

  const calculateWeldLinearMeterage = (item: RfqItemDetail): WeldBreakdown | null => {
    const TACK_WELD_LENGTH_MM = 20;
    const TACK_WELDS_PER_LOOSE_FLANGE = 8;

    const getLooseFlangeCount = (endConfig: string): number => {
      if (endConfig === '2xLF') return 2;
      if (endConfig === 'FOE_LF' || endConfig === 'F2E_LF') return 1;
      return 0;
    };

    if (item.straightPipeDetails) {
      const details = item.straightPipeDetails;
      const endConfig = details.pipeEndConfiguration || 'PE';
      const wt = Number(details.wallThicknessMm) || 6;
      const nb = Number(details.nominalBoreMm) || 0;
      const od = NB_TO_OD_LOOKUP[nb] || (nb * 1.05);
      const circumferenceMm = Math.PI * od;

      let flangeWeldMeters = 0;
      if (details.totalFlangeWeldLengthM) {
        flangeWeldMeters = Number(details.totalFlangeWeldLengthM);
      } else if (details.numberOfFlangeWelds) {
        flangeWeldMeters = Number(details.numberOfFlangeWelds) * 2 * circumferenceMm / 1000;
      } else if (endConfig && endConfig !== 'PE') {
        const flangeConnections = weldCountPerPipe(endConfig);
        flangeWeldMeters = flangeConnections * 2 * circumferenceMm / 1000;
      }

      let buttWeldMeters = 0;
      if (details.totalButtWeldLengthM) {
        buttWeldMeters = Number(details.totalButtWeldLengthM);
      } else if (details.numberOfButtWelds) {
        buttWeldMeters = Number(details.numberOfButtWelds) * circumferenceMm / 1000;
      }

      const looseFlangeCount = getLooseFlangeCount(endConfig);
      const tackWeldMeters = looseFlangeCount * TACK_WELDS_PER_LOOSE_FLANGE * TACK_WELD_LENGTH_MM / 1000;

      const totalLinearMeters = flangeWeldMeters + buttWeldMeters + tackWeldMeters;
      if (totalLinearMeters === 0 || isNaN(totalLinearMeters)) return null;

      return {
        flangeWeldMeters,
        buttWeldMeters,
        mitreWeldMeters: 0,
        teeWeldMeters: 0,
        tackWeldMeters,
        totalLinearMeters,
        wallThicknessMm: wt
      };
    }

    if (item.bendDetails) {
      const details = item.bendDetails;
      const endConfig = details.bendEndConfiguration || 'PE';
      const wt = Number(details.wallThicknessMm) || 6;
      const nb = Number(details.nominalBoreMm) || 0;
      const od = NB_TO_OD_LOOKUP[nb] || (nb * 1.05);
      const circumferenceMm = Math.PI * od;
      const calcData = details.calculationData;

      let flangeWeldMeters = 0;
      if (details.totalFlangeWeldLengthM) {
        flangeWeldMeters = Number(details.totalFlangeWeldLengthM);
      } else if (details.numberOfFlangeWelds) {
        flangeWeldMeters = Number(details.numberOfFlangeWelds) * 2 * circumferenceMm / 1000;
      } else if (endConfig && endConfig !== 'PE') {
        const flangeConnections = weldCountPerBend(endConfig);
        flangeWeldMeters = flangeConnections * 2 * circumferenceMm / 1000;
      }

      let buttWeldMeters = 0;
      if (details.totalButtWeldLengthM) {
        buttWeldMeters = Number(details.totalButtWeldLengthM);
      } else if (details.numberOfButtWelds) {
        buttWeldMeters = Number(details.numberOfButtWelds) * circumferenceMm / 1000;
      } else if (calcData?.numberOfButtWelds) {
        buttWeldMeters = Number(calcData.numberOfButtWelds) * circumferenceMm / 1000;
      } else if (calcData?.tangentButtWelds) {
        buttWeldMeters = Number(calcData.tangentButtWelds) * circumferenceMm / 1000;
      } else if (details.numberOfTangents && details.numberOfTangents > 0) {
        buttWeldMeters = Number(details.numberOfTangents) * circumferenceMm / 1000;
      }

      let mitreWeldMeters = 0;
      if (calcData?.mitreWeldLengthM) {
        mitreWeldMeters = Number(calcData.mitreWeldLengthM);
      } else if (calcData?.numberOfMitreWelds) {
        mitreWeldMeters = Number(calcData.numberOfMitreWelds) * circumferenceMm / 1000;
      } else if (calcData?.numberOfSegments && Number(calcData.numberOfSegments) > 1) {
        mitreWeldMeters = (Number(calcData.numberOfSegments) - 1) * circumferenceMm / 1000;
      }

      let teeWeldMeters = 0;
      const stubs = calcData?.stubs || [];
      if (Array.isArray(stubs) && stubs.length > 0) {
        stubs.forEach((stub: { nominalBoreMm?: number }) => {
          const stubNb = Number(stub.nominalBoreMm) || nb;
          const stubOd = NB_TO_OD_LOOKUP[stubNb] || (stubNb * 1.05);
          const stubCirc = Math.PI * stubOd;
          teeWeldMeters += stubCirc / 1000;
        });
      } else if (calcData?.numberOfStubs && Number(calcData.numberOfStubs) > 0) {
        const stubNb = Number(calcData.stubNominalBoreMm) || nb;
        const stubOd = NB_TO_OD_LOOKUP[stubNb] || (stubNb * 1.05);
        const stubCirc = Math.PI * stubOd;
        teeWeldMeters = Number(calcData.numberOfStubs) * stubCirc / 1000;
      }

      if (stubs.length > 0) {
        stubs.forEach((stub: { flangeSpec?: string; nominalBoreMm?: number }) => {
          if (stub.flangeSpec && stub.flangeSpec !== 'PE' && stub.flangeSpec !== '') {
            const stubNb = Number(stub.nominalBoreMm) || nb;
            const stubOd = NB_TO_OD_LOOKUP[stubNb] || (stubNb * 1.05);
            const stubCirc = Math.PI * stubOd;
            flangeWeldMeters += 2 * stubCirc / 1000;
          }
        });
      }

      const looseFlangeCount = getLooseFlangeCount(endConfig);
      const tackWeldMeters = looseFlangeCount * TACK_WELDS_PER_LOOSE_FLANGE * TACK_WELD_LENGTH_MM / 1000;

      const totalLinearMeters = flangeWeldMeters + buttWeldMeters + mitreWeldMeters + teeWeldMeters + tackWeldMeters;
      if (totalLinearMeters === 0 || isNaN(totalLinearMeters)) return null;

      return {
        flangeWeldMeters,
        buttWeldMeters,
        mitreWeldMeters,
        teeWeldMeters,
        tackWeldMeters,
        totalLinearMeters,
        wallThicknessMm: wt
      };
    }

    if (item.fittingDetails) {
      const details = item.fittingDetails;
      const endConfig = details.pipeEndConfiguration || 'PE';
      const wt = Number(details.wallThicknessMm) || 6;
      const mainNb = Number(details.nominalDiameterMm) || 0;
      const branchNb = Number(details.branchNominalDiameterMm) || mainNb;
      const mainOd = NB_TO_OD_LOOKUP[mainNb] || (mainNb * 1.05);
      const branchOd = NB_TO_OD_LOOKUP[branchNb] || (branchNb * 1.05);
      const mainCirc = Math.PI * mainOd;
      const branchCirc = Math.PI * branchOd;

      let flangeWeldMeters = 0;
      const flangeConnections = weldCountPerFitting(endConfig);
      if (details.numberOfFlangeWelds || (endConfig && endConfig !== 'PE')) {
        if (flangeConnections >= 3) {
          flangeWeldMeters = (2 * mainCirc * 2 + branchCirc * 2) / 1000;
        } else if (flangeConnections === 2) {
          flangeWeldMeters = (2 * mainCirc * 2) / 1000;
        } else if (flangeConnections === 1) {
          flangeWeldMeters = (mainCirc * 2) / 1000;
        }
      }

      let teeWeldMeters = 0;
      if (details.numberOfTeeWelds) {
        teeWeldMeters = Number(details.numberOfTeeWelds) * branchCirc / 1000;
      } else {
        const calcData = details.calculationData;
        if (calcData?.teeWeldLengthM) {
          teeWeldMeters = Number(calcData.teeWeldLengthM);
        }
      }

      const looseFlangeCount = getLooseFlangeCount(endConfig);
      const tackWeldMeters = looseFlangeCount * TACK_WELDS_PER_LOOSE_FLANGE * TACK_WELD_LENGTH_MM / 1000;

      const totalLinearMeters = flangeWeldMeters + teeWeldMeters + tackWeldMeters;
      if (totalLinearMeters === 0 || isNaN(totalLinearMeters)) return null;

      return {
        flangeWeldMeters,
        buttWeldMeters: 0,
        mitreWeldMeters: 0,
        teeWeldMeters,
        tackWeldMeters,
        totalLinearMeters,
        wallThicknessMm: wt
      };
    }

    return null;
  };

  const calculateFlangeWeight = (nb: number, config: string | undefined, itemType: string, qty: number, pressureClass?: string, flangeStandard?: string): number => {
    const flangeCount = flangeCountFromConfig(config, itemType);
    if (flangeCount === 0) return 0;
    const singleFlangeWt = flangeWeight(nb, pressureClass || 'PN16', flangeStandard);
    return flangeCount * singleFlangeWt * qty;
  };

  const calculateItemUnitPrice = (item: RfqItemDetail): number => {
    const weightPerUnit = Number(item.weightPerUnitKg || 0);

    const itemSteelSpec = item.straightPipeDetails?.pipeStandard ||
      item.bendDetails?.pipeStandard ||
      item.fittingDetails?.fittingStandard || '';
    const normalizedSpec = normalizeSteelSpec(itemSteelSpec);
    const steelPricePerKg = pricingInputs.steelSpecs[normalizedSpec] ||
      Object.values(pricingInputs.steelSpecs)[0] || 0;

    let steelPrice = weightPerUnit * steelPricePerKg;
    let flangePrice = 0;
    let weldPrice = 0;

    const details = item.straightPipeDetails || item.bendDetails || item.fittingDetails;
    if (details) {
      const endConfig =
        (item.straightPipeDetails?.pipeEndConfiguration) ||
        (item.bendDetails?.bendEndConfiguration) ||
        (item.fittingDetails?.pipeEndConfiguration);

      if (endConfig && endConfig !== 'PE') {
        const nb = item.straightPipeDetails?.nominalBoreMm ||
          item.bendDetails?.nominalBoreMm ||
          item.fittingDetails?.nominalDiameterMm || 0;
        const flangeCount = flangeCountFromConfig(endConfig, item.itemType);
        const flangeStandard = item.flangeStandardCode || 'SANS 1123';
        const pressureClass = item.flangePressureClassDesignation || '1000/3';
        const flangeWeightPerUnit = flangeCount * flangeWeight(nb, pressureClass, flangeStandard);

        if (isRotatingFlange(endConfig)) {
          flangePrice = flangeWeightPerUnit * (pricingInputs.flangeTypes['rotating'] || 0);
        } else {
          flangePrice = flangeWeightPerUnit * (pricingInputs.flangeTypes['slipOn'] || 0);
        }
      }

      if (item.fittingDetails?.addBlankFlange && item.fittingDetails.blankFlangeCount) {
        const blankNb = item.fittingDetails.nominalDiameterMm || 0;
        const flangeStandard = item.flangeStandardCode || 'SANS 1123';
        const pressureClass = item.flangePressureClassDesignation || '1000/3';
        const isSans = flangeStandard.toUpperCase().includes('SANS');
        const singleBlankWt = isSans
          ? sansBlankFlangeWeight(blankNb, pressureClass)
          : blankFlangeWeight(blankNb, pressureClass);
        const blankWt = singleBlankWt * item.fittingDetails.blankFlangeCount;
        flangePrice += blankWt * (pricingInputs.flangeTypes['blank'] || 0);
      }

      const weldInfo = calculateWeldLinearMeterage(item);
      if (weldInfo) {
        const flangeWeldRate = pricingInputs.weldTypes['flangeWeld'] || 0;
        const mitreWeldRate = pricingInputs.weldTypes['mitreWeld'] || 0;
        const teeWeldRate = pricingInputs.weldTypes['teeWeld'] || 0;
        const tackWeldRate = pricingInputs.weldTypes['tackWeld'] || 0;
        const weldRate = flangeWeldRate || mitreWeldRate || teeWeldRate || tackWeldRate;
        weldPrice = Number(weldInfo.totalLinearMeters) * weldRate;
      }
    }

    const subtotal = steelPrice + flangePrice + weldPrice;
    const labourExtras = subtotal * (pricingInputs.labourExtrasPercent / 100);

    return subtotal + labourExtras;
  };

  const calculateItemLineTotal = (item: RfqItemDetail): number => {
    const unitPrice = calculateItemUnitPrice(item);
    const qty = item.quantity || 1;
    return unitPrice * qty;
  };

  const itemsSubtotal = items.reduce((sum, item) => sum + calculateItemLineTotal(item), 0);

  return (
    <div className="space-y-6">
      {/* Items List */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const colors = itemTypeColors[item.itemType] || itemTypeColors.straight_pipe;
          const details = item.straightPipeDetails || item.bendDetails || item.fittingDetails;
          const unitPrice = calculateItemUnitPrice(item);
          const lineTotal = calculateItemLineTotal(item);
          const qty = item.quantity || 1;

          return (
            <div key={item.id} className={`border border-gray-200 rounded-lg p-3 ${colors.bg}`}>
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${colors.badge} ${colors.badgeText}`}>
                    {formatItemType(item.itemType)}
                  </span>
                  <h4 className="font-medium text-gray-800 text-sm">Item #{item.lineNumber || index + 1}</h4>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-700">
                    {Number(item.totalWeightKg || 0).toFixed(2)} kg
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-700 mb-2 font-medium">{item.description}</p>

              {/* Item Details Grid - Consistent format for all item types */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-x-3 gap-y-1 text-xs">
                {item.straightPipeDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{' '}
                      <span className="font-medium">{Math.round(Number(item.straightPipeDetails.nominalBoreMm))}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wall Thickness:</span>{' '}
                      <span className="font-medium">
                        {formatScheduleDisplay(item.straightPipeDetails.scheduleNumber, item.straightPipeDetails.wallThicknessMm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Length:</span>{' '}
                      <span className="font-medium">
                        {item.straightPipeDetails.individualPipeLength
                          ? Number(item.straightPipeDetails.individualPipeLength).toFixed(3)
                          : item.straightPipeDetails.totalLength
                            ? Number(item.straightPipeDetails.totalLength).toFixed(3)
                            : '-'}m
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || item.straightPipeDetails.quantityValue || 1}</span>
                    </div>
                    {item.straightPipeDetails.pipeEndConfiguration && item.straightPipeDetails.pipeEndConfiguration !== 'PE' && (
                      <div>
                        <span className="text-gray-500">End Config:</span>{' '}
                        <span className="font-medium text-blue-600">{item.straightPipeDetails.pipeEndConfiguration}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{' '}
                      <span className="font-medium">{Number(item.weightPerUnitKg || 0).toFixed(2)} kg</span>
                    </div>
                    {item.straightPipeDetails.pipeEndConfiguration && item.straightPipeDetails.pipeEndConfiguration !== 'PE' && (() => {
                      const nb = Math.round(Number(item.straightPipeDetails.nominalBoreMm));
                      const qty = item.quantity || item.straightPipeDetails.quantityValue || 1;
                      const flangeCount = flangeCountFromConfig(item.straightPipeDetails.pipeEndConfiguration, 'straight_pipe');
                      const totalFlanges = flangeCount * qty;
                      const flangeStandard = item.flangeStandardCode || 'SANS 1123';
                      const pressureClass = item.flangePressureClassDesignation || '1000/3';
                      const singleFlangeWt = flangeWeight(nb, pressureClass, flangeStandard);
                      const totalFlangeWt = singleFlangeWt * totalFlanges;
                      return totalFlanges > 0 ? (
                        <div className="col-span-2">
                          <span className="text-gray-500">Flanges:</span>{' '}
                          <span className="font-medium">
                            {totalFlanges}x {nb}NB {flangeStandard} {pressureClass} = {totalFlangeWt.toFixed(2)} kg
                          </span>
                          <span className="text-gray-500 text-xs ml-2">({singleFlangeWt.toFixed(2)} kg each)</span>
                        </div>
                      ) : null;
                    })()}
                    {(() => {
                      const weldInfo = calculateWeldLinearMeterage(item);
                      if (!weldInfo) return null;
                      const parts = [];
                      if (Number(weldInfo.flangeWeldMeters) > 0) parts.push(`Flange: ${Number(weldInfo.flangeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.buttWeldMeters) > 0) parts.push(`Butt: ${Number(weldInfo.buttWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.tackWeldMeters) > 0) parts.push(`Tack: ${Number(weldInfo.tackWeldMeters).toFixed(2)}m`);
                      return (
                        <div className="col-span-2">
                          <span className="text-gray-500">Weld L/m:</span>{' '}
                          <span className="font-medium text-purple-600">
                            {parts.join(' + ')} = {Number(weldInfo.totalLinearMeters).toFixed(2)}m ({roundToNearestWeldThickness(Number(weldInfo.wallThicknessMm)).toFixed(1)}mm WT)
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {item.bendDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{' '}
                      <span className="font-medium">{Math.round(Number(item.bendDetails.nominalBoreMm))}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wall Thickness:</span>{' '}
                      <span className="font-medium">
                        {formatScheduleDisplay(item.bendDetails.scheduleNumber, item.bendDetails.wallThicknessMm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Angle:</span>{' '}
                      <span className="font-medium">{item.bendDetails.bendDegrees}°</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="font-medium">
                        {item.bendDetails.bendRadiusType
                          ? `${item.bendDetails.bendRadiusType.charAt(0).toUpperCase() + item.bendDetails.bendRadiusType.slice(1)} Radius`
                          : item.bendDetails.bendType || '1.5D'}
                      </span>
                    </div>
                    {(() => {
                      const nb = Number(item.bendDetails.nominalBoreMm) || 0;
                      const isSABS719 = !!item.bendDetails.bendRadiusType;
                      const bendType = item.bendDetails.bendType || '1.5D';
                      const radiusFactor = isSABS719 ? 0 : (parseFloat(bendType.replace('D', '')) || 1.5);
                      const bendRadiusMm = isSABS719 ? Number(item.bendDetails.centerToFaceMm) || 0 : nb * radiusFactor;
                      const bendAngleRad = ((Number(item.bendDetails.bendDegrees) || 90) * Math.PI) / 180;
                      const arcLengthMm = bendRadiusMm * bendAngleRad;
                      const calcData = item.bendDetails.calculationData;
                      const storedTangents = calcData?.tangentLengths || [];
                      const numberOfTangents = item.bendDetails.numberOfTangents || storedTangents.length || 0;
                      const numberOfSegments = calcData?.numberOfSegments || 0;
                      const centerToFace = Number(item.bendDetails.centerToFaceMm) || 0;
                      const actualTangents = storedTangents.map((t: number) => Math.max(0, t - centerToFace));
                      return (
                        <>
                          <div>
                            <span className="text-gray-500">Bend Radius:</span>{' '}
                            <span className="font-medium text-indigo-600">{bendRadiusMm.toFixed(0)}mm</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Arc Length:</span>{' '}
                            <span className="font-medium text-indigo-600">{arcLengthMm.toFixed(0)}mm</span>
                          </div>
                          {numberOfTangents > 0 && (
                            <div>
                              <span className="text-gray-500">Tangents:</span>{' '}
                              <span className="font-medium text-blue-600">
                                {numberOfTangents}x ({actualTangents.length > 0 ? actualTangents.map((t: number) => `${Math.round(t)}mm`).join(', ') : 'N/A'})
                              </span>
                            </div>
                          )}
                          {numberOfSegments > 1 && (
                            <div>
                              <span className="text-gray-500">Segments:</span>{' '}
                              <span className="font-medium text-orange-600">{numberOfSegments}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || 1}</span>
                    </div>
                    {item.bendDetails.bendEndConfiguration && item.bendDetails.bendEndConfiguration !== 'PE' && (
                      <div>
                        <span className="text-gray-500">End Config:</span>{' '}
                        <span className="font-medium text-purple-600">{item.bendDetails.bendEndConfiguration}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{' '}
                      <span className="font-medium">{Number(item.weightPerUnitKg || 0).toFixed(2)} kg</span>
                    </div>
                    {(() => {
                      const nb = Math.round(Number(item.bendDetails.nominalBoreMm));
                      const qty = item.quantity || 1;
                      const flangeStandard = item.flangeStandardCode || 'SANS 1123';
                      const pressureClass = item.flangePressureClassDesignation || '1000/3';
                      const calcData = item.bendDetails.calculationData;
                      const stubs = calcData?.stubs || [];

                      if (!item.bendDetails.bendEndConfiguration || item.bendDetails.bendEndConfiguration === 'PE') {
                        return null;
                      }

                      const flangeItems: Array<{nb: number; count: number; weight: number; singleWeight: number}> = [];
                      const mainFlangeCount = flangeCountFromConfig(item.bendDetails.bendEndConfiguration, 'bend');
                      const stubsWithFlanges = stubs.filter((s: {nominalBoreMm?: number}) =>
                        s.nominalBoreMm && s.nominalBoreMm > 0
                      );
                      const stubFlangeCount = stubsWithFlanges.length;
                      const actualMainFlanges = Math.max(0, mainFlangeCount - stubFlangeCount);

                      if (actualMainFlanges > 0) {
                        const singleFlangeWt = flangeWeight(nb, pressureClass, flangeStandard);
                        flangeItems.push({
                          nb,
                          count: actualMainFlanges * qty,
                          weight: singleFlangeWt * actualMainFlanges * qty,
                          singleWeight: singleFlangeWt
                        });
                      }

                      stubsWithFlanges.forEach((stub: {nominalBoreMm?: number}) => {
                        if (stub.nominalBoreMm && stub.nominalBoreMm > 0) {
                          const stubNb = Math.round(Number(stub.nominalBoreMm));
                          const singleFlangeWt = flangeWeight(stubNb, pressureClass, flangeStandard);
                          flangeItems.push({
                            nb: stubNb,
                            count: qty,
                            weight: singleFlangeWt * qty,
                            singleWeight: singleFlangeWt
                          });
                        }
                      });

                      if (flangeItems.length === 0) return null;

                      return (
                        <div className="col-span-2 space-y-1">
                          {flangeItems.map((fi, idx) => (
                            <div key={idx}>
                              <span className="text-gray-500">Flanges:</span>{' '}
                              <span className="font-medium">
                                {fi.count}x {fi.nb}NB {flangeStandard} {pressureClass} = {fi.weight.toFixed(2)} kg
                              </span>
                              <span className="text-gray-500 text-xs ml-2">({fi.singleWeight.toFixed(2)} kg each)</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {(() => {
                      const weldInfo = calculateWeldLinearMeterage(item);
                      if (!weldInfo) return null;
                      const parts = [];
                      if (Number(weldInfo.flangeWeldMeters) > 0) parts.push(`Flange: ${Number(weldInfo.flangeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.buttWeldMeters) > 0) parts.push(`Butt: ${Number(weldInfo.buttWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.mitreWeldMeters) > 0) parts.push(`Mitre: ${Number(weldInfo.mitreWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.teeWeldMeters) > 0) parts.push(`Tee: ${Number(weldInfo.teeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.tackWeldMeters) > 0) parts.push(`Tack: ${Number(weldInfo.tackWeldMeters).toFixed(2)}m`);
                      return (
                        <div className="col-span-2">
                          <span className="text-gray-500">Weld L/m:</span>{' '}
                          <span className="font-medium text-purple-600">
                            {parts.join(' + ')} = {Number(weldInfo.totalLinearMeters).toFixed(2)}m ({roundToNearestWeldThickness(Number(weldInfo.wallThicknessMm)).toFixed(1)}mm WT)
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {item.fittingDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{' '}
                      <span className="font-medium">{Math.round(Number(item.fittingDetails.nominalDiameterMm))}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wall Thickness:</span>{' '}
                      <span className="font-medium">
                        {formatScheduleDisplay(item.fittingDetails.scheduleNumber, item.fittingDetails.wallThicknessMm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="font-medium">{item.fittingDetails.fittingType || 'Tee'}</span>
                    </div>
                    {item.fittingDetails.branchNominalDiameterMm &&
                     Number(item.fittingDetails.branchNominalDiameterMm) !== Number(item.fittingDetails.nominalDiameterMm) && (
                      <div>
                        <span className="text-gray-500">Branch NB:</span>{' '}
                        <span className="font-medium text-indigo-600">{Math.round(Number(item.fittingDetails.branchNominalDiameterMm))}mm</span>
                      </div>
                    )}
                    {(() => {
                      const calcData = item.fittingDetails.calculationData;
                      const teeHeight = calcData?.teeHeightMm || calcData?.branchHeightMm;
                      return teeHeight ? (
                        <div>
                          <span className="text-gray-500">Tee Height:</span>{' '}
                          <span className="font-medium text-indigo-600">{Math.round(Number(teeHeight))}mm</span>
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || 1}</span>
                    </div>
                    {item.fittingDetails.pipeEndConfiguration && item.fittingDetails.pipeEndConfiguration !== 'PE' && (
                      <div>
                        <span className="text-gray-500">End Config:</span>{' '}
                        <span className="font-medium text-green-600">{item.fittingDetails.pipeEndConfiguration}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{' '}
                      <span className="font-medium">{Number(item.weightPerUnitKg || 0).toFixed(2)} kg</span>
                    </div>
                    {item.fittingDetails.pipeEndConfiguration && item.fittingDetails.pipeEndConfiguration !== 'PE' && (() => {
                      const flangeStandard = item.flangeStandardCode || 'SANS 1123';
                      const pressureClass = item.flangePressureClassDesignation || '1000/3';
                      const mainNb = Math.round(Number(item.fittingDetails.nominalDiameterMm));
                      const branchNb = Math.round(Number(item.fittingDetails.branchNominalDiameterMm || mainNb));
                      const qty = item.quantity || 1;
                      const calcData = item.fittingDetails.calculationData;

                      const flangeItems: Array<{nb: number; count: number; weight: number; singleWeight: number}> = [];

                      const mainFlangeCount = calcData?.mainFlangeCount || 2;
                      if (mainFlangeCount > 0) {
                        const singleFlangeWt = flangeWeight(mainNb, pressureClass, flangeStandard);
                        flangeItems.push({
                          nb: mainNb,
                          count: mainFlangeCount * qty,
                          weight: singleFlangeWt * mainFlangeCount * qty,
                          singleWeight: singleFlangeWt
                        });
                      }

                      const branchFlangeCount = calcData?.branchFlangeCount || (branchNb !== mainNb ? 1 : 0);
                      if (branchFlangeCount > 0 && branchNb !== mainNb) {
                        const singleFlangeWt = flangeWeight(branchNb, pressureClass, flangeStandard);
                        flangeItems.push({
                          nb: branchNb,
                          count: branchFlangeCount * qty,
                          weight: singleFlangeWt * branchFlangeCount * qty,
                          singleWeight: singleFlangeWt
                        });
                      }

                      if (flangeItems.length === 0) return null;

                      return (
                        <div className="col-span-2 space-y-1">
                          {flangeItems.map((fi, idx) => (
                            <div key={idx}>
                              <span className="text-gray-500">Flanges:</span>{' '}
                              <span className="font-medium">
                                {fi.count}x {fi.nb}NB {flangeStandard} {pressureClass} = {fi.weight.toFixed(2)} kg
                              </span>
                              <span className="text-gray-500 text-xs ml-2">({fi.singleWeight.toFixed(2)} kg each)</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {item.fittingDetails.addBlankFlange && item.fittingDetails.blankFlangeCount && (() => {
                      const blankFlangeNB = Math.round(Number(item.fittingDetails.nominalDiameterMm));
                      const flangeStandard = item.flangeStandardCode || 'SANS 1123';
                      const pressureClass = item.flangePressureClassDesignation || '1000/3';
                      const isSans = flangeStandard.toUpperCase().includes('SANS');
                      const singleBlankWt = isSans
                        ? sansBlankFlangeWeight(blankFlangeNB, pressureClass)
                        : blankFlangeWeight(blankFlangeNB, pressureClass);
                      const totalBlankWt = singleBlankWt * item.fittingDetails.blankFlangeCount;
                      return (
                        <div className="col-span-2">
                          <span className="text-gray-500">Blank Flanges:</span>{' '}
                          <span className="font-medium">
                            {item.fittingDetails.blankFlangeCount}x {blankFlangeNB}NB {flangeStandard} {pressureClass} = {totalBlankWt.toFixed(2)} kg
                          </span>
                          <span className="text-gray-500 text-xs ml-2">({singleBlankWt.toFixed(2)} kg each)</span>
                        </div>
                      );
                    })()}
                    {(() => {
                      const weldInfo = calculateWeldLinearMeterage(item);
                      if (!weldInfo) return null;
                      const parts = [];
                      if (Number(weldInfo.flangeWeldMeters) > 0) parts.push(`Flange: ${Number(weldInfo.flangeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.teeWeldMeters) > 0) parts.push(`Tee: ${Number(weldInfo.teeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.tackWeldMeters) > 0) parts.push(`Tack: ${Number(weldInfo.tackWeldMeters).toFixed(2)}m`);
                      return (
                        <div className="col-span-2">
                          <span className="text-gray-500">Weld L/m:</span>{' '}
                          <span className="font-medium text-purple-600">
                            {parts.join(' + ')} = {Number(weldInfo.totalLinearMeters).toFixed(2)}m ({roundToNearestWeldThickness(Number(weldInfo.wallThicknessMm)).toFixed(1)}mm WT)
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Fallback display when detailed entity data is not available */}
                {!item.straightPipeDetails && !item.bendDetails && !item.fittingDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || 1}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{' '}
                      <span className="font-medium">{Number(item.weightPerUnitKg || 0).toFixed(2)} kg</span>
                    </div>
                  </>
                )}
              </div>

              {/* Dimensions Section for Bends and Fittings */}
              {item.bendDetails && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1 font-medium">Dimensions:</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-x-3 gap-y-1 text-xs">
                    {item.bendDetails.centerToFaceMm && (
                      <div>
                        <span className="text-gray-500">C/F:</span>{' '}
                        <span className="font-medium text-indigo-600">{Math.round(Number(item.bendDetails.centerToFaceMm))}mm</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Angle:</span>{' '}
                      <span className="font-medium text-indigo-600">{Number(item.bendDetails.bendDegrees || 90).toFixed(0)}°</span>
                      {(() => {
                        const segments = item.bendDetails?.numberOfSegments || item.bendDetails?.calculationData?.numberOfSegments;
                        return segments && segments > 1 ? (
                          <span className="font-medium text-orange-600"> ({segments} segments)</span>
                        ) : null;
                      })()}
                    </div>
                    {(() => {
                      const storedTangents = item.bendDetails?.tangentLengths || item.bendDetails?.calculationData?.tangentLengths || [];
                      const numTangents = item.bendDetails?.numberOfTangents || storedTangents.length || 0;
                      if (numTangents === 0 || storedTangents.length === 0) return null;
                      const centerToFace = Number(item.bendDetails?.centerToFaceMm) || 0;
                      const actualTangents = storedTangents.map((t: number) => Math.max(0, t - centerToFace));
                      const allSame = actualTangents.every((t: number) => t === actualTangents[0]);
                      const formatted = allSame && actualTangents.length > 1
                        ? `${actualTangents.length} x ${Math.round(actualTangents[0])}mm`
                        : actualTangents.map((t: number) => `${Math.round(t)}mm`).join(', ');
                      return (
                        <div>
                          <span className="text-gray-500">Tangents:</span>{' '}
                          <span className="font-medium text-blue-600">{formatted}</span>
                        </div>
                      );
                    })()}
                    {(() => {
                      const stubs = item.bendDetails?.stubLengths || item.bendDetails?.calculationData?.stubLengths || [];
                      if (stubs.length === 0) return null;
                      const allSame = stubs.every((s: number) => s === stubs[0]);
                      const formatted = allSame && stubs.length > 1
                        ? `${stubs.length} x ${Math.round(stubs[0])}mm`
                        : stubs.map((s: number) => `${Math.round(s)}mm`).join(', ');
                      return (
                        <div>
                          <span className="text-gray-500">Stubs:</span>{' '}
                          <span className="font-medium text-green-600">{formatted}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {item.fittingDetails && (item.fittingDetails.pipeLengthAMm || item.fittingDetails.pipeLengthBMm) && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1 font-medium">Dimensions:</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-x-3 gap-y-1 text-xs">
                    {item.fittingDetails.pipeLengthAMm && (
                      <div>
                        <span className="text-gray-500">Length A:</span>{' '}
                        <span className="font-medium text-indigo-600">{Math.round(Number(item.fittingDetails.pipeLengthAMm))}mm</span>
                      </div>
                    )}
                    {item.fittingDetails.pipeLengthBMm && (
                      <div>
                        <span className="text-gray-500">Length B:</span>{' '}
                        <span className="font-medium text-blue-600">{Math.round(Number(item.fittingDetails.pipeLengthBMm))}mm</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Notes:</span>{' '}
                  <span className="text-xs text-gray-700">{item.notes}</span>
                </div>
              )}

              {/* Pricing Breakdown Section */}
              {(() => {
                const weightPerUnit = Number(item.weightPerUnitKg || 0);
                const itemSteelSpec = item.straightPipeDetails?.pipeStandard ||
                  item.bendDetails?.pipeStandard ||
                  item.fittingDetails?.fittingStandard || '';
                const normalizedSpec = normalizeSteelSpec(itemSteelSpec);
                const steelPricePerKg = pricingInputs.steelSpecs[normalizedSpec] ||
                  Object.values(pricingInputs.steelSpecs)[0] || 0;
                const steelCost = weightPerUnit * steelPricePerKg;

                const endConfig =
                  (item.straightPipeDetails?.pipeEndConfiguration) ||
                  (item.bendDetails?.bendEndConfiguration) ||
                  (item.fittingDetails?.pipeEndConfiguration);

                let flangeWeightKg = 0;
                let flangePricePerKg = 0;
                let flangeCost = 0;
                if (endConfig && endConfig !== 'PE') {
                  const flangeStandard = item.flangeStandardCode || 'SANS 1123';
                  const pressureClass = item.flangePressureClassDesignation || '1000/3';
                  flangePricePerKg = isRotatingFlange(endConfig)
                    ? (pricingInputs.flangeTypes['rotating'] || 0)
                    : (pricingInputs.flangeTypes['slipOn'] || 0);

                  if (item.bendDetails) {
                    const mainNb = Math.round(Number(item.bendDetails.nominalBoreMm));
                    const calcData = item.bendDetails.calculationData;
                    const stubs = calcData?.stubs || [];
                    const totalFlangeCount = flangeCountFromConfig(endConfig, 'bend');
                    const stubFlangeCount = stubs.filter((s: { nominalBoreMm?: number }) => s.nominalBoreMm && s.nominalBoreMm > 0).length;
                    const mainFlangeCount = Math.max(0, totalFlangeCount - stubFlangeCount);

                    if (mainFlangeCount > 0) {
                      flangeWeightKg += mainFlangeCount * flangeWeight(mainNb, pressureClass, flangeStandard);
                    }
                    stubs.forEach((stub: { nominalBoreMm?: number }) => {
                      if (stub.nominalBoreMm && stub.nominalBoreMm > 0) {
                        const stubNb = Math.round(Number(stub.nominalBoreMm));
                        flangeWeightKg += flangeWeight(stubNb, pressureClass, flangeStandard);
                      }
                    });
                  } else if (item.fittingDetails) {
                    const mainNb = Math.round(Number(item.fittingDetails.nominalDiameterMm));
                    const branchNb = Math.round(Number(item.fittingDetails.branchNominalDiameterMm || mainNb));
                    const fittingConfig = item.fittingDetails.pipeEndConfiguration || '';
                    const mainFlangeCount = ['FAE', 'FFF', 'F2E', 'FFP'].includes(fittingConfig) ? 2 :
                                           ['F2E_RF', 'F2E_LF', 'PFF', 'FPP', 'PFP'].includes(fittingConfig) ? 1 : 0;
                    const branchFlangeCount = ['FAE', 'FFF', 'F2E_RF', 'F2E_LF', 'PFF', 'PPF'].includes(fittingConfig) ? 1 : 0;

                    if (mainFlangeCount > 0) {
                      flangeWeightKg += mainFlangeCount * flangeWeight(mainNb, pressureClass, flangeStandard);
                    }
                    if (branchFlangeCount > 0 && branchNb !== mainNb) {
                      flangeWeightKg += branchFlangeCount * flangeWeight(branchNb, pressureClass, flangeStandard);
                    } else if (branchFlangeCount > 0) {
                      flangeWeightKg += branchFlangeCount * flangeWeight(mainNb, pressureClass, flangeStandard);
                    }
                  } else if (item.straightPipeDetails) {
                    const nb = Math.round(Number(item.straightPipeDetails.nominalBoreMm));
                    const flangeCount = flangeCountFromConfig(endConfig, 'straight_pipe');
                    flangeWeightKg = flangeCount * flangeWeight(nb, pressureClass, flangeStandard);
                  }

                  flangeCost = flangeWeightKg * flangePricePerKg;
                }

                let blankFlangeWeightKg = 0;
                let blankFlangeCost = 0;
                if (item.fittingDetails?.addBlankFlange && item.fittingDetails.blankFlangeCount) {
                  const blankNb = Math.round(Number(item.fittingDetails.nominalDiameterMm || 0));
                  const flangeStandard = item.flangeStandardCode || 'SANS 1123';
                  const pressureClass = item.flangePressureClassDesignation || '1000/3';
                  const isSans = flangeStandard.toUpperCase().includes('SANS');
                  const singleBlankWt = isSans
                    ? sansBlankFlangeWeight(blankNb, pressureClass)
                    : blankFlangeWeight(blankNb, pressureClass);
                  blankFlangeWeightKg = singleBlankWt * item.fittingDetails.blankFlangeCount;
                  blankFlangeCost = blankFlangeWeightKg * (pricingInputs.flangeTypes['blank'] || 0);
                }

                const weldInfo = calculateWeldLinearMeterage(item);
                const flangeWeldRate = pricingInputs.weldTypes['flangeWeld'] || 0;
                const mitreWeldRate = pricingInputs.weldTypes['mitreWeld'] || 0;
                const teeWeldRate = pricingInputs.weldTypes['teeWeld'] || 0;
                const tackWeldRate = pricingInputs.weldTypes['tackWeld'] || 0;
                const totalWeldMeters = weldInfo ? Number(weldInfo.totalLinearMeters) : 0;
                const weldRate = flangeWeldRate || mitreWeldRate || teeWeldRate || tackWeldRate;
                const weldCost = totalWeldMeters * weldRate;

                const subtotal = steelCost + flangeCost + blankFlangeCost + weldCost;
                const labourExtras = subtotal * (pricingInputs.labourExtrasPercent / 100);

                return (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-500">Steel:</span>{' '}
                        <span className="font-medium">{weightPerUnit.toFixed(0)}kg × R{steelPricePerKg.toFixed(2)} = </span>
                        <span className="font-semibold text-blue-600">{currencySymbol}{formatCurrency(steelCost)}</span>
                      </div>
                      {flangeWeightKg > 0 && (
                        <div>
                          <span className="text-gray-500">Flanges:</span>{' '}
                          <span className="font-medium">{flangeWeightKg.toFixed(0)}kg × R{flangePricePerKg.toFixed(2)} = </span>
                          <span className="font-semibold text-amber-600">{currencySymbol}{formatCurrency(flangeCost)}</span>
                        </div>
                      )}
                      {blankFlangeWeightKg > 0 && (
                        <div>
                          <span className="text-gray-500">Blank Flanges:</span>{' '}
                          <span className="font-medium">{blankFlangeWeightKg.toFixed(0)}kg × R{(pricingInputs.flangeTypes['blank'] || 0).toFixed(2)} = </span>
                          <span className="font-semibold text-orange-600">{currencySymbol}{formatCurrency(blankFlangeCost)}</span>
                        </div>
                      )}
                      {totalWeldMeters > 0 && (
                        <div>
                          <span className="text-gray-500">Welds:</span>{' '}
                          <span className="font-medium">{totalWeldMeters.toFixed(2)}m × R{weldRate.toFixed(2)} = </span>
                          <span className="font-semibold text-purple-600">{currencySymbol}{formatCurrency(weldCost)}</span>
                        </div>
                      )}
                      {pricingInputs.labourExtrasPercent > 0 && (
                        <div>
                          <span className="text-gray-500">Labour & Extras ({pricingInputs.labourExtrasPercent}%):</span>{' '}
                          <span className="font-semibold text-gray-600">{currencySymbol}{formatCurrency(labourExtras)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Unit Value:</span>{' '}
                        <span className="text-sm font-semibold text-gray-800">
                          {currencySymbol} {formatCurrency(unitPrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Qty:</span>{' '}
                        <span className="text-sm font-medium text-gray-700">{qty}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Line Total:</span>{' '}
                        <span className="text-sm font-bold text-green-700">
                          {currencySymbol} {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Accessory Sections */}
      {accessorySections.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Accessories</h3>
          {accessorySections.map((section) => {
            const calculateAccessoryItemPrice = (item: ConsolidatedItem): number => {
              const weight = Number(item.weightKg || 0);
              if (section.sectionType === 'bnw_sets') {
                const boltWeight = weight * 0.55;
                const nutWeight = weight * 0.30;
                const washerWeight = weight * 0.15;
                return (pricingInputs.bnwTypes['bolts'] || 0) * boltWeight +
                       (pricingInputs.bnwTypes['nuts'] || 0) * nutWeight +
                       (pricingInputs.bnwTypes['washers'] || 0) * washerWeight;
              } else if (section.sectionType === 'blank_flanges') {
                return (pricingInputs.flangeTypes['blank'] || 0) * weight;
              }
              return 0;
            };

            const sectionTotal = section.items.reduce((sum, item) => sum + calculateAccessoryItemPrice(item), 0);

            return (
              <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                  <h4 className="font-medium text-amber-800">{section.sectionTitle}</h4>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase w-16">Qty</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase w-16">Unit</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase w-24">Weight</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase w-28">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, idx) => {
                        const itemTotal = calculateAccessoryItemPrice(item);
                        return (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-2 text-gray-900">{item.description}</td>
                            <td className="py-2 px-3 text-gray-900 text-right">{item.qty}</td>
                            <td className="py-2 px-3 text-gray-500">{item.unit}</td>
                            <td className="py-2 px-2 text-gray-900 text-right">{Number(item.weightKg || 0).toFixed(2)} kg</td>
                            <td className="py-2 px-2 text-green-700 text-right font-medium">
                              {currencySymbol} {formatCurrency(itemTotal)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={2} className="py-2 px-2 text-gray-900">TOTAL</td>
                        <td className="py-2 px-3 text-gray-900 text-right">
                          {section.items.reduce((sum, i) => sum + (i.qty || 0), 0)}
                        </td>
                        <td className="py-2 px-3"></td>
                        <td className="py-2 px-2 text-gray-900 text-right">{Number(section.totalWeightKg || 0).toFixed(2)} kg</td>
                        <td className="py-2 px-2 text-green-700 text-right font-bold">
                          {currencySymbol} {formatCurrency(sectionTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Financial Totals */}
      {(() => {
        const accessoriesTotal = accessorySections.reduce((sum, section) => {
          return sum + section.items.reduce((itemSum, item) => {
            const weight = Number(item.weightKg || 0);
            if (section.sectionType === 'bnw_sets') {
              const boltWeight = weight * 0.55;
              const nutWeight = weight * 0.30;
              const washerWeight = weight * 0.15;
              return itemSum + (pricingInputs.bnwTypes['bolts'] || 0) * boltWeight +
                     (pricingInputs.bnwTypes['nuts'] || 0) * nutWeight +
                     (pricingInputs.bnwTypes['washers'] || 0) * washerWeight;
            } else if (section.sectionType === 'blank_flanges') {
              return itemSum + (pricingInputs.flangeTypes['blank'] || 0) * weight;
            }
            return itemSum;
          }, 0);
        }, 0);

        const subtotal = itemsSubtotal + accessoriesTotal;
        const contingenciesAmount = subtotal * (pricingInputs.contingenciesPercent / 100);
        const grandTotalExVat = subtotal + contingenciesAmount;
        const vatRate = vatRateForCurrency(currencyCode);
        const vatAmount = grandTotalExVat * (vatRate / 100);
        const grandTotalIncVat = grandTotalExVat + vatAmount;

        return (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quote Summary</h3>
            <div className="space-y-2 max-w-md ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Subtotal:</span>
                <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(itemsSubtotal)}</span>
              </div>
              {accessoriesTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Accessories:</span>
                  <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(accessoriesTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Contingencies ({pricingInputs.contingenciesPercent}%):</span>
                <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(contingenciesAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span className="text-gray-700">Grand Total (Ex VAT):</span>
                <span className="text-gray-900">{currencySymbol} {formatCurrency(grandTotalExVat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT ({vatRate}%):</span>
                <span className="font-medium text-gray-900">{currencySymbol} {formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span className="text-gray-800">Grand Total (Inc VAT):</span>
                <span className="text-green-700">{currencySymbol} {formatCurrency(grandTotalIncVat)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
