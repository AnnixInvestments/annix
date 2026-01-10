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
      'FOE': 1, 'FBE': 2, 'FOE_LF': 2, 'FOE_RF': 2, '2X_RF': 2, 'LF_BE': 4,
    };
    return counts[config] || 0;
  }
  if (itemType === 'fitting') {
    const counts: Record<string, number> = {
      'FAE': 3, 'FFF': 3, 'F2E': 2, 'F2E_RF': 2, 'F2E_LF': 2, 'FFP': 2, 'PFF': 2, 'PPF': 1, 'FPP': 1, 'PFP': 1,
    };
    return counts[config] || 0;
  }
  return 0;
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
    const counts: Record<string, number> = { 'FOE': 1, 'FBE': 2, 'FOE_LF': 2, 'FOE_RF': 2, '2X_RF': 2, 'LF_BE': 4 };
    return counts[config] || 0;
  }
  if (itemType === 'bend') {
    const counts: Record<string, number> = { 'FOE': 1, 'FBE': 2, 'FOE_LF': 2, 'FOE_RF': 2, '2X_RF': 2, 'LF_BE': 4 };
    return counts[config] || 0;
  }
  if (itemType === 'fitting') {
    const counts: Record<string, number> = { 'FAE': 3, 'FFF': 3, 'F2E': 2, 'F2E_RF': 2, 'F2E_LF': 2, 'FFP': 2, 'PFF': 2, 'PPF': 1, 'FPP': 1, 'PFP': 1 };
    return counts[config] || 0;
  }
  return 0;
};

const hasLooseFlanges = (config: string | undefined): boolean => {
  if (!config) return false;
  return config.includes('LF') || config.includes('_L') || config === 'LF_BE';
};

