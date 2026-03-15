"use client";

import { Check, Circle, Clock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { JobCardApproval } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";

const WORKFLOW_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "document_upload", label: "Documents" },
  { key: "admin_approval", label: "Admin" },
  { key: "manager_approval", label: "Manager" },
  { key: "requisition_sent", label: "Requisition" },
  { key: "stock_allocation", label: "Allocation" },
  { key: "manager_final", label: "Final Sign-off" },
  { key: "ready_for_dispatch", label: "Dispatch Ready" },
  { key: "dispatched", label: "Dispatched" },
];

const STATUS_MAP: Record<string, number> = {
  draft: 0,
  document_uploaded: 2,
  admin_approved: 3,
  manager_approved: 4,
  requisition_sent: 5,
  stock_allocated: 6,
  manager_final: 7,
  ready_for_dispatch: 8,
  dispatched: 9,
};

type StepState = "completed" | "current" | "rejected" | "pending";

const resolveStepState = (
  stepKey: string,
  index: number,
  currentStepIndex: number,
  approvalByStep: Record<string, JobCardApproval>,
): StepState => {
  const approval = approvalByStep[stepKey];

  if (approval?.status === "rejected") {
    return "rejected";
  } else if (approval?.status === "approved") {
    return "completed";
  } else if (index === currentStepIndex) {
    return "current";
  } else if (index < currentStepIndex) {
    return "completed";
  } else {
    return "pending";
  }
};

const buildApprovalMap = (approvals: JobCardApproval[]): Record<string, JobCardApproval> =>
  approvals.reduce(
    (acc, approval) => ({ ...acc, [approval.step]: approval }),
    {} as Record<string, JobCardApproval>,
  );

interface StepPopoverProps {
  approval: JobCardApproval;
  onClose: () => void;
}

