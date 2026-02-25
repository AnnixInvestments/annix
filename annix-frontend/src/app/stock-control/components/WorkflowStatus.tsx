"use client";

import { JobCardApproval } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";
import {
  CheckCircle,
  Circle,
  Clock,
  FileText,
  Package,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";

const WORKFLOW_STEPS = [
  { key: "document_upload", label: "Document Upload", icon: FileText },
  { key: "admin_approval", label: "Admin Approval", icon: UserCheck },
  { key: "manager_approval", label: "Manager Approval", icon: UserCheck },
  { key: "requisition_sent", label: "Requisition", icon: FileText },
  { key: "stock_allocation", label: "Stock Allocation", icon: Package },
  { key: "manager_final", label: "Final Approval", icon: UserCheck },
  { key: "ready_for_dispatch", label: "Ready for Dispatch", icon: Truck },
  { key: "dispatched", label: "Dispatched", icon: CheckCircle },
];

const STATUS_MAP: Record<string, number> = {
  draft: -1,
  document_uploaded: 0,
  admin_approved: 1,
  manager_approved: 2,
  requisition_sent: 3,
  stock_allocated: 4,
  manager_final: 5,
  ready_for_dispatch: 6,
  dispatched: 7,
};

interface WorkflowStatusProps {
  currentStatus: string;
  approvals: JobCardApproval[];
}

export function WorkflowStatus({ currentStatus, approvals }: WorkflowStatusProps) {
  const currentStepIndex = STATUS_MAP[currentStatus] ?? -1;

  const approvalByStep = approvals.reduce(
    (acc, approval) => {
      acc[approval.step] = approval;
      return acc;
    },
    {} as Record<string, JobCardApproval>,
  );

  const stepStatus = (
    stepKey: string,
    index: number,
  ): "completed" | "current" | "rejected" | "pending" => {
    const approval = approvalByStep[stepKey];

    if (approval?.status === "rejected") {
      return "rejected";
    }

    if (approval?.status === "approved") {
      return "completed";
    }

    if (index === currentStepIndex) {
      return "current";
    }

    if (index < currentStepIndex) {
      return "completed";
    }

    return "pending";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Workflow Progress</h3>

      <div className="relative">
        {WORKFLOW_STEPS.map((step, index) => {
          const status = stepStatus(step.key, index);
          const approval = approvalByStep[step.key];
          const Icon = step.icon;
          const isLast = index === WORKFLOW_STEPS.length - 1;

          return (
            <div key={step.key} className="relative pb-8 last:pb-0">
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 -ml-px h-full w-0.5 ${
                    status === "completed" ? "bg-teal-500" : "bg-gray-200"
                  }`}
                />
              )}

              <div className="relative flex items-start">
                <div className="flex-shrink-0">
                  {status === "completed" && (
                    <div className="h-8 w-8 rounded-full bg-teal-500 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {status === "current" && (
                    <div className="h-8 w-8 rounded-full bg-teal-100 border-2 border-teal-500 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-teal-600" />
                    </div>
                  )}
                  {status === "rejected" && (
                    <div className="h-8 w-8 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                  {status === "pending" && (
                    <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                      <Circle className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="ml-4 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <Icon
                      className={`h-4 w-4 ${
                        status === "completed"
                          ? "text-teal-600"
                          : status === "current"
                            ? "text-teal-500"
                            : status === "rejected"
                              ? "text-red-500"
                              : "text-gray-400"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        status === "completed"
                          ? "text-teal-700"
                          : status === "current"
                            ? "text-teal-600"
                            : status === "rejected"
                              ? "text-red-600"
                              : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                    {status === "current" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Awaiting
                      </span>
                    )}
                  </div>

                  {approval && status === "completed" && (
                    <div className="mt-1 text-xs text-gray-500">
                      <span>{approval.approvedByName}</span>
                      {approval.approvedAt && (
                        <span> - {formatDateLongZA(new Date(approval.approvedAt))}</span>
                      )}
                      {approval.signatureUrl && (
                        <span className="ml-2 text-teal-600">(Signed)</span>
                      )}
                    </div>
                  )}

                  {approval?.comments && (
                    <p className="mt-1 text-xs text-gray-600 italic">{approval.comments}</p>
                  )}

                  {approval && status === "rejected" && (
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
  );
}
