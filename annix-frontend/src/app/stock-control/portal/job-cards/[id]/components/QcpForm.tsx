"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CoatingAnalysis,
  InterventionType,
  QcControlPlanRecord,
  QcpActivity,
  QcpApprovalSignature,
  QcpApprovalStatus,
  QcpApprovalTokenRecord,
  QcpPartySignOff,
  QcpPlanType,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { nowISO } from "@/app/lib/datetime";
import { InitialsPad } from "@/app/stock-control/components/InitialsPad";
import { SignaturePad } from "@/app/stock-control/components/SignaturePad";

interface QcpFormProps {
  jobCardId: number;
  existingPlan: QcControlPlanRecord | null;
  onSaved: () => void;
  onCancel: () => void;
}

const PLAN_TYPE_LABELS: Record<QcpPlanType, string> = {
  paint_external: "Paint External",
  paint_internal: "Paint Internal",
  rubber: "Rubber Lining",
  hdpe: "HDPE Lining",
};

const PLAN_TYPE_DOC_REFS: Record<QcpPlanType, string> = {
  paint_external: "QD_PLS_11",
  paint_internal: "QD_PLS_11",
  rubber: "QD_PLS_07",
  hdpe: "QD_PLS_07",
};

const INTERVENTION_LABELS: Record<InterventionType, string> = {
  H: "Hold",
  I: "Inspection",
  W: "Witness",
  R: "Review",
  S: "Surveillance",
  V: "Verify",
};

const BLAST_SPEC_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "SA3 BLAST ISO 8501-1", label: "SA3 BLAST" },
  { value: "SA2.5 BLAST ISO 8501-1", label: "SA2.5 BLAST" },
  { value: "SA2 BLAST ISO 8501-1", label: "SA2 BLAST" },
  { value: "SA1 BLAST ISO 8501-1", label: "SA1 BLAST" },
  { value: "BLAST ISO 8501-1", label: "BLAST" },
  { value: "HAND TOOL PREP ST3", label: "HAND TOOL" },
  { value: "POWER TOOL PREP ST3", label: "POWER TOOL" },
  { value: "NO BLASTING", label: "NO BLASTING" },
];

function isBlastingRow(description: string): boolean {
  const lower = description.toLowerCase();
  return lower.includes("blast") || lower === "surface preparation";
}

const INTERVENTION_TYPES: InterventionType[] = ["H", "I", "W", "R", "S", "V"];

const PARTIES = ["PLS", "MPS", "Client", "3rd Party"] as const;
type PartyKey = "pls" | "mps" | "client" | "thirdParty";
const PARTY_KEYS: PartyKey[] = ["pls", "mps", "client", "thirdParty"];

function emptyPartySignOff(): QcpPartySignOff {
  return { interventionType: null, initial: null, name: null, signatureUrl: null, date: null };
}

function holdSignOff(): QcpPartySignOff {
  return { interventionType: "H", initial: null, name: null, signatureUrl: null, date: null };
}

function typedSignOff(type: InterventionType): QcpPartySignOff {
  return { interventionType: type, initial: null, name: null, signatureUrl: null, date: null };
}

function emptyActivity(opNum: number): QcpActivity {
  return {
    operationNumber: opNum,
    description: "",
    specification: null,
    procedureRequired: null,
    documentation: null,
    pls: emptyPartySignOff(),
    mps: emptyPartySignOff(),
    client: emptyPartySignOff(),
    thirdParty: emptyPartySignOff(),
    remarks: null,
  };
}

function buildAct(
  opNum: number,
  desc: string,
  spec: string | null,
  doc: string | null,
  pls?: QcpPartySignOff,
  mps?: QcpPartySignOff,
  client?: QcpPartySignOff,
  tp?: QcpPartySignOff,
): QcpActivity {
  return {
    operationNumber: opNum,
    description: desc,
    specification: spec,
    procedureRequired: null,
    documentation: doc,
    pls: pls || holdSignOff(),
    mps: mps || emptyPartySignOff(),
    client: client || emptyPartySignOff(),
    thirdParty: tp || emptyPartySignOff(),
    remarks: null,
  };
}

