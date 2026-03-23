"use client";

import { useCallback, useEffect, useState } from "react";
import type { QcReleaseCertificateRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { QcReleaseCertificateForm } from "./QcReleaseCertificateForm";

interface QcReleaseCertificateSectionProps {
  jobCardId: number;
}

type ViewMode = "list" | "create" | "edit";

function sectionStatusBadge(result: "pass" | "fail" | null): React.ReactNode {
  if (result === "pass") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Pass
      </span>
    );
  } else if (result === "fail") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Fail
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      Pending
    </span>
  );
}

function overallStatus(cert: QcReleaseCertificateRecord): "pass" | "fail" | null {
  const checks = [
    cert.blastingCheck?.contaminationFree,
    cert.blastingCheck?.sa25Grade,
    cert.liningCheck?.preCureLinedAsPerDrawing,
    cert.liningCheck?.visualDefectInspection,
    cert.finalInspection?.linedAsPerDrawing,
    cert.finalInspection?.visualInspection,
    cert.finalInspection?.testPlate,
    cert.finalInspection?.sparkTest,
    ...cert.paintingChecks.map((pc) => pc.result),
    ...cert.solutionsUsed.map((s) => s.result),
  ].filter((v): v is "pass" | "fail" => v !== null && v !== undefined);

  if (checks.length === 0) return null;
  if (checks.some((c) => c === "fail")) return "fail";
  return "pass";
}

export function QcReleaseCertificateSection({ jobCardId }: QcReleaseCertificateSectionProps) {
  const [certificates, setCertificates] = useState<QcReleaseCertificateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingCert, setEditingCert] = useState<QcReleaseCertificateRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await stockControlApiClient.releaseCertificatesForJobCard(jobCardId);
      setCertificates(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load release certificates");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await stockControlApiClient.deleteReleaseCertificate(jobCardId, id);
      fetchCertificates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete certificate");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setViewMode("list");
    setEditingCert(null);
    fetchCertificates();
  };

  const handleEdit = (cert: QcReleaseCertificateRecord) => {
    setEditingCert(cert);
    setViewMode("edit");
  };

  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <QcReleaseCertificateForm
          jobCardId={jobCardId}
          existingCertificate={editingCert}
          onSaved={handleSaved}
          onCancel={() => {
            setViewMode("list");
            setEditingCert(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          QC Release Certificates
          {certificates.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">({certificates.length})</span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => {
            setEditingCert(null);
            setViewMode("create");
          }}
          className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
        >
          + New Certificate
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
      ) : certificates.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No release certificates yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create a QC Release Certificate to record inspection results
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {sectionStatusBadge(overallStatus(cert))}
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {cert.certificateNumber || `Certificate #${cert.id}`}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {cert.certificateDate && <span>{formatDateZA(cert.certificateDate)}</span>}
                    <span>by {cert.capturedByName}</span>
                    {cert.finalApprovalName && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>
                          Approved: {cert.finalApprovalName}
                          {cert.finalApprovalSignatureUrl && " (signed)"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    stockControlApiClient.openReleaseCertificatePdf(jobCardId, cert.id)
                  }
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(cert)}
                  className="text-sm text-teal-600 hover:text-teal-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cert.id)}
                  disabled={deletingId === cert.id}
                  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === cert.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
