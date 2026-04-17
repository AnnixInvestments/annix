"use client";

import { useRef, useState } from "react";
import type {
  PositectorBatchDetail,
  PositectorBatchSummary,
  PositectorConnectionStatus,
  PositectorDevice,
  PositectorImportResult,
} from "@/app/lib/api/stockControlApi";
import {
  useCheckPositectorConnection,
  useDeletePositectorDevice,
  useImportPositectorBatch,
  useInvalidatePositectorDevices,
  usePositectorBatchDetail,
  usePositectorBatches,
  usePositectorDevices,
  useRegisterPositectorDevice,
} from "@/app/lib/query/hooks";

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
  const ptLabel = PROBE_TYPE_LABELS[probeType];
  return ptLabel ? ptLabel : probeType;
}

export default function PositectorPage() {
  const { data: devices = [], isLoading, error: devicesError } = usePositectorDevices();
  const invalidateDevices = useInvalidatePositectorDevices();
  const checkConnectionMutation = useCheckPositectorConnection();
  const deleteDeviceMutation = useDeletePositectorDevice();
  const batchesMutation = usePositectorBatches();
  const batchDetailMutation = usePositectorBatchDetail();
  const importBatchMutation = useImportPositectorBatch();
  const devErrMsg = devicesError ? devicesError.message : null;
  const [error, setError] = useState<string | null>(devErrMsg ? devErrMsg : null);
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
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<PositectorImportResult | null>(null);

  const handleCheckConnection = async (deviceId: number) => {
    try {
      setCheckingConnection(deviceId);
      const status = await checkConnectionMutation.mutateAsync(deviceId);
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
      const data = await batchesMutation.mutateAsync(device.id);
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
      const data = await batchDetailMutation.mutateAsync({ deviceId: selectedDevice.id, buid });
      setSelectedBatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch data");
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDeviceMutation.mutateAsync(id);
      invalidateDevices();
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
                      {probeTypeLabel(
                        (() => {
                          const spt = status ? status.probeType : null;
                          return spt ? spt : device.probeType;
                        })(),
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {(() => {
                        const ssn = status ? status.serialNumber : null;
                        if (ssn) return ssn;
                        return device.serialNumber ? device.serialNumber : "-";
                      })()}
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
                          {status.online ? `Online (${status.batchCount} batches)` : "Offline"}
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
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{batch.buid}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{batch.name ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {probeTypeLabel(batch.probeType)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{batch.readingCount}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button className="text-blue-600 hover:text-blue-800">View</button>
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
                  Maps to: {(() => {
                    const etl = ENTITY_TYPE_LABELS[selectedBatch.suggestedEntityType];
                    return etl ? etl : "Unknown";
                  })()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedBatch.suggestedEntityType !== "unknown" && (
                <button
                  onClick={() => setShowImportWizard(true)}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Import to Job Card
                </button>
              )}
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
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
                        <td className="px-4 py-2 text-sm text-gray-500">{reading.index}</td>
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

      {lastImportResult && (
        <div
          className={`rounded-md p-4 ${lastImportResult.duplicateWarning ? "bg-amber-50" : "bg-green-50"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Imported {lastImportResult.readingsImported} readings as {(() => {
                  const etl2 = ENTITY_TYPE_LABELS[lastImportResult.entityType];
                  return etl2 ? etl2 : lastImportResult.entityType;
                })()}
                {lastImportResult.average !== null &&
                  ` (avg: ${lastImportResult.average.toFixed(1)})`}
              </p>
              {lastImportResult.duplicateWarning && (
                <p className="mt-1 text-xs text-amber-700">
                  Warning: Readings for this type and date already exist on this job card
                </p>
              )}
            </div>
            <button
              onClick={() => setLastImportResult(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showImportWizard && selectedBatch && selectedDevice && (
        <ImportWizardModal
          device={selectedDevice}
          batch={selectedBatch}
          onClose={() => setShowImportWizard(false)}
          onImported={(result) => {
            setShowImportWizard(false);
            setLastImportResult(result);
          }}
        />
      )}

      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            invalidateDevices();
          }}
        />
      )}
    </div>
  );
}

interface DiscoveredDevice {
  ip: string;
  port: number;
  name: string | null;
}

async function probeAddress(
  ip: string,
  port: number,
  signal: AbortSignal,
): Promise<DiscoveredDevice | null> {
  try {
    const response = await fetch(`http://${ip}:${port}/api/batches`, {
      signal,
      mode: "cors",
    });
    if (response.ok) {
      return { ip, port, name: null };
    }
    return null;
  } catch {
    return null;
  }
}

async function scanSubnet(
  subnet: string,
  port: number,
  onFound: (device: DiscoveredDevice) => void,
  signal: AbortSignal,
): Promise<void> {
  const BATCH_SIZE = 20;
  for (let start = 1; start <= 254 && !signal.aborted; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, 254);
    const promises = Array.from({ length: end - start + 1 }, (_, i) => {
      const ip = `${subnet}.${start + i}`;
      return probeAddress(ip, port, signal).then((result) => {
        if (result) onFound(result);
      });
    });
    await Promise.all(promises);
  }
}

function AddDeviceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const registerDeviceMutation = useRegisterPositectorDevice();
  const [deviceName, setDeviceName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("8080");
  const [probeType, setProbeType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [foundDevices, setFoundDevices] = useState<DiscoveredDevice[]>([]);
  const [subnet, setSubnet] = useState("192.168.1");
  const [showScanPanel, setShowScanPanel] = useState(false);
  const scanAbortRef = useRef<AbortController | null>(null);

  const handleAutoDiscover = async () => {
    setIsScanning(true);
    setFoundDevices([]);
    setScanStatus(`Scanning ${subnet}.1-254 on port ${port}...`);
    const controller = new AbortController();
    scanAbortRef.current = controller;

    const scanPort = parseInt(port, 10) || 8080;

    await scanSubnet(
      subnet,
      scanPort,
      (device) => {
        setFoundDevices((prev) => [...prev, device]);
      },
      controller.signal,
    );

    if (!controller.signal.aborted) {
      setIsScanning(false);
      setScanStatus(null);
    }
  };

  const handleCancelScan = () => {
    scanAbortRef.current?.abort();
    setIsScanning(false);
    setScanStatus(null);
  };

  const handleSelectDiscovered = (device: DiscoveredDevice) => {
    setIpAddress(device.ip);
    setPort(String(device.port));
    if (device.name) {
      setDeviceName(device.name);
    }
    setShowScanPanel(false);
    setFoundDevices([]);
    setScanStatus(null);
  };

  const handleBluetoothScan = async () => {
    if (!("bluetooth" in navigator)) {
      setError(
        "Bluetooth is not supported in this browser. Use Chrome or Edge on a device with Bluetooth.",
      );
      return;
    }

    try {
      setScanStatus("Waiting for Bluetooth device selection...");
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [],
      });

      const name = device.name;
      if (name) {
        setDeviceName(name);
      }
      setScanStatus(`Found Bluetooth device: ${name || device.id}`);
    } catch (err) {
      if (err instanceof Error && err.name !== "NotFoundError") {
        setError(err.message);
      }
      setScanStatus(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceName.trim() || !ipAddress.trim()) {
      setError("Device name and IP address are required");
      return;
    }

    try {
      setIsSaving(true);
      await registerDeviceMutation.mutateAsync({
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/10 backdrop-blur-md">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Register PosiTector Device</h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowScanPanel(!showScanPanel)}
              className="w-full rounded-md border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-100"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Auto Discover Devices
              </span>
            </button>
          </div>

          {showScanPanel && (
            <div className="mb-4 space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-blue-800">Subnet</label>
                  <input
                    type="text"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    placeholder="192.168.1"
                    className="mt-1 block w-full rounded-md border border-blue-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={isScanning ? handleCancelScan : handleAutoDiscover}
                  disabled={!subnet.trim()}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                    isScanning
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  }`}
                >
                  {isScanning ? "Stop" : "Scan WiFi"}
                </button>
                <button
                  type="button"
                  onClick={handleBluetoothScan}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Bluetooth
                </button>
              </div>

              {scanStatus && (
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  {isScanning && (
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  {scanStatus}
                </div>
              )}

              {foundDevices.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-blue-800">
                    Found {foundDevices.length} device(s):
                  </p>
                  {foundDevices.map((d) => (
                    <button
                      key={`${d.ip}:${d.port}`}
                      type="button"
                      onClick={() => handleSelectDiscovered(d)}
                      className="flex w-full items-center justify-between rounded-md bg-white px-3 py-2 text-sm shadow-sm hover:bg-green-50"
                    >
                      <span className="font-mono text-gray-900">
                        {d.ip}:{d.port}
                      </span>
                      <span className="text-xs text-green-600">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {!isScanning && foundDevices.length === 0 && scanStatus === null && (
                <p className="text-xs text-blue-600">
                  WiFi scan probes your local network for PosiTector HTTP servers. Bluetooth opens
                  the browser device picker.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Device Name</label>
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
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
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
    </div>
  );
}

function ImportWizardModal({
  device,
  batch,
  onClose,
  onImported,
}: {
  device: PositectorDevice;
  batch: PositectorBatchDetail;
  onClose: () => void;
  onImported: (result: PositectorImportResult) => void;
}) {
  const importBatchMut = useImportPositectorBatch();
  const [jobCardId, setJobCardId] = useState("");
  const [entityType, setEntityType] = useState(batch.suggestedEntityType);
  const suggestedCoat = batch.suggestedCoatType;
  const [coatType, setCoatType] = useState(suggestedCoat || "primer");
  const [paintProduct, setPaintProduct] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [specMin, setSpecMin] = useState("");
  const [specMax, setSpecMax] = useState("");
  const [specMicrons, setSpecMicrons] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [rubberSpec, setRubberSpec] = useState("");
  const [rubberBatchNumber, setRubberBatchNumber] = useState("");
  const [requiredShore, setRequiredShore] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobCardId.trim()) {
      setError("Job Card ID is required");
      return;
    }

    try {
      setIsImporting(true);
      setError(null);

      const result = await importBatchMut.mutateAsync({
        deviceId: device.id,
        buid: batch.buid,
        data: {
          jobCardId: parseInt(jobCardId, 10),
          entityType,
          coatType: entityType === "dft" ? coatType : undefined,
          paintProduct: entityType === "dft" ? paintProduct || "Unknown" : undefined,
          batchNumber: entityType === "dft" && batchNumber ? batchNumber : null,
          specMinMicrons: entityType === "dft" ? parseFloat(specMin) || 0 : undefined,
          specMaxMicrons: entityType === "dft" ? parseFloat(specMax) || 0 : undefined,
          specMicrons: entityType === "blast_profile" ? parseFloat(specMicrons) || 0 : undefined,
          temperature:
            entityType === "blast_profile" && temperature ? parseFloat(temperature) : null,
          humidity: entityType === "blast_profile" && humidity ? parseFloat(humidity) : null,
          rubberSpec: entityType === "shore_hardness" ? rubberSpec || "Unknown" : undefined,
          rubberBatchNumber:
            entityType === "shore_hardness" && rubberBatchNumber ? rubberBatchNumber : null,
          requiredShore:
            entityType === "shore_hardness" ? parseInt(requiredShore, 10) || 0 : undefined,
        },
      });

      onImported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Import Batch to Job Card</h2>
        <p className="mb-4 text-sm text-gray-500">
          {batch.readings.length} readings from {batch.header.batchName ?? batch.buid}
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleImport} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Card ID</label>
              <input
                type="number"
                value={jobCardId}
                onChange={(e) => setJobCardId(e.target.value)}
                placeholder="Enter job card ID"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Measurement Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="dft">DFT Reading</option>
                <option value="blast_profile">Blast Profile</option>
                <option value="shore_hardness">Shore Hardness</option>
              </select>
            </div>
          </div>

          {entityType === "dft" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Coat Type</label>
                  <select
                    value={coatType}
                    onChange={(e) => setCoatType(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="primer">Primer</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Paint Product</label>
                  <input
                    type="text"
                    value={paintProduct}
                    onChange={(e) => setPaintProduct(e.target.value)}
                    placeholder="e.g. Penguard Express"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Batch No</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Min (um)</label>
                  <input
                    type="number"
                    value={specMin}
                    onChange={(e) => setSpecMin(e.target.value)}
                    placeholder="e.g. 240"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Max (um)</label>
                  <input
                    type="number"
                    value={specMax}
                    onChange={(e) => setSpecMax(e.target.value)}
                    placeholder="e.g. 250"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {entityType === "blast_profile" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec (um)</label>
                  <input
                    type="number"
                    value={specMicrons}
                    onChange={(e) => setSpecMicrons(e.target.value)}
                    placeholder="e.g. 75"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Temp (C)</label>
                  <input
                    type="number"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="Auto if DPM"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Humidity (%)</label>
                  <input
                    type="number"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                    placeholder="Auto if DPM"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {entityType === "shore_hardness" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Rubber Spec</label>
                  <input
                    type="text"
                    value={rubberSpec}
                    onChange={(e) => setRubberSpec(e.target.value)}
                    placeholder="e.g. AU 40 SHORE"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Batch No</label>
                  <input
                    type="text"
                    value={rubberBatchNumber}
                    onChange={(e) => setRubberBatchNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Required Shore</label>
                  <input
                    type="number"
                    value={requiredShore}
                    onChange={(e) => setRequiredShore(e.target.value)}
                    placeholder="e.g. 40"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

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
              disabled={isImporting}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isImporting ? "Importing..." : `Import ${batch.readings.length} Readings`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