function paintTemplate(): QcpActivity[] {
  return [
    buildAct(1, "Approval of QCP", null, "QD_PLS_11", holdSignOff(), typedSignOff("H")),
    buildAct(
      2,
      "Weather Conditions",
      "HUMIDITY: less than 85%",
      "QD_PLS_10",
      holdSignOff(),
      typedSignOff("V"),
    ),
    buildAct(
      3,
      "Calibration Certificates",
      "CALIBRATION CERTIFICATES",
      "CALIBRATION CERTIFICATES",
      holdSignOff(),
      typedSignOff("R"),
    ),
    buildAct(
      4,
      "Verification of Paints Used",
      "BATCH CERTIFICATES",
      "BATCH CERTIFICATES",
      holdSignOff(),
      typedSignOff("R"),
    ),
    buildAct(
      5,
      "Visual Inspection on Items",
      "QD_PLS_16",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
    ),
    buildAct(
      6,
      "Blasting",
      "SA2.5 BLAST ISO 8501-1",
      "RECORD READINGS",
      holdSignOff(),
      typedSignOff("S"),
    ),
    buildAct(7, "Primer Coat", null, "RECORD READINGS", holdSignOff(), typedSignOff("S")),
    buildAct(8, "Topcoat", null, "RECORD READINGS", holdSignOff(), typedSignOff("S")),
    buildAct(9, "Total DFTs", null, "RECORD READINGS", holdSignOff(), typedSignOff("S")),
    buildAct(
      10,
      "Final Release",
      "CLIENT INSPECTION",
      "CLIENT RELEASE",
      holdSignOff(),
      typedSignOff("H"),
    ),
    buildAct(
      11,
      "Data Book Inspection",
      "REVIEW DATA",
      "REVIEW DATA",
      holdSignOff(),
      typedSignOff("H"),
    ),
  ];
}

function rubberTemplate(): QcpActivity[] {
  return [
    buildAct(
      1,
      "Obtain Approval of QCP",
      null,
      "QC Document",
      holdSignOff(),
      typedSignOff("H"),
      typedSignOff("H"),
      typedSignOff("H"),
    ),
    buildAct(
      2,
      "Check Cleanliness",
      "SANS 1201-2005",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      3,
      "Blasting",
      "SA3 BLAST ISO 8501-1",
      "RECORD READINGS",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      4,
      "Hero Bond 080",
      "CERTIFICATE OF ANALYSIS",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      5,
      "Hero Bond 082",
      "CERTIFICATE OF ANALYSIS",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      6,
      "TY Bond 086",
      "CERTIFICATE OF ANALYSIS",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      7,
      "TBC",
      "CERTIFICATE OF ANALYSIS",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("V"),
      typedSignOff("V"),
      typedSignOff("V"),
    ),
    buildAct(
      8,
      "Pre cure Inspection",
      "SANS 1201-2005",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      9,
      "Cure",
      "SANS 1201-2005",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      10,
      "Buff",
      "SANS 1201-2005",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("S"),
      typedSignOff("S"),
      typedSignOff("S"),
    ),
    buildAct(
      11,
      "Spark Test",
      "SANS 1201-2005",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("H"),
      typedSignOff("H"),
      typedSignOff("H"),
    ),
    buildAct(
      12,
      "Hardness",
      "SANS 1201-2005",
      "Data Records",
      holdSignOff(),
      typedSignOff("H"),
      typedSignOff("H"),
      typedSignOff("H"),
    ),
    buildAct(
      13,
      "Test plate Results",
      "SANS 1201-2005",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("H"),
      typedSignOff("H"),
      typedSignOff("H"),
    ),
    buildAct(
      14,
      "Final Inspection",
      "SANS 1201-2005",
      "QD_PLS_16",
      holdSignOff(),
      typedSignOff("H"),
      typedSignOff("H"),
      typedSignOff("H"),
    ),
    buildAct(
      15,
      "Humidity Documents",
      "SANS 1201-2005",
      "Data Records",
      holdSignOff(),
      typedSignOff("V"),
      typedSignOff("V"),
      typedSignOff("V"),
    ),
    buildAct(
      16,
      "Databook sign off",
      null,
      "Data Book",
      holdSignOff(),
      typedSignOff("H"),
      typedSignOff("H"),
      typedSignOff("H"),
    ),
  ];
}

function hdpeTemplate(): QcpActivity[] {
  const steps = [
    "Receive & inspect items",
    "Surface preparation",
    "HDPE sheet preparation and cutting",
    "Welding / fabrication",
    "Weld test (destructive/non-destructive)",
    "Visual inspection",
    "Spark test",
    "Final release",
  ];
  return steps.map((desc, i) => ({
    ...emptyActivity(i + 1),
    description: desc,
  }));
}

