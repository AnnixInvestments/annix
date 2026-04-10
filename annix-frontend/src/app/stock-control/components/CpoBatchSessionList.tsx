"use client";

import { ChevronDown, ChevronRight, Loader2, Package } from "lucide-react";
import { useState } from "react";
import type { IssuanceSession, StockIssuance } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useSessionsForCpo, useSessionsForJobCard } from "@/app/lib/query/hooks/stock-control";

interface CpoBatchSessionListProps {
  scope: "cpo" | "job-card";
  id: number;
  title?: string;
}

export function CpoBatchSessionList(props: CpoBatchSessionListProps) {
  const { scope, id, title } = props;
  const cpoQuery = useSessionsForCpo(scope === "cpo" ? id : 0);
  const jcQuery = useSessionsForJobCard(scope === "job-card" ? id : 0);
  const isCpoMode = scope === "cpo";

  const data = isCpoMode ? cpoQuery.data : jcQuery.data;
  const isLoading = isCpoMode ? cpoQuery.isLoading : jcQuery.isLoading;
  const error = isCpoMode ? cpoQuery.error : jcQuery.error;

  const sessions = data || [];
  const headerLabel = title || (isCpoMode ? "Stock Issuance Sessions" : "Linked CPO Batches");

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b flex items-center gap-2">
        <Package className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">{headerLabel}</h3>
        <span className="ml-auto text-xs text-gray-500">{sessions.length}</span>
      </div>

      <div className="divide-y">
        {isLoading && (
          <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions...
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-600">
            {error instanceof Error ? error.message : "Failed to load sessions"}
          </div>
        )}

        {!isLoading && !error && sessions.length === 0 && (
          <div className="p-4 text-sm text-gray-500">
            {isCpoMode
              ? "No stock has been issued against this CPO yet"
              : "No CPO batch sessions have included this job card"}
          </div>
        )}

        {sessions.map((session) => (
          <SessionItem key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

function SessionItem({ session }: { session: IssuanceSession }) {
  const [expanded, setExpanded] = useState(false);
  const issuances = session.issuances || [];
  const totalQty = issuances.reduce((sum, i) => sum + Number(i.quantity), 0);
  const issuerName = session.issuerStaff ? session.issuerStaff.name : "—";
  const recipientName = session.recipientStaff ? session.recipientStaff.name : "—";

  const statusBadge = statusBadgeFor(session.status);
  const cpoNumber = session.cpo ? session.cpo.cpoNumber : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 hover:bg-gray-50 text-left flex items-start gap-2"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 mt-0.5 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 mt-0.5 text-gray-400" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Session #{session.id}</span>
            {cpoNumber && <span className="text-xs text-gray-500">{cpoNumber}</span>}
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {session.jobCardIds.length} JCs · {issuances.length} rows · {totalQty} total qty ·{" "}
            {formatDateZA(session.issuedAt)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Issued by {issuerName} to {recipientName}
          </div>
        </div>
      </button>

      {expanded && issuances.length > 0 && (
        <div className="px-4 pb-3 ml-6 border-l border-gray-200 pl-3 space-y-1">
          {issuances.map((iss) => (
            <IssuanceLine key={iss.id} issuance={iss} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssuanceLine({ issuance }: { issuance: StockIssuance }) {
  const stockItem = issuance.stockItem;
  const itemName = stockItem ? stockItem.name : `Item #${issuance.stockItemId}`;
  const unit = stockItem ? stockItem.unitOfMeasure : "";
  const jc = issuance.jobCard;
  const jcLabel = jc ? jc.jobNumber : `JC #${issuance.jobCardId}`;

  return (
    <div className="text-xs text-gray-700 flex items-center gap-2">
      <span className="font-mono w-12 text-right">{Number(issuance.quantity)}</span>
      <span className="text-gray-500">{unit}</span>
      <span className="flex-1 truncate">{itemName}</span>
      <span className="text-gray-400">→ {jcLabel}</span>
      {issuance.undone && <span className="text-[10px] text-red-600 font-semibold">UNDONE</span>}
    </div>
  );
}

function statusBadgeFor(status: string): { label: string; cls: string } {
  if (status === "active") return { label: "Active", cls: "bg-green-100 text-green-800" };
  if (status === "pending_approval")
    return { label: "Pending", cls: "bg-amber-100 text-amber-800" };
  if (status === "approved") return { label: "Approved", cls: "bg-blue-100 text-blue-800" };
  if (status === "rejected") return { label: "Rejected", cls: "bg-red-100 text-red-800" };
  if (status === "undone") return { label: "Undone", cls: "bg-gray-200 text-gray-700" };
  return { label: status, cls: "bg-gray-100 text-gray-600" };
}
