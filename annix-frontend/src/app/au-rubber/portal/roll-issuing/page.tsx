"use client";

import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RollIssuanceDto,
  type RollIssuanceStatus,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { Breadcrumb } from "../../components/Breadcrumb";

export default function RollIssuingPage() {
  const { showToast } = useToast();
  const [issuances, setIssuances] = useState<RollIssuanceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    auRubberApiClient
      .rollIssuances()
      .then(setIssuances)
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setIsLoading(false));
  }, []);

  const statusBadge = (status: RollIssuanceStatus) => {
    const colors: Record<RollIssuanceStatus, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      RETURNED: "bg-blue-100 text-blue-800",
      CANCELLED: "bg-gray-100 text-gray-600",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumb items={[{ label: "Roll Issuing" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Roll Issuing</h1>
          <p className="mt-1 text-sm text-gray-600">Issue rubber rolls to job cards</p>
        </div>
        <Link
          href="/au-rubber/portal/roll-issuing/new"
          className="inline-flex items-center px-4 py-3 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <Plus className="w-5 h-5 sm:mr-2" />
          <span className="hidden sm:inline">New Issuance</span>
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />
          </div>
        ) : issuances.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No issuances yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {issuances.map((issuance) => {
              const jcNumbers = issuance.items.map((i) => i.jcNumber).join(", ");
              return (
                <Link
                  key={issuance.id}
                  href={`/au-rubber/portal/roll-issuing/${issuance.id}`}
                  className="block px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-yellow-700">
                          {issuance.rollNumber}
                        </span>
                        {statusBadge(issuance.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">JC: {jcNumbers || "-"}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>{issuance.rollWeightAtIssueKg.toFixed(1)} kg</span>
                        {issuance.expectedReturnKg !== null && (
                          <span>Return: {issuance.expectedReturnKg.toFixed(1)} kg</span>
                        )}
                        <span>{issuance.issuedBy}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {formatDateZA(issuance.issuedAt)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
