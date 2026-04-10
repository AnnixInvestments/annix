"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { IssuanceSession, StockIssuance } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useApproveIssuanceSession,
  useIssuanceSession,
  usePendingApprovalSessions,
  useRejectIssuanceSession,
} from "@/app/lib/query/hooks/stock-control";

export default function CpoBatchApprovalsPage() {
  const { profile } = useStockControlAuth();
  const { data: sessions, isLoading, error, refetch } = usePendingApprovalSessions();
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);

  const handleAfterAction = () => {
    setExpandedSessionId(null);
    refetch();
  };

  const list = sessions || [];
  const linkedStaffId = profile ? profile.linkedStaffId : null;
  const managerStaffId = linkedStaffId || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CPO Batch Approvals</h1>
        <p className="text-sm text-gray-600 mt-1">
          Review and approve CPO batch issuances that exceeded their aggregated paint limit
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading pending sessions...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
          {error instanceof Error ? error.message : "Failed to load pending sessions"}
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-700">No CPO batch sessions awaiting approval</p>
        </div>
      )}

      <div className="space-y-3">
        {list.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            isExpanded={expandedSessionId === session.id}
            onExpand={() =>
              setExpandedSessionId(expandedSessionId === session.id ? null : session.id)
            }
            managerStaffId={managerStaffId}
            onAfterAction={handleAfterAction}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow(props: {
  session: IssuanceSession;
  isExpanded: boolean;
  onExpand: () => void;
  managerStaffId: number | null;
  onAfterAction: () => void;
}) {
  const { session, isExpanded, onExpand, managerStaffId, onAfterAction } = props;
  const issuerName = session.issuerStaff ? session.issuerStaff.name : "—";
  const recipientName = session.recipientStaff ? session.recipientStaff.name : "—";
  const cpoNumber = session.cpo ? session.cpo.cpoNumber : `CPO #${session.cpoId}`;
  const cpo = session.cpo;
  const cpoJobName = cpo?.jobName ? cpo.jobName : "—";

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <button
        type="button"
        onClick={onExpand}
        className="w-full text-left p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">Session #{session.id}</span>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                Pending Approval
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {cpoNumber} · {cpoJobName} · {session.jobCardIds.length} JCs
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Issued by {issuerName} to {recipientName} on {formatDateZA(session.issuedAt)}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {isExpanded ? "Hide details" : "Show details"}
          </div>
        </div>
      </button>

      {isExpanded && (
        <SessionDetail
          sessionId={session.id}
          managerStaffId={managerStaffId}
          onAfterAction={onAfterAction}
        />
      )}
    </div>
  );
}

function SessionDetail(props: {
  sessionId: number;
  managerStaffId: number | null;
  onAfterAction: () => void;
}) {
  const { sessionId, managerStaffId, onAfterAction } = props;
  const { data: detail, isLoading, error } = useIssuanceSession(sessionId);
  const approveMutation = useApproveIssuanceSession();
  const rejectMutation = useRejectIssuanceSession();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const handleApprove = async () => {
    if (managerStaffId === null) {
      alert("You need to link your staff profile before approving sessions");
      return;
    }
    try {
      await approveMutation.mutateAsync({ sessionId, managerStaffId });
      onAfterAction();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve session");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ sessionId, reason: rejectReason.trim() });
      onAfterAction();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject session");
    }
  };

  if (isLoading) {
    return (
      <div className="border-t p-4 text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading session details...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="border-t p-4 text-sm text-red-600">
        {error instanceof Error ? error.message : "Failed to load session details"}
      </div>
    );
  }

  const issuances = detail.issuances || [];
  const issuancesByStockItem = groupByStockItem(issuances);

  return (
    <div className="border-t bg-gray-50 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-sm text-gray-900 mb-2">Issued Items</h3>
        <div className="space-y-2">
          {Array.from(issuancesByStockItem.entries()).map(([itemId, group]) => (
            <div key={itemId} className="bg-white border rounded p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{group.stockItemName}</span>
                <span className="font-mono font-semibold text-sm">
                  {group.totalQty} {group.unitOfMeasure}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {group.issuances.map((iss) => (
                  <div key={iss.id} className="text-xs text-gray-600 flex items-center gap-2">
                    <span>JC {iss.jobCard ? iss.jobCard.jobNumber : iss.jobCardId}</span>
                    <span className="font-mono">{iss.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail.notes && (
        <div className="text-sm">
          <span className="font-semibold">Notes:</span> {detail.notes}
        </div>
      )}

      {showReject && (
        <div className="space-y-2">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (will roll back the issuance)"
            className="w-full border rounded p-2 text-sm"
            rows={3}
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        {!showReject && (
          <>
            <button
              type="button"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              className="px-4 py-2 text-sm bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject & Roll Back
            </button>
          </>
        )}
        {showReject && (
          <>
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setRejectReason("");
              }}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface IssuanceGroup {
  stockItemName: string;
  unitOfMeasure: string;
  totalQty: number;
  issuances: StockIssuance[];
}

function groupByStockItem(issuances: StockIssuance[]): Map<number, IssuanceGroup> {
  return issuances.reduce((acc, iss) => {
    const stockItem = iss.stockItem;
    const itemId = iss.stockItemId;
    const stockItemName = stockItem ? stockItem.name : `Item #${itemId}`;
    const unitOfMeasure = stockItem ? stockItem.unitOfMeasure : "";
    const existing = acc.get(itemId);
    if (existing) {
      existing.totalQty += Number(iss.quantity);
      existing.issuances.push(iss);
    } else {
      acc.set(itemId, {
        stockItemName,
        unitOfMeasure,
        totalQty: Number(iss.quantity),
        issuances: [iss],
      });
    }
    return acc;
  }, new Map<number, IssuanceGroup>());
}
