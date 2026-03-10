"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PositectorBatchDetail,
  PositectorBatchSummary,
  PositectorConnectionStatus,
  PositectorDevice,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

const PROBE_TYPE_LABELS: Record<string, string> = {
  "6000": "DFT (Coating Thickness)",
  SPG: "Surface Profile (Blast)",
  SHD: "Shore Hardness",
  RTR: "Replica Tape (Blast)",
  DPM: "Dew Point / Environmental",
  UTG: "Wall Thickness",
  AT: "Adhesion Pull Test",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  dft: "DFT Reading",
  blast_profile: "Blast Profile",
  shore_hardness: "Shore Hardness",
  environmental: "Environmental",
  pull_test: "Pull Test",
  unknown: "Unknown",
};

function probeTypeLabel(probeType: string | null): string {
  if (!probeType) return "Unknown";
  return PROBE_TYPE_LABELS[probeType] ?? probeType;
}

export default function PositectorPage() {
  const [devices, setDevices] = useState<PositectorDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<number, PositectorConnectionStatus>
  >({});
  const [checkingConnection, setCheckingConnection] = useState<number | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<PositectorDevice | null>(null);
  const [batches, setBatches] = useState<PositectorBatchSummary[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PositectorBatchDetail | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.positectorDevices({ active: true });
      setDevices(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleCheckConnection = async (deviceId: number) => {
    try {
      setCheckingConnection(deviceId);
      const status = await stockControlApiClient.checkPositectorConnection(deviceId);
      setConnectionStatuses((prev) => ({ ...prev, [deviceId]: status }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection check failed");
    } finally {
      setCheckingConnection(null);
    }
  };

  const handleBrowseBatches = async (device: PositectorDevice) => {
    try {
      setSelectedDevice(device);
      setLoadingBatches(true);
      setSelectedBatch(null);
      const data = await stockControlApiClient.positectorBatches(device.id);
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batches");
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleSelectBatch = async (buid: string) => {
    if (!selectedDevice) return;
    try {
      setLoadingBatch(true);
      const data = await stockControlApiClient.positectorBatch(selectedDevice.id, buid);
      setSelectedBatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch data");
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await stockControlApiClient.deletePositectorDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      if (selectedDevice?.id === id) {
        setSelectedDevice(null);
        setBatches([]);
        setSelectedBatch(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete device");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PosiTector Devices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Register and manage PosiTector instruments for automated QC data import
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Register Device
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading devices...</p>
      ) : devices.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">No PosiTector devices registered</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Register your first device
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Device
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Probe Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Serial
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {devices.map((device) => {
                const status = connectionStatuses[device.id];
                return (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {device.deviceName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {device.ipAddress}:{device.port}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {probeTypeLabel(status?.probeType ?? device.probeType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {status?.serialNumber ?? device.serialNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {status ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            status.online
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {status.online
                            ? `Online (${status.batchCount} batches)`
                            : "Offline"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not checked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCheckConnection(device.id)}
                          disabled={checkingConnection === device.id}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {checkingConnection === device.id ? "Checking..." : "Check"}
                        </button>
                        {status?.online && (
                          <button
                            onClick={() => handleBrowseBatches(device)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            Batches
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(device.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedDevice && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Batches on {selectedDevice.deviceName}
            </h2>
            <button
              onClick={() => {
                setSelectedDevice(null);
                setBatches([]);
                setSelectedBatch(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          {loadingBatches ? (
            <p className="text-sm text-gray-500">Loading batches...</p>
          ) : batches.length === 0 ? (
            <p className="text-sm text-gray-500">No batches found on device</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Batch ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Probe Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Readings
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {batches.map((batch) => (
                    <tr
                      key={batch.buid}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedBatch?.buid === batch.buid ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleSelectBatch(batch.buid)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {batch.buid}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {batch.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {probeTypeLabel(batch.probeType)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {batch.readingCount}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button className="text-blue-600 hover:text-blue-800">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedBatch && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Batch: {selectedBatch.header.batchName ?? selectedBatch.buid}
              </h2>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                <span>Probe: {probeTypeLabel(selectedBatch.header.probeType)}</span>
                <span>Units: {selectedBatch.header.units ?? "-"}</span>
                <span>Readings: {selectedBatch.readings.length}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    selectedBatch.suggestedEntityType !== "unknown"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  Maps to:{" "}
                  {ENTITY_TYPE_LABELS[selectedBatch.suggestedEntityType] ?? "Unknown"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedBatch(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          {loadingBatch ? (
            <p className="text-sm text-gray-500">Loading batch data...</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Value
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Units
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedBatch.readings.map((reading) => (
                      <tr key={reading.index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {reading.index}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {reading.value}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {reading.units ?? selectedBatch.header.units ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {reading.timestamp ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchDevices();
          }}
        />
      )}
    </div>
  );
}

function AddDeviceModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [deviceName, setDeviceName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("8080");
  const [probeType, setProbeType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceName.trim() || !ipAddress.trim()) {
      setError("Device name and IP address are required");
      return;
    }

    try {
      setIsSaving(true);
      await stockControlApiClient.registerPositectorDevice({
        deviceName: deviceName.trim(),
        ipAddress: ipAddress.trim(),
        port: parseInt(port, 10) || 8080,
        probeType: probeType || null,
        serialNumber: serialNumber || null,
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register device");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Register PosiTector Device
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. DFT Gauge #1"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                IP Address
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.100"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Port</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Probe Type (optional - auto-detected on connection)
            </label>
            <select
              value={probeType}
              onChange={(e) => setProbeType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Auto-detect</option>
              <option value="6000">6000 - DFT (Coating Thickness)</option>
              <option value="SPG">SPG - Surface Profile (Blast)</option>
              <option value="SHD">SHD - Shore Hardness</option>
              <option value="RTR">RTR - Replica Tape (Blast)</option>
              <option value="DPM">DPM - Dew Point / Environmental</option>
              <option value="UTG">UTG - Wall Thickness</option>
              <option value="AT">AT - Adhesion Pull Test</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Serial Number (optional - auto-detected on connection)
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Auto-detected from device"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Registering..." : "Register Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
