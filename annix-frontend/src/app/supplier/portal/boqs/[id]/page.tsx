"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/app/components/Toast";
import type { RfqItemDetail, SupplierBoqDetailResponse } from "@/app/lib/api/supplierApi";
import { DEFAULT_CURRENCY } from "@/app/lib/currencies";
import { formatDateTimeZA, nowISO } from "@/app/lib/datetime";
import { log } from "@/app/lib/logger";
import {
  useDeclineBoq,
  useSaveQuoteProgress,
  useSubmitQuote,
  useSupplierBoqDetail,
  useSupplierProfile,
  useSupplierRfqItems,
} from "@/app/lib/query/hooks";
import GrandTotalsSection from "./components/GrandTotalsSection";
import PricingInputsSection from "./components/PricingInputsSection";
import RfqItemsDetailedView, { RfqSectionTable } from "./components/RfqItemsDetailedView";
import SectionTable from "./components/SectionTable";
import WeldsSection from "./components/WeldsSection";
import { extractUniqueSpecs, extractWeldTypesFromRfqItems, statusColors } from "./lib/boq-helpers";
import type { ExtractedSpecs, PricingInputs, WeldTotals } from "./lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SupplierBoqDetailPage(props: PageProps) {
  const { params } = props;
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
  const [declineReason, setDeclineReason] = useState("");
  const [decliningLoading, setDecliningLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [viewMode, setViewMode] = useState<"boq" | "rfq">("boq");
  const [supplierCurrency, setSupplierCurrency] = useState(DEFAULT_CURRENCY);
  const [unitPrices, setUnitPrices] = useState<Record<string, Record<number, number>>>({});
  const [extractedSpecs, setExtractedSpecs] = useState<ExtractedSpecs>({
    steelSpecs: [],
    weldTypes: {
      flangeWeld: false,
      mitreWeld: false,
      teeWeld: false,
      tackWeld: false,
      gussetTeeWeld: false,
      latWeld45Plus: false,
      latWeldUnder45: false,
    },
    flangeTypes: { slipOn: false, rotating: false, blank: false },
    bnwGrade: null,
    valveTypes: [],
    instrumentTypes: [],
    pumpTypes: [],
  });
  const [weldTotals, setWeldTotals] = useState<WeldTotals>({
    flangeWeld: 0,
    mitreWeld: 0,
    teeWeld: 0,
    tackWeld: 0,
    gussetTeeWeld: 0,
    latWeld45Plus: 0,
    latWeldUnder45: 0,
  });
  const [pricingInputs, setPricingInputs] = useState<PricingInputs>(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("supplier_pricing_inputs");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          steelSpecs: (() => {
            const rawSteelSpecs = parsed.steelSpecs;
            return rawSteelSpecs || {};
          })(),
          weldTypes: (() => {
            const rawWeldTypes = parsed.weldTypes;
            return rawWeldTypes || {};
          })(),
          flangeTypes: (() => {
            const rawFlangeTypes = parsed.flangeTypes;
            return rawFlangeTypes || {};
          })(),
          bnwTypes: (() => {
            const rawBnwTypes = parsed.bnwTypes;
            return rawBnwTypes || {};
          })(),
          valveTypes: (() => {
            const rawValveTypes = parsed.valveTypes;
            return rawValveTypes || {};
          })(),
          instrumentTypes: (() => {
            const rawInstrumentTypes = parsed.instrumentTypes;
            return rawInstrumentTypes || {};
          })(),
          pumpTypes: (() => {
            const rawPumpTypes = parsed.pumpTypes;
            return rawPumpTypes || {};
          })(),
          labourExtrasPercent: (() => {
            const rawLabourExtrasPercent = parsed.labourExtrasPercent;
            return rawLabourExtrasPercent || 0;
          })(),
          contingenciesPercent: (() => {
            const rawContingenciesPercent = parsed.contingenciesPercent;
            return rawContingenciesPercent ?? 5;
          })(),
        };
      }
    }
    return {
      steelSpecs: {},
      weldTypes: {},
      flangeTypes: {},
      bnwTypes: {},
      valveTypes: {},
      instrumentTypes: {},
      pumpTypes: {},
      labourExtrasPercent: 0,
      contingenciesPercent: 5,
    };
  });
  const [weldUnitPrices, setWeldUnitPrices] = useState<Record<string, number>>(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("supplier_weld_unit_prices");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return {};
  });

  const { data: supplierProfile } = useSupplierProfile();
  const { mutateAsync: fetchBoqDetails } = useSupplierBoqDetail(boqId);
  const { mutateAsync: fetchRfqItems } = useSupplierRfqItems(boqId);
  const { mutateAsync: declineBoqMutation } = useDeclineBoq();
  const { mutateAsync: saveQuoteProgressMutation } = useSaveQuoteProgress();
  const { mutateAsync: submitQuoteMutation } = useSubmitQuote();

  useEffect(() => {
    const profileCurrency = supplierProfile?.company?.currencyCode;
    if (profileCurrency) {
      setSupplierCurrency(profileCurrency);
    }
  }, [supplierProfile]);

  useEffect(() => {
    loadBoqDetails();
    loadRfqItems();
  }, [boqId]);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window !== "undefined") {
      localStorage.setItem("supplier_pricing_inputs", JSON.stringify(pricingInputs));
    }
  }, [pricingInputs]);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window !== "undefined") {
      localStorage.setItem("supplier_weld_unit_prices", JSON.stringify(weldUnitPrices));
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
        (section) => section.sectionType === "blank_flanges" && section.items.length > 0,
      );

      const hasFlangesSection = boqDetail.sections.some(
        (section) =>
          (section.sectionType === "flanges" || section.sectionType === "blank_flanges") &&
          section.items.length > 0,
      );

      const bnwSection = boqDetail.sections.find(
        (section) => section.sectionType === "bnw_sets" && section.items.length > 0,
      );

      const valveSection = boqDetail.sections.find(
        (section) => section.sectionType === "valves" && section.items.length > 0,
      );

      const instrumentSections = boqDetail.sections.filter(
        (section) =>
          [
            "instruments",
            "flow_meters",
            "pressure_instruments",
            "level_instruments",
            "temperature_instruments",
          ].includes(section.sectionType) && section.items.length > 0,
      );

      const pumpSections = boqDetail.sections.filter(
        (section) =>
          ["pumps", "pump_parts", "pump_spares", "pump_repairs", "pump_rental"].includes(
            section.sectionType,
          ) && section.items.length > 0,
      );

      const sectionWeldTypes = {
        flangeWeld: false,
        mitreWeld: false,
        teeWeld: false,
        tackWeld: false,
        gussetTeeWeld: false,
        latWeld45Plus: false,
        latWeldUnder45: false,
      };
      const sectionWeldTotals = {
        flangeWeld: 0,
        mitreWeld: 0,
        teeWeld: 0,
        tackWeld: 0,
        gussetTeeWeld: 0,
        latWeld45Plus: 0,
        latWeldUnder45: 0,
      };

      boqDetail.sections.forEach((section) => {
        section.items.forEach((item) => {
          const qty = (() => {
            const rawQty = item.qty;
            return rawQty || 1;
          })();
          if (item.welds?.flangeWeld && item.welds.flangeWeld > 0) {
            sectionWeldTypes.flangeWeld = true;
            sectionWeldTotals.flangeWeld += item.welds.flangeWeld * qty;
          }
          if (item.welds?.mitreWeld && item.welds.mitreWeld > 0) {
            sectionWeldTypes.mitreWeld = true;
            sectionWeldTotals.mitreWeld += item.welds.mitreWeld * qty;
          }
          if (item.welds?.teeWeld && item.welds.teeWeld > 0) {
            sectionWeldTypes.teeWeld = true;
            sectionWeldTotals.teeWeld += item.welds.teeWeld * qty;
          }
          if (item.welds?.gussetTeeWeld && item.welds.gussetTeeWeld > 0) {
            sectionWeldTypes.gussetTeeWeld = true;
            sectionWeldTotals.gussetTeeWeld += item.welds.gussetTeeWeld * qty;
          }
          if (item.welds?.latWeld45Plus && item.welds.latWeld45Plus > 0) {
            sectionWeldTypes.latWeld45Plus = true;
            sectionWeldTotals.latWeld45Plus += item.welds.latWeld45Plus * qty;
          }
          if (item.welds?.latWeldUnder45 && item.welds.latWeldUnder45 > 0) {
            sectionWeldTypes.latWeldUnder45 = true;
            sectionWeldTotals.latWeldUnder45 += item.welds.latWeldUnder45 * qty;
          }
        });
      });

      setWeldTotals((prev) => ({
        flangeWeld: prev.flangeWeld + sectionWeldTotals.flangeWeld,
        mitreWeld: prev.mitreWeld + sectionWeldTotals.mitreWeld,
        teeWeld: prev.teeWeld + sectionWeldTotals.teeWeld,
        tackWeld: prev.tackWeld,
        gussetTeeWeld: prev.gussetTeeWeld + sectionWeldTotals.gussetTeeWeld,
        latWeld45Plus: prev.latWeld45Plus + sectionWeldTotals.latWeld45Plus,
        latWeldUnder45: prev.latWeldUnder45 + sectionWeldTotals.latWeldUnder45,
      }));

      setExtractedSpecs((prev) => {
        let bnwGrade: string | null = null;
        if (bnwSection && bnwSection.items.length > 0) {
          const firstItemDesc = bnwSection.items[0].description.toUpperCase();
          const gradeMatch =
            firstItemDesc.match(/GRADE\s*([\d.]+)/i) || firstItemDesc.match(/GR\s*([\d.]+)/i);
          bnwGrade = gradeMatch ? `Grade ${gradeMatch[1]}` : "Standard";
        }

        const valveTypes: string[] = [];
        if (valveSection) {
          valveSection.items.forEach((item) => {
            const desc = item.description.toUpperCase();
            if (desc.includes("BALL") && !valveTypes.includes("ball_valve"))
              valveTypes.push("ball_valve");
            if (desc.includes("GATE") && !valveTypes.includes("gate_valve"))
              valveTypes.push("gate_valve");
            if (desc.includes("GLOBE") && !valveTypes.includes("globe_valve"))
              valveTypes.push("globe_valve");
            if (desc.includes("BUTTERFLY") && !valveTypes.includes("butterfly_valve"))
              valveTypes.push("butterfly_valve");
            if (desc.includes("CHECK") && !valveTypes.includes("check_valve"))
              valveTypes.push("check_valve");
            if (
              (desc.includes("CONTROL") || desc.includes("ACTUATOR")) &&
              !valveTypes.includes("control_valve")
            )
              valveTypes.push("control_valve");
            if (
              (desc.includes("SAFETY") || desc.includes("RELIEF") || desc.includes("PSV")) &&
              !valveTypes.includes("safety_valve")
            )
              valveTypes.push("safety_valve");
            if (desc.includes("PLUG") && !valveTypes.includes("plug_valve"))
              valveTypes.push("plug_valve");
            if (desc.includes("NEEDLE") && !valveTypes.includes("needle_valve"))
              valveTypes.push("needle_valve");
            if (desc.includes("DIAPHRAGM") && !valveTypes.includes("diaphragm_valve"))
              valveTypes.push("diaphragm_valve");
          });
          if (valveTypes.length === 0) {
            valveTypes.push("general_valve");
          }
        }

        const instrumentTypes: string[] = [];
        instrumentSections.forEach((section) => {
          if (section.sectionType === "flow_meters" && !instrumentTypes.includes("flow_meter")) {
            instrumentTypes.push("flow_meter");
          }
          if (
            section.sectionType === "pressure_instruments" &&
            !instrumentTypes.includes("pressure_instrument")
          ) {
            instrumentTypes.push("pressure_instrument");
          }
          if (
            section.sectionType === "level_instruments" &&
            !instrumentTypes.includes("level_instrument")
          ) {
            instrumentTypes.push("level_instrument");
          }
          if (
            section.sectionType === "temperature_instruments" &&
            !instrumentTypes.includes("temperature_instrument")
          ) {
            instrumentTypes.push("temperature_instrument");
          }
          if (section.sectionType === "instruments") {
            section.items.forEach((item) => {
              const desc = item.description.toUpperCase();
              if (
                (desc.includes("FLOW") || desc.includes("METER")) &&
                !instrumentTypes.includes("flow_meter")
              )
                instrumentTypes.push("flow_meter");
              if (
                (desc.includes("PRESSURE") || desc.includes("PSI") || desc.includes("BAR")) &&
                !instrumentTypes.includes("pressure_instrument")
              )
                instrumentTypes.push("pressure_instrument");
              if (
                (desc.includes("LEVEL") || desc.includes("RADAR") || desc.includes("ULTRASONIC")) &&
                !instrumentTypes.includes("level_instrument")
              )
                instrumentTypes.push("level_instrument");
              if (
                (desc.includes("TEMPERATURE") ||
                  desc.includes("RTD") ||
                  desc.includes("THERMOCOUPLE")) &&
                !instrumentTypes.includes("temperature_instrument")
              )
                instrumentTypes.push("temperature_instrument");
              if (
                (desc.includes("PH") ||
                  desc.includes("CONDUCTIVITY") ||
                  desc.includes("ANALYZER")) &&
                !instrumentTypes.includes("analytical_instrument")
              )
                instrumentTypes.push("analytical_instrument");
            });
            if (instrumentTypes.length === 0 && section.items.length > 0) {
              instrumentTypes.push("general_instrument");
            }
          }
        });

        const pumpTypes: string[] = [];
        pumpSections.forEach((section) => {
          if (section.sectionType === "pumps" && !pumpTypes.includes("new_pump")) {
            pumpTypes.push("new_pump");
          }
          if (section.sectionType === "pump_parts" && !pumpTypes.includes("pump_part")) {
            pumpTypes.push("pump_part");
          }
          if (section.sectionType === "pump_spares" && !pumpTypes.includes("pump_spare")) {
            pumpTypes.push("pump_spare");
          }
          if (section.sectionType === "pump_repairs" && !pumpTypes.includes("pump_repair")) {
            pumpTypes.push("pump_repair");
          }
          if (section.sectionType === "pump_rental" && !pumpTypes.includes("pump_rental")) {
            pumpTypes.push("pump_rental");
          }
          section.items.forEach((item) => {
            const desc = item.description.toUpperCase();
            if (
              (desc.includes("CENTRIFUGAL") || desc.includes("END SUCTION")) &&
              !pumpTypes.includes("centrifugal_pump")
            )
              pumpTypes.push("centrifugal_pump");
            if (
              (desc.includes("SUBMERSIBLE") || desc.includes("BOREHOLE")) &&
              !pumpTypes.includes("submersible_pump")
            )
              pumpTypes.push("submersible_pump");
            if (
              (desc.includes("PROGRESSIVE") || desc.includes("CAVITY") || desc.includes("MONO")) &&
              !pumpTypes.includes("progressive_cavity_pump")
            )
              pumpTypes.push("progressive_cavity_pump");
            if (
              (desc.includes("SLURRY") || desc.includes("WARMAN")) &&
              !pumpTypes.includes("slurry_pump")
            )
              pumpTypes.push("slurry_pump");
            if (desc.includes("DIAPHRAGM") && !pumpTypes.includes("diaphragm_pump"))
              pumpTypes.push("diaphragm_pump");
            if (desc.includes("GEAR") && !pumpTypes.includes("gear_pump"))
              pumpTypes.push("gear_pump");
            if (desc.includes("IMPELLER") && !pumpTypes.includes("impeller"))
              pumpTypes.push("impeller");
            if (desc.includes("SEAL") && !pumpTypes.includes("mechanical_seal"))
              pumpTypes.push("mechanical_seal");
            if (desc.includes("BEARING") && !pumpTypes.includes("bearing_kit"))
              pumpTypes.push("bearing_kit");
            if (desc.includes("WEAR RING") && !pumpTypes.includes("wear_ring"))
              pumpTypes.push("wear_ring");
          });
        });

        return {
          ...prev,
          weldTypes: {
            flangeWeld: (() => {
              const rawFlangeWeld = prev.weldTypes.flangeWeld;
              return rawFlangeWeld || sectionWeldTypes.flangeWeld;
            })(),
            mitreWeld: (() => {
              const rawMitreWeld = prev.weldTypes.mitreWeld;
              return rawMitreWeld || sectionWeldTypes.mitreWeld;
            })(),
            teeWeld: (() => {
              const rawTeeWeld = prev.weldTypes.teeWeld;
              return rawTeeWeld || sectionWeldTypes.teeWeld;
            })(),
            tackWeld: (() => {
              const rawTackWeld = prev.weldTypes.tackWeld;
              return rawTackWeld || sectionWeldTypes.tackWeld;
            })(),
            gussetTeeWeld: (() => {
              const rawGussetTeeWeld = prev.weldTypes.gussetTeeWeld;
              return rawGussetTeeWeld || sectionWeldTypes.gussetTeeWeld;
            })(),
            latWeld45Plus: (() => {
              const rawLatWeld45Plus = prev.weldTypes.latWeld45Plus;
              return rawLatWeld45Plus || sectionWeldTypes.latWeld45Plus;
            })(),
            latWeldUnder45: (() => {
              const rawLatWeldUnder45 = prev.weldTypes.latWeldUnder45;
              return rawLatWeldUnder45 || sectionWeldTypes.latWeldUnder45;
            })(),
          },
          flangeTypes: hasBlankFlangesSection
            ? { ...prev.flangeTypes, blank: true }
            : prev.flangeTypes,
          bnwGrade,
          valveTypes,
          instrumentTypes,
          pumpTypes,
        };
      });
    }
  }, [boqDetail, rfqItems]);

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
      const items = await fetchRfqItems();
      setRfqItems(items);
      const specs = extractUniqueSpecs(items);
      setExtractedSpecs((prev) => ({
        ...specs,
        bnwGrade: prev.bnwGrade,
      }));
    } catch (err) {
      log.error("Failed to load RFQ items:", err);
    } finally {
      setRfqLoading(false);
    }
  };

  const handlePricingInputChange = (
    category:
      | "steelSpecs"
      | "weldTypes"
      | "flangeTypes"
      | "bnwTypes"
      | "valveTypes"
      | "instrumentTypes",
    key: string,
    value: number,
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
    field: "labourExtrasPercent" | "contingenciesPercent",
    value: number,
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
      const data = await fetchBoqDetails();
      setBoqDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BOQ details");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      showToast("Please provide a reason for declining", "warning");
      return;
    }

    try {
      setDecliningLoading(true);
      await declineBoqMutation({ boqId, reason: declineReason });
      setShowDeclineModal(false);
      showToast("BOQ declined successfully", "success");
      loadBoqDetails();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to decline BOQ", "error");
    } finally {
      setDecliningLoading(false);
    }
  };

  const handleSaveProgress = async () => {
    try {
      setSavingProgress(true);
      await saveQuoteProgressMutation({
        boqId,
        data: {
          pricingInputs,
          unitPrices,
          weldUnitPrices,
        },
      });
      showToast("Progress saved successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save progress", "error");
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSubmitQuote = async () => {
    try {
      setSubmittingQuote(true);
      await submitQuoteMutation({
        boqId,
        data: {
          pricingInputs,
          unitPrices,
          weldUnitPrices,
        },
      });
      showToast("Quote submitted successfully", "success");
      loadBoqDetails();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to submit quote", "error");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const exportToExcel = () => {
    if (!boqDetail) return;

    const workbook = XLSX.utils.book_new();

    if (viewMode === "rfq" && rfqItems.length > 0) {
      const headers = [
        "Line #",
        "Type",
        "Description",
        "Qty",
        "NB (mm)",
        "Wall/Sch",
        "End Config",
        "Weight/Unit (kg)",
        "Total Weight (kg)",
        "Notes",
      ];

      const rows = rfqItems.map((item) => {
        const details = (() => {
          const rawStraightPipeDetails = item.straightPipeDetails;
          const rawBendDetails = item.bendDetails;
          const rawFittingDetails = item.fittingDetails;
          return rawStraightPipeDetails || rawBendDetails || rawFittingDetails;
        })();
        const straightNb = item.straightPipeDetails?.nominalBoreMm;
        const bendNb = item.bendDetails?.nominalBoreMm;
        const fittingNb = item.fittingDetails?.nominalDiameterMm;
        const nb = straightNb ? straightNb : bendNb ? bendNb : fittingNb ? fittingNb : "-";
        const wallSch = details?.scheduleNumber
          ? `Sch ${details.scheduleNumber}`
          : details?.wallThicknessMm
            ? `${details.wallThicknessMm}mm`
            : "-";
        const straightEnd = item.straightPipeDetails?.pipeEndConfiguration;
        const bendEnd = item.bendDetails?.bendEndConfiguration;
        const fittingEnd = item.fittingDetails?.pipeEndConfiguration;
        const endConfig = straightEnd
          ? straightEnd
          : bendEnd
            ? bendEnd
            : fittingEnd
              ? fittingEnd
              : "-";
        const weightPerUnit = Number(
          (() => {
            const rawWeightPerUnitKg = item.weightPerUnitKg;
            return rawWeightPerUnitKg || 0;
          })(),
        );
        const totalWeightItem = Number(
          (() => {
            const rawTotalWeightKg = item.totalWeightKg;
            return rawTotalWeightKg || 0;
          })(),
        );
        const notes = item.notes;

        return [
          item.lineNumber,
          item.itemType,
          item.description,
          item.quantity,
          nb,
          wallSch,
          endConfig,
          weightPerUnit.toFixed(2),
          totalWeightItem.toFixed(2),
          notes ? notes : "",
        ];
      });

      const totalWeight = rfqItems.reduce(
        (sum, item) =>
          sum +
          Number(
            (() => {
              const rawTotalWeightKg = item.totalWeightKg;
              return rawTotalWeightKg || 0;
            })(),
          ),
        0,
      );
      rows.push(["", "", "TOTAL", "", "", "", "", "", totalWeight.toFixed(2), ""]);

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 60 },
        { wch: 6 },
        { wch: 8 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(workbook, ws, "RFQ Items");

      const fileName = `RFQ_${boqDetail.boq.boqNumber}_${nowISO().split("T")[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } else {
      boqDetail.sections.forEach((section) => {
        const hasWelds = section.items.some((item) => {
          const welds = item.welds;
          if (!welds) return false;
          const flange = welds.flangeWeld;
          const mitre = welds.mitreWeld;
          const tee = welds.teeWeld;
          const gusset = welds.gussetTeeWeld;
          const lat45 = welds.latWeld45Plus;
          const latUnder = welds.latWeldUnder45;
          return flange || mitre || tee || gusset || lat45 || latUnder;
        });
        const hasAreas = section.items.some((item) => {
          const areas = item.areas;
          if (!areas) return false;
          const intArea = areas.intAreaM2;
          const extArea = areas.extAreaM2;
          return intArea || extArea;
        });

        const headers = ["#", "Description", "Qty", "Unit"];
        if (hasWelds) {
          headers.push(
            "Flange Weld (m)",
            "Mitre Weld (m)",
            "Tee Weld (m)",
            "Gusset Tee Weld (m)",
            "Lat Weld 45+ (m)",
            "Lat Weld <45 (m)",
          );
        }
        if (hasAreas) {
          headers.push("Int Area (m²)", "Ext Area (m²)");
        }
        headers.push("Weight (kg)");

        const rows = section.items.map((item, idx) => {
          const row: (string | number)[] = [idx + 1, item.description, item.qty, item.unit];
          if (hasWelds) {
            row.push(
              item.welds?.flangeWeld ? Number(item.welds.flangeWeld).toFixed(3) : "-",
              item.welds?.mitreWeld ? Number(item.welds.mitreWeld).toFixed(3) : "-",
              item.welds?.teeWeld ? Number(item.welds.teeWeld).toFixed(3) : "-",
              item.welds?.gussetTeeWeld ? Number(item.welds.gussetTeeWeld).toFixed(3) : "-",
              item.welds?.latWeld45Plus ? Number(item.welds.latWeld45Plus).toFixed(3) : "-",
              item.welds?.latWeldUnder45 ? Number(item.welds.latWeldUnder45).toFixed(3) : "-",
            );
          }
          if (hasAreas) {
            row.push(
              item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : "-",
              item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : "-",
            );
          }
          const weightKg = Number(
            (() => {
              const rawWeightKg = item.weightKg;
              return rawWeightKg || 0;
            })(),
          );
          row.push(weightKg.toFixed(2));
          return row;
        });

        const totalWeightIdx = headers.indexOf("Weight (kg)");
        const totalsRow: (string | number)[] = headers.map((_, idx) => {
          if (idx === 1) return "TOTAL";
          if (idx === totalWeightIdx)
            return Number(
              (() => {
                const rawTotalWeightKg = section.totalWeightKg;
                return rawTotalWeightKg || 0;
              })(),
            ).toFixed(2);
          return "";
        });
        rows.push(totalsRow);

        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["!cols"] = [
          { wch: 5 },
          { wch: 50 },
          { wch: 8 },
          { wch: 8 },
          ...Array(headers.length - 4).fill({ wch: 15 }),
        ];

        const sheetName = section.sectionTitle.substring(0, 31).replace(/[\\/*?:[\]]/g, "");
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      });

      const fileName = `BOQ_${boqDetail.boq.boqNumber}_${nowISO().split("T")[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
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
          <div className="text-red-600 mb-4">{error || "BOQ not found"}</div>
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
  const projectName = boqDetail.projectInfo?.name;
  const projectDescription = boqDetail.projectInfo?.description;
  const projectRequiredDate = boqDetail.projectInfo?.requiredDate;
  const customerCompany = boqDetail.customerInfo?.company;
  const customerName = boqDetail.customerInfo?.name;
  const customerEmail = boqDetail.customerInfo?.email;
  const headerProjectName = projectName ? projectName : boqDetail.boq.title;

  return (
    <div className="space-y-6">
      {/* Project & Customer Info - Compact 3-column layout */}
      {(() => {
        const rawProjectInfo = boqDetail.projectInfo;
        return rawProjectInfo || boqDetail.customerInfo;
      })() && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            {/* Row 1 */}
            <div>
              <span className="text-xs font-medium text-gray-500">Project</span>
              <p className="text-sm text-gray-900">{projectName ? projectName : "-"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Description</span>
              <p className="text-sm text-gray-900 truncate">
                {projectDescription ? projectDescription : "-"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Required Date</span>
              <p className="text-sm text-gray-900">
                {projectRequiredDate ? formatDate(projectRequiredDate) : "-"}
              </p>
            </div>
            {/* Row 2 */}
            <div>
              <span className="text-xs font-medium text-gray-500">Customer</span>
              <p className="text-sm text-gray-900">{customerCompany ? customerCompany : "-"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Contact</span>
              <p className="text-sm text-gray-900">{customerName ? customerName : "-"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Email</span>
              <p className="text-sm text-gray-900">
                {customerEmail ? (
                  <a href={`mailto:${customerEmail}`} className="text-blue-600 hover:underline">
                    {customerEmail}
                  </a>
                ) : (
                  "-"
                )}
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
              <Link href="/supplier/portal/boqs" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">{boqDetail.boq.boqNumber}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusStyle.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{headerProjectName}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode(viewMode === "boq" ? "rfq" : "boq")}
              className="inline-flex items-center px-4 py-2 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
              {viewMode === "boq" ? "RFQ View" : "BOQ View"}
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export Excel
            </button>
            {boqDetail.accessStatus !== "declined" && boqDetail.accessStatus !== "quoted" && (
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
      {viewMode === "boq" ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Bill of Quantities ({boqDetail.sections.length} sections)
          </h2>

          <div className="space-y-8">
            {boqDetail.sections.map((section) => {
              const sectionUnitPrices = unitPrices[String(section.id)];
              return (
                <SectionTable
                  key={section.id}
                  section={section}
                  currencyCode={supplierCurrency}
                  unitPrices={sectionUnitPrices ? sectionUnitPrices : {}}
                  onUnitPriceChange={(itemIndex, value) =>
                    handleUnitPriceChange(String(section.id), itemIndex, value)
                  }
                  pricingInputs={pricingInputs}
                  rfqItems={rfqItems}
                />
              );
            })}

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
            RFQ Item Details (
            {rfqItems.length > 0
              ? rfqItems.length
              : boqDetail.sections.reduce((sum, s) => sum + s.items.length, 0)}{" "}
            items)
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
              {savingProgress ? "Saving..." : "Save Progress"}
            </button>
            <button
              onClick={handleSubmitQuote}
              disabled={savingProgress || submittingQuote || boqDetail?.accessStatus === "quoted"}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingQuote ? "Submitting..." : "Submit Quote"}
            </button>
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowDeclineModal(false)}
            />
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
                  {decliningLoading ? "Declining..." : "Confirm Decline"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