function templateForType(type: QcpPlanType): QcpActivity[] {
  if (type === "paint_external" || type === "paint_internal") return paintTemplate();
  if (type === "rubber") return rubberTemplate();
  return hdpeTemplate();
}

const APPROVAL_STATUS_CONFIG: Record<QcpApprovalStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  pending_mps: { label: "Pending Customer", color: "bg-cyan-100 text-cyan-800" },
  pending_client: { label: "Pending Client", color: "bg-blue-100 text-blue-800" },
  pending_third_party: { label: "Pending 3rd Party", color: "bg-indigo-100 text-indigo-800" },
  changes_requested: { label: "Changes Requested", color: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
};

function ApprovalStatusBadge(props: { status: QcpApprovalStatus }) {
  const config = APPROVAL_STATUS_CONFIG[props.status] || APPROVAL_STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export function QcpForm({ jobCardId, existingPlan, onSaved, onCancel }: QcpFormProps) {
  const isEditing = existingPlan !== null;

  const [planType, setPlanType] = useState<QcpPlanType>(existingPlan?.planType || "paint_external");
  const [qcpNumber, setQcpNumber] = useState(existingPlan?.qcpNumber || "");
  const [documentRef, setDocumentRef] = useState(
    existingPlan?.documentRef || PLAN_TYPE_DOC_REFS[existingPlan?.planType || "paint_external"],
  );
  const [revision, setRevision] = useState(existingPlan?.revision || "01");
  const [customerName, setCustomerName] = useState(existingPlan?.customerName || "");
  const [orderNumber, setOrderNumber] = useState(existingPlan?.orderNumber || "");
  const [jobNumber, setJobNumber] = useState(existingPlan?.jobNumber || "");
  const [jobName, setJobName] = useState(existingPlan?.jobName || "");
  const [specification, setSpecification] = useState(existingPlan?.specification || "");
  const [activities, setActivities] = useState<QcpActivity[]>(
    existingPlan?.activities?.length ? existingPlan.activities : templateForType("paint_external"),
  );
  const [approvalSignatures, setApprovalSignatures] = useState<QcpApprovalSignature[]>(
    existingPlan?.approvalSignatures?.length
      ? existingPlan.approvalSignatures
      : (["PLS", "MPS", "Client", "3rd Party"] as const).map((p) => ({
          party: p,
          name: null,
          signatureUrl: null,
          date: null,
        })),
  );
  const [clientEmail, setClientEmail] = useState(existingPlan?.clientEmail || "");
  const [approvalStatus, setApprovalStatus] = useState<QcpApprovalStatus>(
    (existingPlan?.approvalStatus as QcpApprovalStatus) || "draft",
  );
  const [approvalHistory, setApprovalHistory] = useState<QcpApprovalTokenRecord[]>([]);
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [line1InitialError, setLine1InitialError] = useState(false);
  const line1InitialRef = useRef<HTMLButtonElement>(null);
  const [initialsTarget, setInitialsTarget] = useState<{
    activityIdx: number;
    party: PartyKey;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingPartyIndex, setSigningPartyIndex] = useState<number | null>(null);
  const [signingActivityKey, setSigningActivityKey] = useState<{
    activityIndex: number;
    party: PartyKey;
  } | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");

  const visiblePartyKeys: PartyKey[] = existingPlan?.activeParties
    ? PARTY_KEYS.filter((k) => (existingPlan.activeParties as string[]).includes(k))
    : PARTY_KEYS;
  const visiblePartyLabels: string[] = visiblePartyKeys.map((k) => PARTIES[PARTY_KEYS.indexOf(k)]);

  useEffect(() => {
    stockControlApiClient
      .currentUser()
      .then((user) => {
        if (user?.name) {
          setCurrentUserName(user.name);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEditing || !existingPlan) return;
    stockControlApiClient
      .controlPlanApprovalHistory(jobCardId, existingPlan.id)
      .then(setApprovalHistory)
      .catch(() => {});
  }, [isEditing, existingPlan, jobCardId]);

  useEffect(() => {
    if (isEditing || !customerName) return;
    stockControlApiClient
      .customerQcpPreferences(customerName)
      .then((data) => {
        if (data.email && !clientEmail) {
          setClientEmail(data.email);
        }
      })
      .catch(() => {});
  }, [customerName, isEditing]);

  useEffect(() => {
    const loadJobCardData = async () => {
      try {
        const [jobCard, coatingAnalysis] = await Promise.all([
          stockControlApiClient.jobCardById(jobCardId),
          stockControlApiClient.jobCardCoatingAnalysis(jobCardId),
        ]);

        setJobNumber(jobCard.jobNumber || "");

        if (isEditing) {
          if (!existingPlan?.jobName || existingPlan.jobName.startsWith(`${jobCard.jobNumber} -`)) {
            setJobName(jobCard.jobName || "");
          }
        } else {
          setCustomerName(jobCard.customerName || "");
          setOrderNumber(jobCard.poNumber || "");
          setJobName(jobCard.jobName || "");

          if (coatingAnalysis && coatingAnalysis.status === "accepted") {
            populateFromCoating(planType, coatingAnalysis);
          }
        }
      } catch {
        // Non-critical — user can fill in manually
      }
    };
    loadJobCardData();
  }, [jobCardId, isEditing, planType]);

  const populateFromCoating = useCallback((type: QcpPlanType, coating: CoatingAnalysis) => {
    if (type === "paint_external" || type === "paint_internal") {
      const area = type === "paint_external" ? "external" : "internal";
      const relevantCoats = coating.coats.filter((c) => c.area === area);
      if (relevantCoats.length > 0) {
        const specParts = relevantCoats.map((c) => {
          const dft =
            c.minDftUm && c.maxDftUm && c.minDftUm !== c.maxDftUm
              ? `${c.minDftUm}-${c.maxDftUm}`
              : `${c.maxDftUm || c.minDftUm}`;
          return `${c.product} (${dft} μm DFT)`;
        });
        setSpecification(specParts.join("; "));
      }
      if (coating.surfacePrep) {
        const prepLabels: Record<string, string> = {
          blast: "Abrasive blasting",
          sa3_blast: "SA 3 Abrasive blasting",
          hand_tool: "Hand tool preparation",
          power_tool: "Power tool preparation",
        };
        const prepLabel = prepLabels[coating.surfacePrep] || coating.surfacePrep;
        setActivities((prev) =>
          prev.map((a) =>
            a.description.toLowerCase().includes("surface preparation")
              ? { ...a, specification: prepLabel }
              : a,
          ),
        );
      }
    }
  }, []);

  const handlePlanTypeChange = useCallback(
    (newType: QcpPlanType) => {
      setPlanType(newType);
      setDocumentRef(PLAN_TYPE_DOC_REFS[newType]);
      if (!isEditing) {
        setActivities(templateForType(newType));
      }
    },
    [isEditing],
  );

  const updateActivity = useCallback(
    (index: number, field: keyof QcpActivity, value: string | number | null) => {
      setActivities((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
    },
    [],
  );

  const updateActivityIntervention = useCallback(
    (index: number, party: PartyKey, type: InterventionType | null) => {
      setActivities((prev) =>
        prev.map((a, i) =>
          i === index ? { ...a, [party]: { ...a[party], interventionType: type } } : a,
        ),
      );
    },
    [],
  );

  const updateActivityInitial = useCallback(
    (index: number, party: PartyKey, initial: string | null) => {
      setActivities((prev) =>
        prev.map((a, i) => (i === index ? { ...a, [party]: { ...a[party], initial } } : a)),
      );
      if (index === 0 && party === "pls" && initial) {
        setLine1InitialError(false);
      }
    },
    [],
  );

  const handleActivitySignOff = useCallback(
    (index: number, party: PartyKey) => {
      setActivities((prev) =>
        prev.map((a, i) =>
          i === index
            ? {
                ...a,
                [party]: {
                  ...a[party],
                  name: currentUserName || null,
                  date: nowISO().slice(0, 10),
                },
              }
            : a,
        ),
      );
      setSigningActivityKey({ activityIndex: index, party });
    },
    [currentUserName],
  );

  const handleActivitySignatureSave = useCallback(
    (dataUrl: string) => {
      if (signingActivityKey === null) return;
      const { activityIndex, party } = signingActivityKey;
      setActivities((prev) =>
        prev.map((a, i) =>
          i === activityIndex ? { ...a, [party]: { ...a[party], signatureUrl: dataUrl } } : a,
        ),
      );
      setSigningActivityKey(null);
    },
    [signingActivityKey],
  );

  const addActivity = useCallback(() => {
    setActivities((prev) => [...prev, emptyActivity(prev.length + 1)]);
  }, []);

  const removeActivity = useCallback((index: number) => {
    setActivities((prev) =>
      prev.filter((_, i) => i !== index).map((a, i) => ({ ...a, operationNumber: i + 1 })),
    );
  }, []);

  const handleApprovalSignOff = useCallback(
    (index: number) => {
      setApprovalSignatures((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, name: currentUserName || null, date: nowISO().slice(0, 10) } : s,
        ),
      );
      setSigningPartyIndex(index);
    },
    [currentUserName],
  );

  const handleApprovalSignatureSave = useCallback(
    (dataUrl: string) => {
      if (signingPartyIndex === null) return;
      setApprovalSignatures((prev) =>
        prev.map((s, i) => (i === signingPartyIndex ? { ...s, signatureUrl: dataUrl } : s)),
      );
      setSigningPartyIndex(null);
    },
    [signingPartyIndex],
  );

  const savePayload = async (): Promise<void> => {
    const payload: Partial<QcControlPlanRecord> = {
      planType,
      qcpNumber: qcpNumber || null,
      documentRef: documentRef || null,
      revision: revision || null,
      customerName: customerName || null,
      orderNumber: orderNumber || null,
      jobNumber: jobNumber || null,
      jobName: jobName || null,
      specification: specification || null,
      itemDescription: null,
      activities: activities.filter((a) => a.description.trim() !== ""),
      approvalSignatures,
    };

    if (isEditing && existingPlan) {
      await stockControlApiClient.updateControlPlan(jobCardId, existingPlan.id, payload);
    } else {
      await stockControlApiClient.createControlPlan(jobCardId, payload);
    }
  };

  const handleSendForApproval = async () => {
    if (!clientEmail.trim()) {
      setError("Please enter a customer email address");
      return;
    }
    if (!existingPlan) return;

    const firstActivity = activities[0];
    const plsInitial = firstActivity?.pls?.initial;
    if (!plsInitial) {
      setLine1InitialError(true);
      line1InitialRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setLine1InitialError(false);

    const blastRows = activities.filter((a) => isBlastingRow(a.description));
    const missingBlast = blastRows.some((a) => !a.specification);
    if (missingBlast) {
      setError(
        "Please select a blast profile for all blasting activities before sending for approval",
      );
      return;
    }

    try {
      setIsSendingApproval(true);
      setError(null);
      await savePayload();
      await stockControlApiClient.sendControlPlanForApproval(
        jobCardId,
        existingPlan.id,
        clientEmail.trim(),
      );
      setApprovalStatus("pending_mps");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send for approval");
    } finally {
      setIsSendingApproval(false);
    }
  };

  const handleCancelApproval = async () => {
    if (!existingPlan) return;
    try {
      setError(null);
      await stockControlApiClient.cancelControlPlanApproval(jobCardId, existingPlan.id);
      setApprovalStatus("draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel approval");
    }
  };

  const handleResendApproval = async (partyRole: "mps" | "client" | "third_party") => {
    if (!existingPlan) return;
    try {
      setIsSendingApproval(true);
      setError(null);
      await stockControlApiClient.resendControlPlanApproval(jobCardId, existingPlan.id, partyRole);
      const statusMap: Record<string, QcpApprovalStatus> = {
        mps: "pending_mps",
        client: "pending_client",
        third_party: "pending_third_party",
      };
      setApprovalStatus(statusMap[partyRole] || "pending_mps");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend approval");
    } finally {
      setIsSendingApproval(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await savePayload();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save control plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {isEditing ? "Edit" : "New"} Quality Control Plan
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Plan Type</label>
          <select
            value={planType}
            onChange={(e) => handlePlanTypeChange(e.target.value as QcpPlanType)}
            disabled={isEditing}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          >
            {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">QCP Number</label>
          <input
            type="text"
            value={qcpNumber || "Auto-generated on save"}
            readOnly
            className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Document Ref</label>
          <input
            type="text"
            value={documentRef}
            readOnly
            className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Revision</label>
          <input
            type="text"
            value={revision}
            readOnly
            className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Job Number</label>
          <input
            type="text"
            value={jobNumber}
            readOnly
            className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Customer</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Order Number</label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Job Name</label>
          <input
            type="text"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Specification</label>
        <input
          type="text"
          value={specification}
          onChange={(e) => setSpecification(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="Coating/lining specification"
        />
      </div>

      <div className="border-b border-gray-200 pb-1 pt-4">
        <h4 className="text-sm font-semibold text-gray-900">Activities & Intervention Matrix</h4>
        <p className="mt-0.5 text-xs text-gray-500">
          H = Hold, I = Inspection, W = Witness, R = Review, S = Surveillance, V = Verify
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Op
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Description
              </th>
              <th className="w-32 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Spec / Procedure
              </th>
              <th className="w-28 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Documentation
              </th>
              {visiblePartyLabels.map((party) => (
                <th
                  key={party}
                  className="w-24 px-1 py-2 text-center text-xs font-medium uppercase text-gray-500"
                >
                  <div>{party}</div>
                  <div className="mt-0.5 flex justify-center gap-1 text-[10px] font-normal normal-case text-gray-400">
                    <span>Type</span>
                    <span>Initial</span>
                  </div>
                </th>
              ))}
              <th className="w-14 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activities.map((activity, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 text-center font-medium text-gray-700">
                  <input
                    type="number"
                    value={activity.operationNumber}
                    onChange={(e) => {
                      const newNum = parseInt(e.target.value, 10);
                      if (Number.isNaN(newNum)) return;
                      updateActivity(idx, "operationNumber", newNum);
                    }}
                    onBlur={() => {
                      setActivities((prev) =>
                        [...prev].sort((a, b) => a.operationNumber - b.operationNumber),
                      );
                    }}
                    className="w-10 rounded border border-gray-300 px-1 py-1 text-center text-sm"
                    min={1}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={activity.description}
                    onChange={(e) => updateActivity(idx, "description", e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Activity description"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {isBlastingRow(activity.description) ? (
                    <select
                      value={activity.specification || ""}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        updateActivity(idx, "specification", val);
                        if (val === "NO BLASTING") {
                          updateActivity(idx, "description", "Surface Preparation");
                          updateActivity(idx, "documentation", "N/A");
                        } else if (
                          activity.description === "Surface Preparation" &&
                          val &&
                          val !== "NO BLASTING"
                        ) {
                          updateActivity(idx, "description", "Blasting");
                          updateActivity(idx, "documentation", "RECORD READINGS");
                        }
                      }}
                      disabled={approvalStatus === "approved"}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                    >
                      <option value="">Select...</option>
                      {BLAST_SPEC_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={activity.specification || ""}
                      onChange={(e) => updateActivity(idx, "specification", e.target.value || null)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Spec ref"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={activity.documentation || ""}
                    onChange={(e) => updateActivity(idx, "documentation", e.target.value || null)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Doc ref"
                  />
                </td>
                {visiblePartyKeys.map((partyKey) => {
                  const signOff = activity[partyKey] || emptyPartySignOff();
                  return (
                    <td key={partyKey} className="px-1 py-1.5">
                      <div className="flex items-center gap-1">
                        <select
                          value={signOff.interventionType || ""}
                          onChange={(e) =>
                            updateActivityIntervention(
                              idx,
                              partyKey,
                              (e.target.value as InterventionType) || null,
                            )
                          }
                          title={
                            signOff.interventionType
                              ? `${signOff.interventionType} - ${INTERVENTION_LABELS[signOff.interventionType]}`
                              : ""
                          }
                          className="w-11 overflow-hidden text-ellipsis rounded border border-gray-300 px-0.5 py-1 text-center text-xs"
                        >
                          <option value="">-</option>
                          {INTERVENTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t} - {INTERVENTION_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          ref={idx === 0 && partyKey === "pls" ? line1InitialRef : undefined}
                          onClick={() => setInitialsTarget({ activityIdx: idx, party: partyKey })}
                          className={`w-12 rounded border px-1 py-1 text-center text-xs ${line1InitialError && idx === 0 && partyKey === "pls" ? "border-2 border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200" : signOff.initial ? "border-teal-300 bg-teal-50 font-medium text-teal-800" : "border-gray-300 text-gray-400 hover:border-teal-400 hover:bg-teal-50"}`}
                          title="Initial"
                        >
                          {signOff.initial || "init"}
                        </button>
                        {line1InitialError && idx === 0 && partyKey === "pls" && (
                          <p className="mt-0.5 text-[10px] leading-tight text-red-600">
                            Must initial before sending
                          </p>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center">
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      X
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addActivity}
        className="text-xs font-medium text-teal-600 hover:text-teal-800"
      >
        + Add Activity
      </button>

      {signingActivityKey !== null && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs text-gray-600">
            Sign off: Activity {activities[signingActivityKey.activityIndex]?.operationNumber} —{" "}
            {signingActivityKey.party.toUpperCase()}
          </p>
          <SignaturePad
            onSave={handleActivitySignatureSave}
            onCancel={() => setSigningActivityKey(null)}
            width={360}
            height={120}
          />
        </div>
      )}

      <div className="border-b border-gray-200 pb-1 pt-4">
        <h4 className="text-sm font-semibold text-gray-900">Approval Signatures</h4>
      </div>

      <div className={`grid grid-cols-${visiblePartyKeys.length} gap-4`}>
        {approvalSignatures
          .filter((sig) => {
            const keyMap: Record<string, PartyKey> = {
              PLS: "pls",
              MPS: "mps",
              Client: "client",
              "3rd Party": "thirdParty",
            };
            return visiblePartyKeys.includes(keyMap[sig.party]);
          })
          .map((sig, idx) => (
            <div key={idx} className="rounded border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-700">{sig.party}</p>
              {sig.name ? (
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">{sig.name}</p>
                  {sig.date && <p className="text-xs text-gray-500">{sig.date}</p>}
                  {sig.signatureUrl && (
                    <img
                      src={sig.signatureUrl}
                      alt="Signature"
                      className="h-10 rounded border border-gray-200 bg-white p-0.5"
                    />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApprovalSignOff(idx)}
                  className="text-xs text-teal-600 hover:text-teal-800"
                >
                  Sign & approve
                </button>
              )}
            </div>
          ))}
      </div>

      {signingPartyIndex !== null && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs text-gray-600">
            Approval signature: {approvalSignatures[signingPartyIndex]?.party}
          </p>
          <SignaturePad
            onSave={handleApprovalSignatureSave}
            onCancel={() => setSigningPartyIndex(null)}
            width={360}
            height={120}
          />
        </div>
      )}

      {isEditing && (
        <div className="border-b border-gray-200 pb-1 pt-4">
          <h4 className="text-sm font-semibold text-gray-900">External Approval</h4>
        </div>
      )}

      {isEditing && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ApprovalStatusBadge status={approvalStatus} />
            {existingPlan && existingPlan.version > 1 && (
              <span className="text-xs text-gray-500">Version {existingPlan.version}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700">Customer Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="customer@example.com"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                disabled={
                  approvalStatus === "pending_mps" ||
                  approvalStatus === "pending_client" ||
                  approvalStatus === "pending_third_party"
                }
              />
            </div>
            {approvalStatus === "draft" || approvalStatus === "changes_requested" ? (
              <button
                type="button"
                onClick={handleSendForApproval}
                disabled={isSendingApproval || !clientEmail.trim()}
                className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSendingApproval ? "Sending..." : "Save & Send for Approval"}
              </button>
            ) : (
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelApproval}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel Approval
                </button>
                <button
                  type="button"
                  onClick={() => handleResendApproval("mps")}
                  disabled={isSendingApproval}
                  className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  Resend
                </button>
              </div>
            )}
          </div>

          {approvalStatus === "changes_requested" &&
            approvalHistory.length > 0 &&
            (() => {
              const latestChanges = approvalHistory.find((t) => t.status === "CHANGES_REQUESTED");
              if (!latestChanges) return null;
              return (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">
                    Changes requested by {latestChanges.recipientEmail}
                  </p>
                  {latestChanges.overallComments && (
                    <p className="mt-1 text-sm text-amber-900">{latestChanges.overallComments}</p>
                  )}
                  {latestChanges.lineRemarks && latestChanges.lineRemarks.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {latestChanges.lineRemarks.map((r, i) => (
                        <li key={i} className="text-xs text-amber-800">
                          Activity {r.operationNumber}: {r.remark}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isEditing ? "Update Plan" : "Create Plan"}
        </button>
      </div>

      {initialsTarget &&
        (() => {
          const act = activities[initialsTarget.activityIdx];
          const partyKey = initialsTarget.party;
          const currentInitial = act?.[partyKey]?.initial || null;
          return (
            <InitialsPad
              currentValue={currentInitial}
              onSave={(text) => {
                updateActivityInitial(
                  initialsTarget.activityIdx,
                  initialsTarget.party,
                  text || null,
                );
                setInitialsTarget(null);
              }}
              onCancel={() => setInitialsTarget(null)}
            />
          );
        })()}
    </div>
  );
}
