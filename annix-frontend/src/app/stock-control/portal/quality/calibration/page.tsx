"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalibrationCertificate } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { fromISO, now } from "@/app/lib/datetime";

function expiryStatus(expiryDate: string): { label: string; className: string } {
  const expiry = fromISO(expiryDate);
  const today = now().startOf("day");
  const daysUntil = expiry.diff(today, "days").days;

  if (daysUntil < 0) {
    return { label: "Expired", className: "bg-red-100 text-red-800" };
  }

  if (daysUntil <= 30) {
    return { label: `${Math.ceil(daysUntil)}d left`, className: "bg-amber-100 text-amber-800" };
  }

  return { label: "Valid", className: "bg-green-100 text-green-800" };
}

export default function CalibrationPage() {
  const [certificates, setCertificates] = useState<CalibrationCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterActive, setFilterActive] = useState("true");

  const fetchCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: { active?: boolean } = {};
      if (filterActive === "true") filters.active = true;
      if (filterActive === "false") filters.active = false;

      const data = await stockControlApiClient.calibrationCertificates(filters);
      setCertificates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calibration certificates");
    } finally {
      setIsLoading(false);
    }
  }, [filterActive]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleView = async (id: number) => {
    try {
      const cert = await stockControlApiClient.calibrationCertificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get download URL");
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await stockControlApiClient.deactivateCalibrationCertificate(id);
      fetchCertificates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate certificate");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await stockControlApiClient.deleteCalibrationCertificate(id);
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete certificate");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calibration Certificates</h1>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
            <option value="">All</option>
          </select>

          <button
            onClick={() => setShowUploadModal(true)}
            className="ml-auto rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Upload Calibration Certificate
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading calibration certificates...</div>
        ) : certificates.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
            <p className="text-gray-500">No calibration certificates uploaded yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Calibration certificates are automatically included in every data book
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              Upload your first calibration certificate
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Equipment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    ID / Serial
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Cert No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Expiry
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    File
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {certificates.map((cert) => {
                  const status = expiryStatus(cert.expiryDate);
                  return (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {cert.equipmentName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {cert.equipmentIdentifier ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {cert.certificateNumber ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {cert.expiryDate}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            cert.isActive ? status.className : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {cert.isActive ? status.label : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span
                          className="max-w-[120px] truncate block"
                          title={cert.originalFilename}
                        >
                          {cert.originalFilename}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => handleView(cert.id)}
                          className="mr-2 text-teal-600 hover:text-teal-800"
                        >
                          View
                        </button>
                        {cert.isActive && (
                          <button
                            onClick={() => handleDeactivate(cert.id)}
                            className="mr-2 text-amber-600 hover:text-amber-800"
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(cert.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showUploadModal && (
          <UploadCalibrationCertificateModal
            onClose={() => setShowUploadModal(false)}
            onUploaded={() => {
              setShowUploadModal(false);
              fetchCertificates();
            }}
          />
        )}
      </div>
    </div>
  );
}

function UploadCalibrationCertificateModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentIdentifier, setEquipmentIdentifier] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file || !equipmentName.trim() || !expiryDate) {
      setError("Equipment name, expiry date, and file are required");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await stockControlApiClient.uploadCalibrationCertificate(file, {
        equipmentName: equipmentName.trim(),
        equipmentIdentifier: equipmentIdentifier.trim() || null,
        certificateNumber: certificateNumber.trim() || null,
        description: description.trim() || null,
        expiryDate,
      });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upload Calibration Certificate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Equipment Name *</label>
            <input
              type="text"
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              placeholder="e.g. DFT Gauge, Blast Profile Gauge"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Equipment ID / Serial
              </label>
              <input
                type="text"
                value={equipmentIdentifier}
                onChange={(e) => setEquipmentIdentifier(e.target.value)}
                placeholder="e.g. SN-12345"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Certificate No.</label>
              <input
                type="text"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="e.g. CAL-2026-001"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">File *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || !file || !equipmentName.trim() || !expiryDate}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