function StepPopover(props: StepPopoverProps) {
  const { approval, onClose } = props;
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px] transition-opacity duration-200"
    >
      <div className="text-xs space-y-1.5">
        {approval.approvedByName && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">Approved by</span>
            <span className="font-medium text-gray-900">{approval.approvedByName}</span>
          </div>
        )}
        {approval.approvedAt && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">Date</span>
            <span className="font-medium text-gray-900">
              {formatDateLongZA(approval.approvedAt)}
            </span>
          </div>
        )}
        {approval.signatureUrl && (
          <div className="pt-1.5 border-t border-gray-100">
            <span className="text-gray-500 text-xs">Signature</span>
            <div className="mt-1 bg-white rounded border border-gray-200 p-1.5">
              <img
                src={approval.signatureUrl}
                alt={`Signature by ${approval.approvedByName}`}
                className="max-h-12 w-full object-contain"
              />
            </div>
          </div>
        )}
        {approval.comments && (
          <div className="pt-1 border-t border-gray-100">
            <span className="text-gray-500">Notes:</span>
            <p className="text-gray-700 italic mt-0.5">{approval.comments}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface RejectionTooltipProps {
  reason: string | null;
  approvedByName: string | null;
}

function RejectionTooltip(props: RejectionTooltipProps) {
  const { reason, approvedByName } = props;

  return (
    <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-50 rounded-lg shadow-lg border border-red-200 p-3 min-w-[180px] transition-opacity duration-200">
      <div className="text-xs space-y-1">
        {approvedByName && <p className="text-red-700 font-medium">Rejected by {approvedByName}</p>}
        {reason && <p className="text-red-600 italic">{reason}</p>}
      </div>
    </div>
  );
}

interface WorkflowStepperProps {
  currentStatus: string;
  approvals: JobCardApproval[];
}

export function WorkflowStepper(props: WorkflowStepperProps) {
  const { currentStatus, approvals } = props;
  const currentStepIndex = STATUS_MAP[currentStatus] ?? 0;
  const approvalByStep = buildApprovalMap(approvals);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [hoveredRejection, setHoveredRejection] = useState<string | null>(null);

  const handleStepClick = useCallback(
    (stepKey: string, state: StepState) => {
      if (state === "completed" && approvalByStep[stepKey]) {
        setExpandedStep(expandedStep === stepKey ? null : stepKey);
      }
    },
    [approvalByStep, expandedStep],
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Workflow Progress</h3>

      <div className="hidden lg:block">
        <div className="flex items-start">
          {WORKFLOW_STEPS.map((step, index) => {
            const state = resolveStepState(step.key, index, currentStepIndex, approvalByStep);
            const approval = approvalByStep[step.key];
            const isLast = index === WORKFLOW_STEPS.length - 1;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div
                      className={`flex-1 h-0.5 transition-colors duration-500 ${
                        state === "completed" || state === "current"
                          ? "bg-green-500"
                          : state === "rejected"
                            ? "bg-red-300"
                            : "bg-gray-200"
                      }`}
                    />
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.key, state)}
                      onMouseEnter={() => {
                        if (state === "rejected") {
                          setHoveredRejection(step.key);
                        }
                      }}
                      onMouseLeave={() => setHoveredRejection(null)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        state === "completed"
                          ? "bg-green-500 cursor-pointer hover:bg-green-600 hover:ring-2 hover:ring-green-200"
                          : state === "current"
                            ? "bg-teal-100 border-2 border-teal-500 animate-pulse"
                            : state === "rejected"
                              ? "bg-red-100 border-2 border-red-500 cursor-pointer hover:bg-red-200"
                              : "bg-gray-100 border-2 border-gray-300"
                      }`}
                    >
                      {state === "completed" && <Check className="h-4 w-4 text-white" />}
                      {state === "current" && <Clock className="h-4 w-4 text-teal-600" />}
                      {state === "rejected" && <X className="h-4 w-4 text-red-600" />}
                      {state === "pending" && <Circle className="h-3 w-3 text-gray-400" />}
                    </button>

                    {expandedStep === step.key && approval && (
                      <StepPopover approval={approval} onClose={() => setExpandedStep(null)} />
                    )}

                    {hoveredRejection === step.key && state === "rejected" && approval && (
                      <RejectionTooltip
                        reason={approval.rejectedReason}
                        approvedByName={approval.approvedByName}
                      />
                    )}
                  </div>

                  {!isLast && (
                    <div
                      className={`flex-1 h-0.5 transition-colors duration-500 ${
                        index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-medium transition-colors duration-300 ${
                      state === "completed"
                        ? "text-green-700"
                        : state === "current"
                          ? "text-teal-600"
                          : state === "rejected"
                            ? "text-red-600"
                            : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>

                  {state === "current" && (
                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                      Awaiting
                    </span>
                  )}

                  {state === "completed" && approval?.approvedByName && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[80px]">
                      {approval.approvedByName}
                    </p>
                  )}

                  {state === "completed" && approval?.approvedAt && (
                    <p className="text-[10px] text-gray-400 truncate max-w-[80px]">
                      {formatDateLongZA(approval.approvedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:hidden">
        <div className="relative">
          {WORKFLOW_STEPS.map((step, index) => {
            const state = resolveStepState(step.key, index, currentStepIndex, approvalByStep);
            const approval = approvalByStep[step.key];
            const isLast = index === WORKFLOW_STEPS.length - 1;

            return (
              <div key={step.key} className="relative pb-6 last:pb-0">
                {!isLast && (
                  <div
                    className={`absolute left-4 top-8 -ml-px h-full w-0.5 transition-colors duration-500 ${
                      state === "completed"
                        ? "bg-green-500"
                        : state === "rejected"
                          ? "bg-red-300"
                          : "bg-gray-200"
                    }`}
                  />
                )}

                <div className="relative flex items-start">
                  <div className="flex-shrink-0 relative">
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.key, state)}
                      onMouseEnter={() => {
                        if (state === "rejected") {
                          setHoveredRejection(step.key);
                        }
                      }}
                      onMouseLeave={() => setHoveredRejection(null)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        state === "completed"
                          ? "bg-green-500 cursor-pointer hover:bg-green-600"
                          : state === "current"
                            ? "bg-teal-100 border-2 border-teal-500 animate-pulse"
                            : state === "rejected"
                              ? "bg-red-100 border-2 border-red-500 cursor-pointer"
                              : "bg-gray-100 border-2 border-gray-300"
                      }`}
                    >
                      {state === "completed" && <Check className="h-4 w-4 text-white" />}
                      {state === "current" && <Clock className="h-4 w-4 text-teal-600" />}
                      {state === "rejected" && <X className="h-4 w-4 text-red-600" />}
                      {state === "pending" && <Circle className="h-3 w-3 text-gray-400" />}
                    </button>

                    {hoveredRejection === step.key && state === "rejected" && approval && (
                      <RejectionTooltip
                        reason={approval.rejectedReason}
                        approvedByName={approval.approvedByName}
                      />
                    )}
                  </div>

                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
                          state === "completed"
                            ? "text-green-700"
                            : state === "current"
                              ? "text-teal-600"
                              : state === "rejected"
                                ? "text-red-600"
                                : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </span>
                      {state === "current" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Awaiting
                        </span>
                      )}
                    </div>

                    {approval && state === "completed" && (
                      <div className="mt-1 text-xs text-gray-500">
                        <span>{approval.approvedByName}</span>
                        {approval.approvedAt && (
                          <span> - {formatDateLongZA(approval.approvedAt)}</span>
                        )}
                        {approval.signatureUrl && (
                          <div className="mt-1 bg-white rounded border border-gray-200 p-1.5 inline-block">
                            <img
                              src={approval.signatureUrl}
                              alt={`Signature by ${approval.approvedByName}`}
                              className="max-h-10 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {approval?.comments && (
                      <p className="mt-1 text-xs text-gray-600 italic">{approval.comments}</p>
                    )}

                    {approval && state === "rejected" && (
                      <div className="mt-1">
                        <span className="text-xs text-red-600">
                          Rejected by {approval.approvedByName}
                        </span>
                        {approval.rejectedReason && (
                          <p className="mt-0.5 text-xs text-red-500 italic">
                            {approval.rejectedReason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CompactWorkflowStepperProps {
  workflowStatus: string;
}

export function CompactWorkflowStepper(props: CompactWorkflowStepperProps) {
  const { workflowStatus } = props;
  const currentStepIndex = STATUS_MAP[workflowStatus] ?? 0;

  return (
    <div className="flex items-center gap-0.5 w-fit">
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isLast = index === WORKFLOW_STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            <div className="group relative">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500"
                    : isCurrent
                      ? "bg-teal-500 ring-2 ring-teal-200"
                      : "bg-gray-300"
                }`}
              />
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                  <span className="font-medium">{step.label}</span>
                  <span className="text-gray-300 ml-1">
                    {isCompleted ? "(Done)" : isCurrent ? "(Current)" : "(Pending)"}
                  </span>
                </div>
              </div>
            </div>
            {!isLast && (
              <div
                className={`w-2.5 h-px transition-colors duration-300 ${
                  isCompleted ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const WorkflowStatus = WorkflowStepper;
