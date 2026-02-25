"use client";

import { useMemo, useState } from "react";
import {
  API_5L_GRADE_LIST,
  API_5L_GRADES,
  type ChemistryData,
  calculateCarbonEquivalent,
  type PslLevel,
  validateApi5lGrade,
} from "@/app/lib/config/rfq/api5lGrades";
import { SOUR_SERVICE_HARDNESS_LIMITS } from "@/app/lib/config/rfq/weldDefectAcceptance";

export interface MtcFormData {
  mtcNumber: string;
  mtcType: "2.1" | "2.2" | "3.1" | "3.2" | null;
  manufacturer: string;
  heatNumber: string;
  lotNumber: string;
  specification: string;
  grade: string;
  size: string;
  quantity: number | null;
  cPct: number | null;
  mnPct: number | null;
  pPct: number | null;
  sPct: number | null;
  siPct: number | null;
  crPct: number | null;
  moPct: number | null;
  niPct: number | null;
  vPct: number | null;
  cuPct: number | null;
  nbPct: number | null;
  tiPct: number | null;
  alPct: number | null;
  nPct: number | null;
  bPct: number | null;
  yieldStrengthMpa: number | null;
  tensileStrengthMpa: number | null;
  elongationPct: number | null;
  reductionAreaPct: number | null;
  impactTestTempC: number | null;
  impactSpecimenSize: string;
  impactValue1J: number | null;
  impactValue2J: number | null;
  impactValue3J: number | null;
  hardnessHrc: number | null;
  hardnessHv: number | null;
  hardnessHb: number | null;
  ndtMethodsPerformed: string[];
  ndtResults: string;
  hydroTestPressureBar: number | null;
  hydroTestResult: "PASSED" | "FAILED" | null;
  pslLevel: PslLevel;
  naceCompliant: boolean;
  dnvCompliant: boolean;
  thirdPartyInspection: boolean;
  inspectorName: string;
  certificateDate: string;
}

const defaultFormData = (): MtcFormData => ({
  mtcNumber: "",
  mtcType: "3.1",
  manufacturer: "",
  heatNumber: "",
  lotNumber: "",
  specification: "API 5L",
  grade: "",
  size: "",
  quantity: null,
  cPct: null,
  mnPct: null,
  pPct: null,
  sPct: null,
  siPct: null,
  crPct: null,
  moPct: null,
  niPct: null,
  vPct: null,
  cuPct: null,
  nbPct: null,
  tiPct: null,
  alPct: null,
  nPct: null,
  bPct: null,
  yieldStrengthMpa: null,
  tensileStrengthMpa: null,
  elongationPct: null,
  reductionAreaPct: null,
  impactTestTempC: null,
  impactSpecimenSize: "10x10",
  impactValue1J: null,
  impactValue2J: null,
  impactValue3J: null,
  hardnessHrc: null,
  hardnessHv: null,
  hardnessHb: null,
  ndtMethodsPerformed: [],
  ndtResults: "",
  hydroTestPressureBar: null,
  hydroTestResult: null,
  pslLevel: "PSL1",
  naceCompliant: false,
  dnvCompliant: false,
  thirdPartyInspection: false,
  inspectorName: "",
  certificateDate: "",
});

