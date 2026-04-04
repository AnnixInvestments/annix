"use client";

import type {
  CpoSummary,
  WorkflowLaneCounts,
  WorkflowStepConfig,
} from "@/app/lib/api/stockControlApi";
import { useWorkflowStepConfigs } from "@/app/lib/query/hooks";
import { CountBadge, LaneSkeleton } from "./CountBadge";

const stepLabel = (stepKey: string, fallback: string, configs: WorkflowStepConfig[]): string => {
  const match = configs.find((c) => c.key === stepKey);
  return match ? match.label : fallback;
};

interface WorkflowLanesSectionProps {
  lanes: WorkflowLaneCounts | undefined;
  lanesLoading: boolean;
  cpoSummary: CpoSummary | undefined;
  showInbound: boolean;
  showWorkshop: boolean;
  showOutbound: boolean;
}

function InboundLane({ lanes }: { lanes: WorkflowLaneCounts | undefined }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-blue-600">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Inbound</h2>
        <p className="text-xs text-blue-200">Deliveries & Invoices</p>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
          Deliveries
        </p>
        <CountBadge
          count={lanes?.inbound.deliveriesPending || 0}
          label="Pending extraction"
          href="/stock-control/portal/deliveries"
          variant="warning"
        />
        <CountBadge
          count={lanes?.inbound.deliveriesProcessed || 0}
          label="Processed"
          href="/stock-control/portal/deliveries"
          variant="success"
        />
        <div className="border-t border-gray-100 my-2" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
          Invoices
        </p>
        <CountBadge
          count={lanes?.inbound.invoicesPending || 0}
          label="Pending extraction"
          href="/stock-control/portal/invoices?status=pending"
          variant="warning"
        />
        <CountBadge
          count={lanes?.inbound.invoicesNeedClarification || 0}
          label="Need clarification"
          href="/stock-control/portal/invoices?status=needs_clarification"
          variant="danger"
        />
        <CountBadge
          count={lanes?.inbound.invoicesAwaitingApproval || 0}
          label="Awaiting approval"
          href="/stock-control/portal/invoices?status=awaiting_approval"
          variant="info"
        />
      </div>
    </div>
  );
}

function WorkshopLane({
  lanes,
  stepConfigs,
}: {
  lanes: WorkflowLaneCounts | undefined;
  stepConfigs: WorkflowStepConfig[];
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-teal-600">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Workshop</h2>
        <p className="text-xs text-teal-200">Job Cards & Processing</p>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
          Job Cards
        </p>
        <CountBadge
          count={lanes?.workshop.jobCardsDraft || 0}
          label="Draft"
          href="/stock-control/portal/job-cards?status=draft"
          variant="default"
        />
        <CountBadge
          count={lanes?.workshop.jobCardsPendingAdmin || 0}
          label={`Pending ${stepLabel("admin_approval", "admin", stepConfigs).toLowerCase()} approval`}
          href="/stock-control/portal/job-cards?status=admin_approval"
          variant="warning"
        />
        <CountBadge
          count={lanes?.workshop.jobCardsPendingManager || 0}
          label={`Pending ${stepLabel("manager_approval", "manager", stepConfigs).toLowerCase()} approval`}
          href="/stock-control/portal/job-cards?status=manager_approval"
          variant="warning"
        />
        <CountBadge
          count={lanes?.workshop.jobCardsPendingAllocation || 0}
          label={stepLabel("quality_check", "Quality check", stepConfigs)}
          href="/stock-control/portal/job-cards?status=quality_check"
          variant="info"
        />
        {((lanes?.workshop.coatingPending || 0) > 0 ||
          (lanes?.workshop.coatingAnalysed || 0) > 0) && (
          <>
            <div className="border-t border-gray-100 my-2" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
              Coating Analysis
            </p>
            <CountBadge
              count={lanes?.workshop.coatingPending || 0}
              label="Pending analysis"
              href="/stock-control/portal/job-cards"
              variant="warning"
            />
            <CountBadge
              count={lanes?.workshop.coatingAnalysed || 0}
              label="Awaiting acceptance"
              href="/stock-control/portal/job-cards"
              variant="info"
            />
          </>
        )}
        <div className="border-t border-gray-100 my-2" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
          Requisitions
        </p>
        <CountBadge
          count={lanes?.workshop.requisitionsPending || 0}
          label="Pending"
          href="/stock-control/portal/requisitions?status=pending"
          variant="warning"
        />
        <CountBadge
          count={lanes?.workshop.requisitionsApproved || 0}
          label="Approved"
          href="/stock-control/portal/requisitions?status=approved"
          variant="success"
        />
        <CountBadge
          count={lanes?.workshop.requisitionsOrdered || 0}
          label="Ordered"
          href="/stock-control/portal/requisitions?status=ordered"
          variant="info"
        />
      </div>
    </div>
  );
}