const countLooseFlanges = (config: string | undefined, itemType: string): number => {
  if (!config) return 0;
  if (itemType === 'straight_pipe' || itemType === 'bend') {
    const counts: Record<string, number> = {
      'FOE_LF': 1, 'LF_BE': 2, '2X_RF': 0,
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
        const hasFlangesFromItems = prev.flangeTypes.slipOn || prev.flangeTypes.rotating || prev.flangeTypes.blank;

        let bnwGrade: string | null = null;
        if (bnwSection && bnwSection.items.length > 0) {
          const firstItemDesc = bnwSection.items[0].description.toUpperCase();
          const gradeMatch = firstItemDesc.match(/GRADE\s*([\d.]+)/i) || firstItemDesc.match(/GR\s*([\d.]+)/i);
          bnwGrade = gradeMatch ? `Grade ${gradeMatch[1]}` : 'Standard';
        } else if (hasFlangesSection || hasFlangesFromItems) {
          bnwGrade = 'Standard';
        }

        return {
          ...prev,
          flangeTypes: hasBlankFlangesSection ? { ...prev.flangeTypes, blank: true } : prev.flangeTypes,
          bnwGrade: bnwGrade || prev.bnwGrade,
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
      console.error('Failed to load supplier currency:', err);
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
      console.error('Failed to load RFQ items:', err);
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
      loadBoqDetails(); // Refresh to show updated status
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline BOQ', 'error');
    } finally {
      setDecliningLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!boqDetail) return;

    const workbook = XLSX.utils.book_new();

    // Create a sheet for each section
    boqDetail.sections.forEach((section) => {
      const hasWelds = section.items.some(
        (item) =>
          item.welds?.flangeWeld || item.welds?.mitreWeld || item.welds?.teeWeld
      );
      const hasAreas = section.items.some((item) => item.areas?.intAreaM2 || item.areas?.extAreaM2);

      // Build headers
      const headers = ['#', 'Description', 'Qty', 'Unit'];
      if (hasWelds) {
        headers.push('Flange Weld (m)', 'Mitre Weld (m)', 'Tee Weld (m)');
      }
      if (hasAreas) {
        headers.push('Int Area (m²)', 'Ext Area (m²)');
      }
      headers.push('Weight (kg)');

      // Build rows
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

      // Add totals row
      const totalWeightIdx = headers.indexOf('Weight (kg)');
      const totalsRow: (string | number)[] = headers.map((_, idx) => {
        if (idx === 1) return 'TOTAL';
        if (idx === totalWeightIdx) return Number(section.totalWeightKg || 0).toFixed(2);
        return '';
      });
      rows.push(totalsRow);

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },
        { wch: 50 },
        { wch: 8 },
        { wch: 8 },
        ...Array(headers.length - 4).fill({ wch: 15 }),
      ];

      // Clean sheet name (max 31 chars, no special chars)
      const sheetName = section.sectionTitle.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });

    // Download
    const fileName = `BOQ_${boqDetail.boq.boqNumber}_${nowISO().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
      {/* Header */}
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
              <RfqItemsDetailedView items={rfqItems} sections={boqDetail.sections} />
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing Inputs</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your prices below and the BOQ item unit prices will be automatically calculated based on weight.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Steel Specifications */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Steel Specifications (Price/kg)</h3>
          {extractedSpecs.steelSpecs.length > 0 ? (
            extractedSpecs.steelSpecs.map((spec) => (
              <div key={spec} className="flex items-center gap-2">
                <label className="text-sm text-gray-600 flex-1 min-w-0 truncate" title={spec}>
                  {spec}
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingInputs.steelSpecs[spec] || ''}
                    onChange={(e) => onPricingInputChange('steelSpecs', spec, parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingInputs.steelSpecs['Steel'] || ''}
                  onChange={(e) => onPricingInputChange('steelSpecs', 'Steel', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
          )}
        </div>

        {/* Weld Types - only show types used in this RFQ */}
        {(extractedSpecs.weldTypes.flangeWeld ||
          extractedSpecs.weldTypes.mitreWeld || extractedSpecs.weldTypes.teeWeld || extractedSpecs.weldTypes.tackWeld) && (
          <div className="space-y-3">
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
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Lm</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flange Price Centers - only show types used in this RFQ */}
        {(extractedSpecs.flangeTypes.slipOn || extractedSpecs.flangeTypes.rotating || extractedSpecs.flangeTypes.blank) && (
          <div className="space-y-3">
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
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500 ml-1">/Kg</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bolts, Nuts & Washers Pricing - only show if BNW section exists */}
        {extractedSpecs.bnwGrade && (
          <div className="space-y-3">
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
                  className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Labour & Extras and Contingencies */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Labour & Extras
            </label>
            <div className="flex items-center w-24">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pricingInputs.labourExtrasPercent || ''}
                onChange={(e) => onPercentageChange('labourExtrasPercent', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
            <span className="text-xs text-gray-400">(Added to each line item)</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Contingencies
            </label>
            <div className="flex items-center w-24">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pricingInputs.contingenciesPercent || ''}
                onChange={(e) => onPercentageChange('contingenciesPercent', parseFloat(e.target.value) || 0)}
                placeholder="5"
                className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
            <span className="text-xs text-gray-400">(Added to grand total)</span>
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
    const description = item.description.toUpperCase();
    const weightPerUnit = item.qty > 0 ? (item.weightKg / item.qty) : 0;

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

  const calculateSuggestedPrice = (item: ConsolidatedItem): number => {
    const description = item.description.toUpperCase();
    const weightPerUnit = item.qty > 0 ? (item.weightKg / item.qty) : 0;

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
    weight: Number(section.totalWeightKg) || 0,
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
                      {Number(item.weightKg || 0).toFixed(2)}
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

function RfqItemsDetailedView({ items, sections }: { items: RfqItemDetail[]; sections?: BoqSection[] }) {
  const totalWeight = items.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0);

  const accessorySectionOrder = ['blank_flanges', 'bnw_sets', 'gaskets'];
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
      const wt = wallThicknessMm || parseFloat(scheduleNumber.replace(/[^0-9.]/g, ''));
      return wt ? `${wt}mm W/T` : scheduleNumber;
    }
    return scheduleNumber || (wallThicknessMm ? `${wallThicknessMm}mm W/T` : '-');
  };

  const flangeWeightByNB: Record<number, number> = {
    15: 0.8, 20: 1.1, 25: 1.4, 32: 1.8, 40: 2.2, 50: 2.8, 65: 4.2, 80: 5.0,
    100: 7.5, 125: 10.5, 150: 13.0, 200: 18.0, 250: 28.0, 300: 38.0,
    350: 48.0, 400: 58.0, 450: 68.0, 500: 65.0, 600: 95.0, 700: 120.0,
    750: 135.0, 800: 150.0, 900: 180.0, 1000: 220.0, 1050: 240.0, 1200: 300.0,
  };

  const calculateFlangeWeight = (nb: number, config: string | undefined, itemType: string, qty: number): number => {
    const flangeCount = flangeCountFromConfig(config, itemType);
    if (flangeCount === 0) return 0;
    const closestNB = Object.keys(flangeWeightByNB)
      .map(Number)
      .reduce((prev, curr) => Math.abs(curr - nb) < Math.abs(prev - nb) ? curr : prev);
    return flangeCount * (flangeWeightByNB[closestNB] || 0) * qty;
  };

  return (
    <div className="space-y-6">
      {/* Items List */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const colors = itemTypeColors[item.itemType] || itemTypeColors.straight_pipe;
          const details = item.straightPipeDetails || item.bendDetails || item.fittingDetails;

          return (
            <div key={item.id} className={`border border-gray-200 rounded-lg p-4 ${colors.bg}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${colors.badge} ${colors.badgeText}`}>
                    {formatItemType(item.itemType)}
                  </span>
                  <h4 className="font-medium text-gray-800">Item #{item.lineNumber || index + 1}</h4>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {Number(item.totalWeightKg || 0).toFixed(2)} kg
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-3 font-medium">{item.description}</p>

              {/* Item Details Grid - Consistent format for all item types */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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
                      const flangeWt = calculateFlangeWeight(
                        Number(item.straightPipeDetails.nominalBoreMm),
                        item.straightPipeDetails.pipeEndConfiguration,
                        'straight_pipe',
                        item.quantity || item.straightPipeDetails.quantityValue || 1
                      );
                      const flangeCount = flangeCountFromConfig(item.straightPipeDetails.pipeEndConfiguration, 'straight_pipe');
                      return flangeWt > 0 ? (
                        <div>
                          <span className="text-gray-500">Flanges ({flangeCount}x):</span>{' '}
                          <span className="font-medium text-amber-600">{flangeWt.toFixed(2)} kg</span>
                        </div>
                      ) : null;
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
                      <span className="font-medium">{item.bendDetails.bendType || '1.5D'}</span>
                    </div>
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
                    {item.bendDetails.bendEndConfiguration && item.bendDetails.bendEndConfiguration !== 'PE' && (() => {
                      const flangeWt = calculateFlangeWeight(
                        Number(item.bendDetails.nominalBoreMm),
                        item.bendDetails.bendEndConfiguration,
                        'bend',
                        item.quantity || 1
                      );
                      const flangeCount = flangeCountFromConfig(item.bendDetails.bendEndConfiguration, 'bend');
                      return flangeWt > 0 ? (
                        <div>
                          <span className="text-gray-500">Flanges ({flangeCount}x):</span>{' '}
                          <span className="font-medium text-amber-600">{flangeWt.toFixed(2)} kg</span>
                        </div>
                      ) : null;
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
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || 1}</span>
                    </div>
                    {item.fittingDetails.pipeLengthAMm && (
                      <div>
                        <span className="text-gray-500">Length A:</span>{' '}
                        <span className="font-medium">{Math.round(Number(item.fittingDetails.pipeLengthAMm))}mm</span>
                      </div>
                    )}
                    {item.fittingDetails.pipeLengthBMm && (
                      <div>
                        <span className="text-gray-500">Length B:</span>{' '}
                        <span className="font-medium">{Math.round(Number(item.fittingDetails.pipeLengthBMm))}mm</span>
                      </div>
                    )}
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
                      const flangeWt = calculateFlangeWeight(
                        Number(item.fittingDetails.nominalDiameterMm),
                        item.fittingDetails.pipeEndConfiguration,
                        'fitting',
                        item.quantity || 1
                      );
                      const flangeCount = flangeCountFromConfig(item.fittingDetails.pipeEndConfiguration, 'fitting');
                      return flangeWt > 0 ? (
                        <div>
                          <span className="text-gray-500">Flanges ({flangeCount}x):</span>{' '}
                          <span className="font-medium text-amber-600">{flangeWt.toFixed(2)} kg</span>
                        </div>
                      ) : null;
                    })()}
                    {item.fittingDetails.addBlankFlange && item.fittingDetails.blankFlangeCount && (() => {
                      const blankFlangeNB = Math.round(Number(item.fittingDetails.nominalDiameterMm));
                      const closestNB = Object.keys(flangeWeightByNB)
                        .map(Number)
                        .reduce((prev, curr) => Math.abs(curr - blankFlangeNB) < Math.abs(prev - blankFlangeNB) ? curr : prev);
                      const blankWt = (flangeWeightByNB[closestNB] || 0) * 0.6 * item.fittingDetails.blankFlangeCount;
                      return (
                        <div>
                          <span className="text-gray-500">Blank Flange ({item.fittingDetails.blankFlangeCount}x):</span>{' '}
                          <span className="font-medium text-orange-600">{blankWt.toFixed(2)} kg</span>
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

              {item.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Notes:</span>{' '}
                  <span className="text-xs text-gray-700">{item.notes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Accessory Sections */}
      {accessorySections.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Accessories</h3>
          {accessorySections.map((section) => (
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
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase w-20">Qty</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase w-20">Unit</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase w-28">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-2 text-gray-900">{item.description}</td>
                        <td className="py-2 px-3 text-gray-900 text-right">{item.qty}</td>
                        <td className="py-2 px-3 text-gray-500">{item.unit}</td>
                        <td className="py-2 px-2 text-gray-900 text-right font-medium">{Number(item.weightKg || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-medium">
                      <td colSpan={2} className="py-2 px-2 text-gray-900">TOTAL</td>
                      <td className="py-2 px-3 text-gray-900 text-right">
                        {section.items.reduce((sum, i) => sum + (i.qty || 0), 0)}
                      </td>
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-2 text-gray-900 text-right">{Number(section.totalWeightKg || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Total Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Main Items</p>
            <p className="text-2xl font-bold text-blue-900">{items.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Fabrication Weight</p>
            <p className="text-2xl font-bold text-blue-900">{totalWeight.toFixed(2)} kg</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Accessories</p>
            <p className="text-2xl font-bold text-amber-700">{accessorySections.reduce((sum, s) => sum + s.items.length, 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Accessory Weight</p>
            <p className="text-2xl font-bold text-amber-700">{accessoryWeight.toFixed(2)} kg</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Grand Total</p>
            <p className="text-2xl font-bold text-green-700">{(totalWeight + accessoryWeight).toFixed(2)} kg</p>
          </div>
        </div>
      </div>
    </div>
  );
}