export interface MtcDataEntryFormProps {
  initialData?: Partial<MtcFormData>;
  onSubmit: (data: MtcFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function MtcDataEntryForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: MtcDataEntryFormProps) {
  const [formData, setFormData] = useState<MtcFormData>(() => ({
    ...defaultFormData(),
    ...initialData,
  }));

  const [activeSection, setActiveSection] = useState<string>("header");

  const updateField = <K extends keyof MtcFormData>(field: K, value: MtcFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const chemistryData = useMemo((): ChemistryData | null => {
    if (formData.cPct === null || formData.mnPct === null) {
      return null;
    }
    return {
      c: formData.cPct,
      mn: formData.mnPct,
      p: formData.pPct ?? 0,
      s: formData.sPct ?? 0,
      si: formData.siPct ?? undefined,
      cr: formData.crPct ?? undefined,
      mo: formData.moPct ?? undefined,
      v: formData.vPct ?? undefined,
      ni: formData.niPct ?? undefined,
      cu: formData.cuPct ?? undefined,
      nb: formData.nbPct ?? undefined,
      ti: formData.tiPct ?? undefined,
    };
  }, [formData]);

  const carbonEquivalent = useMemo(() => {
    if (!chemistryData) return null;
    return calculateCarbonEquivalent(chemistryData);
  }, [chemistryData]);

  const impactAverage = useMemo(() => {
    const values = [formData.impactValue1J, formData.impactValue2J, formData.impactValue3J].filter(
      (v): v is number => v !== null,
    );
    if (values.length === 0) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }, [formData.impactValue1J, formData.impactValue2J, formData.impactValue3J]);

  const gradeValidation = useMemo(() => {
    if (!formData.grade || !API_5L_GRADES[formData.grade]) return null;
    if (
      formData.yieldStrengthMpa === null ||
      formData.tensileStrengthMpa === null ||
      formData.elongationPct === null
    ) {
      return null;
    }
    const impactMin =
      formData.impactValue1J !== null &&
      formData.impactValue2J !== null &&
      formData.impactValue3J !== null
        ? Math.min(formData.impactValue1J, formData.impactValue2J, formData.impactValue3J)
        : undefined;
    return validateApi5lGrade(
      formData.grade,
      formData.pslLevel,
      {
        yieldStrengthMpa: formData.yieldStrengthMpa,
        tensileStrengthMpa: formData.tensileStrengthMpa,
        elongationPct: formData.elongationPct,
        cvnTempC: formData.impactTestTempC ?? undefined,
        cvnAvgJ: impactAverage ?? undefined,
        cvnMinJ: impactMin,
      },
      chemistryData ?? undefined,
    );
  }, [formData, impactAverage, chemistryData]);

  const hardnessValidation = useMemo(() => {
    const warnings: string[] = [];
    if (formData.naceCompliant) {
      if (
        formData.hardnessHrc !== null &&
        formData.hardnessHrc > SOUR_SERVICE_HARDNESS_LIMITS.maxHrc
      ) {
        warnings.push(
          `HRC ${formData.hardnessHrc} exceeds NACE limit of ${SOUR_SERVICE_HARDNESS_LIMITS.maxHrc}`,
        );
      }
      if (
        formData.hardnessHv !== null &&
        formData.hardnessHv > SOUR_SERVICE_HARDNESS_LIMITS.maxHv
      ) {
        warnings.push(
          `HV ${formData.hardnessHv} exceeds NACE limit of ${SOUR_SERVICE_HARDNESS_LIMITS.maxHv}`,
        );
      }
      if (
        formData.hardnessHb !== null &&
        formData.hardnessHb > SOUR_SERVICE_HARDNESS_LIMITS.maxHb
      ) {
        warnings.push(
          `HB ${formData.hardnessHb} exceeds NACE limit of ${SOUR_SERVICE_HARDNESS_LIMITS.maxHb}`,
        );
      }
    }
    return warnings;
  }, [formData.naceCompliant, formData.hardnessHrc, formData.hardnessHv, formData.hardnessHb]);

  const formErrors = useMemo(() => {
    const errors: string[] = [];
    if (!formData.mtcNumber) errors.push("MTC number is required");
    if (!formData.heatNumber) errors.push("Heat number is required");
    if (!formData.specification) errors.push("Specification is required");
    if (!formData.grade) errors.push("Grade is required");
    if (gradeValidation?.errors) errors.push(...gradeValidation.errors);
    return errors;
  }, [
    formData.mtcNumber,
    formData.heatNumber,
    formData.specification,
    formData.grade,
    gradeValidation,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formErrors.length === 0) {
      onSubmit(formData);
    }
  };

  const toggleNdtMethod = (method: string) => {
    const current = formData.ndtMethodsPerformed;
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    updateField("ndtMethodsPerformed", updated);
  };

  const sections = [
    { id: "header", label: "Certificate Info" },
    { id: "chemistry", label: "Chemistry" },
    { id: "mechanical", label: "Mechanical" },
    { id: "impact", label: "Impact" },
    { id: "hardness", label: "Hardness" },
    { id: "ndt", label: "NDT" },
    { id: "compliance", label: "Compliance" },
  ];

  const ndtMethods = ["RT", "UT", "MT", "PT", "VT"];
  const mtcTypes: Array<{ value: MtcFormData["mtcType"]; label: string }> = [
    { value: "2.1", label: "2.1 - Declaration of compliance" },
    { value: "2.2", label: "2.2 - Test report" },
    { value: "3.1", label: "3.1 - Inspection certificate" },
    { value: "3.2", label: "3.2 - Third party inspection" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Material Test Certificate Entry</h2>
        <p className="text-sm text-blue-100 mt-1">Enter MTC data per EN 10204</p>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === section.id
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeSection === "header" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MTC Number *</label>
                <input
                  type="text"
                  value={formData.mtcNumber}
                  onChange={(e) => updateField("mtcNumber", e.target.value)}
                  placeholder="MTC-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MTC Type</label>
                <select
                  value={formData.mtcType ?? ""}
                  onChange={(e) => updateField("mtcType", e.target.value as MtcFormData["mtcType"])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  {mtcTypes.map((type) => (
                    <option key={type.value} value={type.value ?? ""}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Date
                </label>
                <input
                  type="date"
                  value={formData.certificateDate}
                  onChange={(e) => updateField("certificateDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => updateField("manufacturer", e.target.value)}
                  placeholder="e.g., Tenaris, Vallourec"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heat Number *
                </label>
                <input
                  type="text"
                  value={formData.heatNumber}
                  onChange={(e) => updateField("heatNumber", e.target.value)}
                  placeholder="H12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specification *
                </label>
                <input
                  type="text"
                  value={formData.specification}
                  onChange={(e) => updateField("specification", e.target.value)}
                  placeholder="API 5L, ASTM A106"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                <select
                  value={formData.grade}
                  onChange={(e) => updateField("grade", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select grade...</option>
                  {API_5L_GRADE_LIST.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade} - SMYS {API_5L_GRADES[grade].smysMpa} MPa
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PSL Level</label>
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => updateField("pslLevel", "PSL1")}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      formData.pslLevel === "PSL1"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    PSL1
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("pslLevel", "PSL2")}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                      formData.pslLevel === "PSL2"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    PSL2
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number</label>
                <input
                  type="text"
                  value={formData.lotNumber}
                  onChange={(e) => updateField("lotNumber", e.target.value)}
                  placeholder="LOT-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => updateField("size", e.target.value)}
                  placeholder='6" SCH 40'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity ?? ""}
                  onChange={(e) =>
                    updateField("quantity", e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={1}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "chemistry" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              <ChemistryInput
                label="C %"
                value={formData.cPct}
                onChange={(v) => updateField("cPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="Mn %"
                value={formData.mnPct}
                onChange={(v) => updateField("mnPct", v)}
                step={0.01}
              />
              <ChemistryInput
                label="P %"
                value={formData.pPct}
                onChange={(v) => updateField("pPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="S %"
                value={formData.sPct}
                onChange={(v) => updateField("sPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="Si %"
                value={formData.siPct}
                onChange={(v) => updateField("siPct", v)}
                step={0.01}
              />
              <ChemistryInput
                label="Cr %"
                value={formData.crPct}
                onChange={(v) => updateField("crPct", v)}
                step={0.01}
              />
              <ChemistryInput
                label="Mo %"
                value={formData.moPct}
                onChange={(v) => updateField("moPct", v)}
                step={0.01}
              />
              <ChemistryInput
                label="Ni %"
                value={formData.niPct}
                onChange={(v) => updateField("niPct", v)}
                step={0.01}
              />
              <ChemistryInput
                label="V %"
                value={formData.vPct}
                onChange={(v) => updateField("vPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="Cu %"
                value={formData.cuPct}
                onChange={(v) => updateField("cuPct", v)}
                step={0.01}
              />
              <ChemistryInput
                label="Nb %"
                value={formData.nbPct}
                onChange={(v) => updateField("nbPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="Ti %"
                value={formData.tiPct}
                onChange={(v) => updateField("tiPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="Al %"
                value={formData.alPct}
                onChange={(v) => updateField("alPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="N %"
                value={formData.nPct}
                onChange={(v) => updateField("nPct", v)}
                step={0.001}
              />
              <ChemistryInput
                label="B %"
                value={formData.bPct}
                onChange={(v) => updateField("bPct", v)}
                step={0.0001}
              />
            </div>

            {carbonEquivalent && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Carbon Equivalent (Calculated)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">CE (IIW):</span>
                    <span
                      className={`ml-2 font-medium ${
                        carbonEquivalent.ceqIIW > 0.43 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {carbonEquivalent.ceqIIW.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">CE (Pcm):</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {carbonEquivalent.ceqPcm.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Weldable:</span>
                    <span
                      className={`ml-2 font-medium ${carbonEquivalent.weldable ? "text-green-600" : "text-red-600"}`}
                    >
                      {carbonEquivalent.weldable ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Preheat:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {carbonEquivalent.preheatRequired
                        ? `${carbonEquivalent.preheatTempC}°C`
                        : "Not required"}
                    </span>
                  </div>
                </div>
                {carbonEquivalent.notes && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
                    {carbonEquivalent.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === "mechanical" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yield Strength (MPa)
                </label>
                <input
                  type="number"
                  value={formData.yieldStrengthMpa ?? ""}
                  onChange={(e) =>
                    updateField(
                      "yieldStrengthMpa",
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={1}
                />
                {formData.grade && API_5L_GRADES[formData.grade] && (
                  <p className="text-xs text-gray-500 mt-1">
                    Min SMYS: {API_5L_GRADES[formData.grade].smysMpa} MPa
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tensile Strength (MPa)
                </label>
                <input
                  type="number"
                  value={formData.tensileStrengthMpa ?? ""}
                  onChange={(e) =>
                    updateField(
                      "tensileStrengthMpa",
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={1}
                />
                {formData.grade && API_5L_GRADES[formData.grade] && (
                  <p className="text-xs text-gray-500 mt-1">
                    Min SMTS: {API_5L_GRADES[formData.grade].smtsMpa} MPa
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Elongation (%)
                </label>
                <input
                  type="number"
                  value={formData.elongationPct ?? ""}
                  onChange={(e) =>
                    updateField("elongationPct", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  max={100}
                  step={0.1}
                />
                {formData.grade && API_5L_GRADES[formData.grade] && (
                  <p className="text-xs text-gray-500 mt-1">
                    Min: {API_5L_GRADES[formData.grade].elongationPctMin}%
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reduction of Area (%)
                </label>
                <input
                  type="number"
                  value={formData.reductionAreaPct ?? ""}
                  onChange={(e) =>
                    updateField(
                      "reductionAreaPct",
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "impact" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Temperature (°C)
                </label>
                <input
                  type="number"
                  value={formData.impactTestTempC ?? ""}
                  onChange={(e) =>
                    updateField(
                      "impactTestTempC",
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  step={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specimen Size
                </label>
                <select
                  value={formData.impactSpecimenSize}
                  onChange={(e) => updateField("impactSpecimenSize", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="10x10">10×10 mm (Full size)</option>
                  <option value="10x7.5">10×7.5 mm (3/4 size)</option>
                  <option value="10x5">10×5 mm (1/2 size)</option>
                  <option value="10x2.5">10×2.5 mm (1/4 size)</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">
                CVN Impact Values (Joules)
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value 1</label>
                  <input
                    type="number"
                    value={formData.impactValue1J ?? ""}
                    onChange={(e) =>
                      updateField(
                        "impactValue1J",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min={0}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value 2</label>
                  <input
                    type="number"
                    value={formData.impactValue2J ?? ""}
                    onChange={(e) =>
                      updateField(
                        "impactValue2J",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min={0}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value 3</label>
                  <input
                    type="number"
                    value={formData.impactValue3J ?? ""}
                    onChange={(e) =>
                      updateField(
                        "impactValue3J",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min={0}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Average</label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-800 font-medium">
                    {impactAverage !== null ? `${impactAverage} J` : "-"}
                  </div>
                </div>
              </div>
              {formData.pslLevel === "PSL2" && formData.grade && API_5L_GRADES[formData.grade] && (
                <p className="text-xs text-gray-500 mt-2">
                  PSL2 requires: Avg ≥{API_5L_GRADES[formData.grade].cvnAvgJ}J, Min ≥
                  {API_5L_GRADES[formData.grade].cvnMinJ}J at{" "}
                  {API_5L_GRADES[formData.grade].cvnTempC}°C
                </p>
              )}
            </div>
          </div>
        )}

        {activeSection === "hardness" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hardness HRC</label>
                <input
                  type="number"
                  value={formData.hardnessHrc ?? ""}
                  onChange={(e) =>
                    updateField("hardnessHrc", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  max={70}
                  step={0.1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hardness HV</label>
                <input
                  type="number"
                  value={formData.hardnessHv ?? ""}
                  onChange={(e) =>
                    updateField("hardnessHv", e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  max={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hardness HB</label>
                <input
                  type="number"
                  value={formData.hardnessHb ?? ""}
                  onChange={(e) =>
                    updateField("hardnessHb", e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  max={700}
                />
              </div>
            </div>

            {formData.naceCompliant && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">
                  NACE MR0175 Hardness Limits (Sour Service)
                </h4>
                <div className="flex gap-4 text-xs text-amber-700">
                  <span>Max HRC: {SOUR_SERVICE_HARDNESS_LIMITS.maxHrc}</span>
                  <span>Max HV: {SOUR_SERVICE_HARDNESS_LIMITS.maxHv}</span>
                  <span>Max HB: {SOUR_SERVICE_HARDNESS_LIMITS.maxHb}</span>
                </div>
              </div>
            )}

            {hardnessValidation.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <ul className="text-sm text-red-700 space-y-1">
                  {hardnessValidation.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeSection === "ndt" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NDT Methods Performed
              </label>
              <div className="flex flex-wrap gap-2">
                {ndtMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => toggleNdtMethod(method)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      formData.ndtMethodsPerformed.includes(method)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                RT = Radiographic, UT = Ultrasonic, MT = Magnetic Particle, PT = Penetrant, VT =
                Visual
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NDT Results Summary
              </label>
              <textarea
                value={formData.ndtResults}
                onChange={(e) => updateField("ndtResults", e.target.value)}
                rows={3}
                placeholder="e.g., No defects found, all welds acceptable per API 1104"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hydro Test Pressure (bar)
                </label>
                <input
                  type="number"
                  value={formData.hydroTestPressureBar ?? ""}
                  onChange={(e) =>
                    updateField(
                      "hydroTestPressureBar",
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={0.1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hydro Test Result
                </label>
                <select
                  value={formData.hydroTestResult ?? ""}
                  onChange={(e) =>
                    updateField(
                      "hydroTestResult",
                      e.target.value ? (e.target.value as "PASSED" | "FAILED") : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select result...</option>
                  <option value="PASSED">PASSED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeSection === "compliance" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={formData.naceCompliant}
                  onChange={(e) => updateField("naceCompliant", e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">NACE MR0175</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={formData.dnvCompliant}
                  onChange={(e) => updateField("dnvCompliant", e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">DNV Compliant</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={formData.thirdPartyInspection}
                  onChange={(e) => updateField("thirdPartyInspection", e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Third Party Inspection</span>
              </label>
            </div>

            {formData.thirdPartyInspection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspector Name
                </label>
                <input
                  type="text"
                  value={formData.inspectorName}
                  onChange={(e) => updateField("inspectorName", e.target.value)}
                  placeholder="e.g., TUV, Lloyd's, Bureau Veritas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {formData.pslLevel === "PSL2" && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <h4 className="text-sm font-semibold text-green-800 mb-1">PSL2 Requirements</h4>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>100% NDT coverage required</li>
                  <li>CVN impact testing mandatory</li>
                  <li>Full heat traceability required</li>
                  <li>Tighter chemistry limits apply</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {gradeValidation &&
          (gradeValidation.errors.length > 0 || gradeValidation.warnings.length > 0) && (
            <div className="mt-4 space-y-2">
              {gradeValidation.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Validation Errors</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {gradeValidation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {gradeValidation.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">Warnings</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {gradeValidation.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
      </div>

      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div>
          {formErrors.length > 0 && (
            <p className="text-sm text-red-600">{formErrors.length} error(s) need attention</p>
          )}
        </div>
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || formErrors.length > 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Certificate"}
          </button>
        </div>
      </div>
    </form>
  );
}

interface ChemistryInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
}

function ChemistryInput({ label, value, onChange, step = 0.01 }: ChemistryInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
        min={0}
        max={100}
        step={step}
      />
    </div>
  );
}