function OutboundLane({
  lanes,
  cpoSummary,
  stepConfigs,
}: {
  lanes: WorkflowLaneCounts | undefined;
  cpoSummary: CpoSummary | undefined;
  stepConfigs: WorkflowStepConfig[];
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-purple-600">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Outbound</h2>
        <p className="text-xs text-purple-200">Dispatch & Stock Alerts</p>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
          Dispatch
        </p>
        <CountBadge
          count={lanes?.outbound.jobCardsDispatched || 0}
          label={stepLabel("dispatched", "Dispatched", stepConfigs)}
          href="/stock-control/portal/job-cards?status=dispatched"
          variant="warning"
        />
        <CountBadge
          count={lanes?.outbound.jobCardsFileClosed || 0}
          label="File closed"
          href="/stock-control/portal/job-cards?status=file_closed"
          variant="success"
        />
        <div className="border-t border-gray-100 my-2" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
          Stock Alerts
        </p>
        <CountBadge
          count={lanes?.outbound.lowStockAlerts || 0}
          label="Low stock items"
          href="/stock-control/portal/inventory?filter=low-stock"
          variant="danger"
        />
      </div>

      {cpoSummary &&
        (cpoSummary.activeCpos > 0 ||
          cpoSummary.awaitingCalloff > 0 ||
          cpoSummary.overdueInvoices > 0) && (
          <>
            <div className="border-t border-gray-100 mx-3" />
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                Purchase Orders
              </p>
              <CountBadge
                count={cpoSummary.activeCpos}
                label="Active CPOs"
                href="/stock-control/portal/purchase-orders"
                variant="info"
              />
              <CountBadge
                count={cpoSummary.awaitingCalloff}
                label="Awaiting call-off"
                href="/stock-control/portal/purchase-orders"
                variant="warning"
              />
              <CountBadge
                count={cpoSummary.overdueInvoices}
                label="Overdue invoices"
                href="/stock-control/portal/purchase-orders"
                variant="danger"
              />
            </div>
          </>
        )}
    </div>
  );
}

export function WorkflowLanesSection({
  lanes,
  lanesLoading,
  cpoSummary,
  showInbound,
  showWorkshop,
  showOutbound,
}: WorkflowLanesSectionProps) {
  const { data: stepConfigs } = useWorkflowStepConfigs();
  const configs = stepConfigs || [];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {showInbound &&
          (lanesLoading ? (
            <LaneSkeleton title="Inbound" color="bg-blue-600" />
          ) : (
            <InboundLane lanes={lanes} />
          ))}

        {showWorkshop &&
          (lanesLoading ? (
            <LaneSkeleton title="Workshop" color="bg-teal-600" />
          ) : (
            <WorkshopLane lanes={lanes} stepConfigs={configs} />
          ))}

        {showOutbound &&
          (lanesLoading ? (
            <LaneSkeleton title="Outbound" color="bg-purple-600" />
          ) : (
            <OutboundLane lanes={lanes} cpoSummary={cpoSummary} stepConfigs={configs} />
          ))}
      </div>

      {!showInbound && !showWorkshop && !showOutbound && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No workflow lanes available for this view.</p>
        </div>
      )}
    </>
  );
}
