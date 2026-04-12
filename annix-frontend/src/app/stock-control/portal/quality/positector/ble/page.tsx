"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PositectorStreamingReading,
  PositectorStreamingSaveResult,
  PositectorStreamingSession,
} from "@/app/lib/api/stockControlApi";
import { nowISO } from "@/app/lib/datetime";
import {
  useAddPositectorStreamingReading,
  useEndPositectorStreamingSession,
  useStartPositectorStreamingSession,
} from "@/app/lib/query/hooks";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  dft: "DFT Reading",
  blast_profile: "Blast Profile",
  shore_hardness: "Shore Hardness",
};

const DEFAULT_NAME_PREFIX = "PosiTector";

interface BleDeviceInfo {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer | null;
  services: DiscoveredService[];
  subscribedCharacteristic: BluetoothRemoteGATTCharacteristic | null;
}

interface DiscoveredService {
  uuid: string;
  characteristics: DiscoveredCharacteristic[];
}

interface DiscoveredCharacteristic {
  uuid: string;
  properties: {
    read: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
  };
}

function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

function parseReadingFromDataView(dataView: DataView): number | null {
  if (dataView.byteLength >= 4) {
    return dataView.getFloat32(0, true);
  }
  if (dataView.byteLength >= 2) {
    return dataView.getInt16(0, true) / 10;
  }
  if (dataView.byteLength >= 1) {
    return dataView.getUint8(0);
  }
  return null;
}

function specStatus(
  value: number,
  specLimits: { min: number | null; max: number | null },
): "in-spec" | "out-of-spec" | "unknown" {
  if (specLimits.min === null && specLimits.max === null) return "unknown";
  if (specLimits.min !== null && value < specLimits.min) return "out-of-spec";
  if (specLimits.max !== null && value > specLimits.max) return "out-of-spec";
  return "in-spec";
}

function specStatusDot(status: "in-spec" | "out-of-spec" | "unknown"): string {
  if (status === "in-spec") return "bg-green-500";
  if (status === "out-of-spec") return "bg-red-500";
  return "bg-gray-400";
}

function specStatusColor(status: "in-spec" | "out-of-spec" | "unknown"): string {
  if (status === "in-spec") return "bg-green-100 text-green-800";
  if (status === "out-of-spec") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export default function PositectorBlePage() {
  const addReadingMutation = useAddPositectorStreamingReading();
  const endSessionMutation = useEndPositectorStreamingSession();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [bleDevice, setBleDevice] = useState<BleDeviceInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [namePrefix, setNamePrefix] = useState(DEFAULT_NAME_PREFIX);
  const [customServiceUuid, setCustomServiceUuid] = useState("");
  const [customCharUuid, setCustomCharUuid] = useState("");
  const [readings, setReadings] = useState<PositectorStreamingReading[]>([]);
  const [session, setSession] = useState<PositectorStreamingSession | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [saveResult, setSaveResult] = useState<PositectorStreamingSaveResult | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [rawHex, setRawHex] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupported(isWebBluetoothSupported());
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [readings, autoScroll]);

  const handleScan = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);

      const requestOptions: RequestDeviceOptions = customServiceUuid
        ? {
            filters: [{ services: [customServiceUuid] }],
          }
        : namePrefix
          ? {
              filters: [{ namePrefix }],
              optionalServices: customServiceUuid ? [customServiceUuid] : [],
            }
          : {
              acceptAllDevices: true,
              optionalServices: customServiceUuid ? [customServiceUuid] : [],
            };

      const device = await navigator.bluetooth.requestDevice(requestOptions);

      device.addEventListener("gattserverdisconnected", () => {
        setError("Device disconnected");
        setBleDevice((prev) => (prev ? { ...prev, server: null } : null));
      });

      setBleDevice({
        device,
        server: null,
        services: [],
        subscribedCharacteristic: null,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "NotFoundError") {
        setError(err.message);
      }
    } finally {
      setIsScanning(false);
    }
  }, [namePrefix, customServiceUuid]);

  const handleConnect = useCallback(async () => {
    if (!bleDevice?.device.gatt) return;

    try {
      setError(null);
      setIsDiscovering(true);

      const server = await bleDevice.device.gatt.connect();

      const services: BluetoothRemoteGATTService[] = await server
        .getPrimaryServices()
        .catch(async () => {
          if (customServiceUuid) {
            try {
              const singleService = await server.getPrimaryService(customServiceUuid);
              return [singleService];
            } catch (serviceErr) {
              setError(
                `Could not find service ${customServiceUuid}: ${serviceErr instanceof Error ? serviceErr.message : serviceErr}`,
              );
            }
          }
          return [];
        });

      const discovered: DiscoveredService[] = [];

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          discovered.push({
            uuid: service.uuid,
            characteristics: chars.map((c) => ({
              uuid: c.uuid,
              properties: {
                read: c.properties.read,
                write: c.properties.write ? c.properties.write : c.properties.writeWithoutResponse,
                notify: c.properties.notify,
                indicate: c.properties.indicate,
              },
            })),
          });
        } catch {
          discovered.push({
            uuid: service.uuid,
            characteristics: [],
          });
        }
      }

      setBleDevice((prev) => (prev ? { ...prev, server, services: discovered } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsDiscovering(false);
    }
  }, [bleDevice, customServiceUuid]);

  const handleDisconnect = useCallback(() => {
    if (bleDevice?.device.gatt?.connected) {
      bleDevice.device.gatt.disconnect();
    }
    setBleDevice(null);
    setReadings([]);
    setRawHex([]);
  }, [bleDevice]);

  const handleSubscribe = useCallback(
    async (serviceUuid: string, charUuid: string) => {
      if (!bleDevice?.server) return;

      try {
        setError(null);
        const service = await bleDevice.server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(charUuid);

        characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
          const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
          const dataView = target.value;
          if (!dataView) return;

          const hex = Array.from(new Uint8Array(dataView.buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ");
          setRawHex((prev) => [...prev, hex]);

          const value = parseReadingFromDataView(dataView);
          if (value !== null) {
            const reading: PositectorStreamingReading = {
              value,
              units: null,
              probeType: null,
              serialNumber: bleDevice.device.name ? bleDevice.device.name : null,
              timestamp: nowISO(),
            };

            setReadings((prev) => [...prev, reading]);

            if (session) {
              addReadingMutation
                .mutateAsync({ sessionId: session.sessionId, data: { value } })
                .catch(() => {});
            }
          }
        });

        await characteristic.startNotifications();

        setBleDevice((prev) =>
          prev ? { ...prev, subscribedCharacteristic: characteristic } : null,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to subscribe");
      }
    },
    [bleDevice, session],
  );

  const handleReadOnce = useCallback(
    async (serviceUuid: string, charUuid: string) => {
      if (!bleDevice?.server) return;

      try {
        setError(null);
        const service = await bleDevice.server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(charUuid);
        const dataView = await characteristic.readValue();

        const hex = Array.from(new Uint8Array(dataView.buffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        setRawHex((prev) => [...prev, `[read] ${hex}`]);

        const value = parseReadingFromDataView(dataView);
        if (value !== null) {
          const reading: PositectorStreamingReading = {
            value,
            units: null,
            probeType: null,
            serialNumber: bleDevice.device.name ? bleDevice.device.name : null,
            timestamp: nowISO(),
          };
          setReadings((prev) => [...prev, reading]);

          if (session) {
            addReadingMutation
              .mutateAsync({ sessionId: session.sessionId, data: { value } })
              .catch(() => {});
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read characteristic");
      }
    },
    [bleDevice, session],
  );

  const handleEndSession = async () => {
    if (!session) return;
    try {
      const result = await endSessionMutation.mutateAsync(session.sessionId);
      setSaveResult(result);
      setSession(null);
      setReadings([]);
      setRawHex([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session");
    }
  };

  const sessionSpecLimits = session ? session.specLimits : null;
  const specLimits = sessionSpecLimits || { min: null, max: null };
  const average =
    readings.length > 0 ? readings.reduce((sum, r) => sum + r.value, 0) / readings.length : null;

  if (supported === null) return null;

  if (!supported) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bluetooth (BLE)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect directly to PosiTector devices via Bluetooth Low Energy
          </p>
        </div>
        <div className="rounded-md bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Web Bluetooth is not supported in this browser. Please use Chrome or Edge on a desktop
            platform (Windows, macOS, Linux, or ChromeOS).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bluetooth (BLE)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect directly to PosiTector devices via Bluetooth Low Energy
          </p>
        </div>
        {bleDevice?.server?.connected && !session && (
          <button
            onClick={() => setShowSessionForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start Recording Session
          </button>
        )}
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

      {saveResult && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-800">
              Saved {saveResult.readingsImported} readings as {(() => {
                const label = ENTITY_TYPE_LABELS[saveResult.entityType];
                return label || saveResult.entityType;
              })()}
              {saveResult.average !== null && ` (avg: ${saveResult.average.toFixed(1)})`}
            </p>
            <button
              onClick={() => setSaveResult(null)}
              className="text-sm text-green-500 hover:text-green-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="rounded-md bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Note:</span> PosiTector BLE service UUIDs are proprietary.
          Contact DeFelsko at <span className="font-medium">defelsko.com/developer-resources</span>{" "}
          to request the developer SDK with correct UUIDs. Use the fields below to enter them once
          obtained, or scan with name prefix to discover services.
        </p>
      </div>

      {!bleDevice && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Scan for Device</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Device Name Prefix
                </label>
                <input
                  type="text"
                  value={namePrefix}
                  onChange={(e) => setNamePrefix(e.target.value)}
                  placeholder="e.g. PosiTector"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service UUID (optional)
                </label>
                <input
                  type="text"
                  value={customServiceUuid}
                  onChange={(e) => setCustomServiceUuid(e.target.value)}
                  placeholder="e.g. 0000fff0-0000-1000-8000-00805f9b34fb"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Characteristic UUID (optional)
                </label>
                <input
                  type="text"
                  value={customCharUuid}
                  onChange={(e) => setCustomCharUuid(e.target.value)}
                  placeholder="e.g. 0000fff1-0000-1000-8000-00805f9b34fb"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isScanning ? "Scanning..." : "Scan for PosiTector"}
            </button>
          </div>
        </div>
      )}

      {bleDevice && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    bleDevice.server?.connected ? "animate-pulse bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm font-medium text-gray-900">
                  {bleDevice.device.name ? bleDevice.device.name : "Unknown Device"}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                ID: {bleDevice.device.id.substring(0, 12)}...
              </span>
              {bleDevice.server?.connected && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Connected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!bleDevice.server?.connected && (
                <button
                  onClick={handleConnect}
                  disabled={isDiscovering}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isDiscovering ? "Connecting..." : "Connect"}
                </button>
              )}
              <button
                onClick={handleDisconnect}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Disconnect
              </button>
            </div>
          </div>

          {bleDevice.services.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Discovered GATT Services</h3>
              {bleDevice.services.map((service) => (
                <div key={service.uuid} className="rounded-md border border-gray-200 p-3">
                  <p className="font-mono text-xs text-gray-600">{service.uuid}</p>
                  {service.characteristics.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {service.characteristics.map((char) => (
                        <div
                          key={char.uuid}
                          className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-700">{char.uuid}</span>
                            <div className="flex gap-1">
                              {char.properties.read && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                  R
                                </span>
                              )}
                              {char.properties.write && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                  W
                                </span>
                              )}
                              {char.properties.notify && (
                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                  N
                                </span>
                              )}
                              {char.properties.indicate && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                  I
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {char.properties.read && (
                              <button
                                onClick={() => handleReadOnce(service.uuid, char.uuid)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Read
                              </button>
                            )}
                            {char.properties.notify && (
                              <button
                                onClick={() => handleSubscribe(service.uuid, char.uuid)}
                                className="text-xs text-green-600 hover:text-green-800"
                              >
                                Subscribe
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {bleDevice.subscribedCharacteristic && (
            <div className="mt-3 rounded-md bg-green-50 p-2">
              <p className="text-xs text-green-700">
                Subscribed to notifications on{" "}
                <span className="font-mono">{bleDevice.subscribedCharacteristic.uuid}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {session && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                {(() => {
                  const entityType = session.config.entityType;
                  const label = ENTITY_TYPE_LABELS[entityType];
                  return label || entityType;
                })()}
              </span>
              <span className="text-xs text-gray-500">Job Card #{session.config.jobCardId}</span>
              <span className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{readings.length}</span> readings
              </span>
              {average !== null && (
                <span className="text-sm text-gray-600">
                  Avg: <span className="font-medium text-gray-900">{average.toFixed(1)}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEndSession}
                disabled={readings.length === 0}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Save ({readings.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {readings.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <span className="text-sm font-medium text-gray-700">
              BLE Readings ({readings.length})
            </span>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-scroll
            </label>
          </div>
          <div
            ref={containerRef}
            className="max-h-[400px] overflow-y-auto p-4"
            onScroll={() => {
              if (!containerRef.current) return;
              const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
              setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
            }}
          >
            <div className="space-y-1">
              {readings.map((reading, index) => {
                const status = specStatus(reading.value, specLimits);
                return (
                  <div
                    key={`${reading.timestamp}-${index}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-50"
                  >
                    <span className="w-8 text-right text-xs text-gray-400">{index + 1}</span>
                    <div className={`h-2 w-2 rounded-full ${specStatusDot(status)}`} />
                    <span className="min-w-[80px] font-mono text-sm font-medium text-gray-900">
                      {reading.value.toFixed(1)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${specStatusColor(status)}`}
                    >
                      {status === "in-spec"
                        ? "In Spec"
                        : status === "out-of-spec"
                          ? "Out of Spec"
                          : "-"}
                    </span>
                    {rawHex[index] && (
                      <span className="ml-auto font-mono text-[10px] text-gray-400">
                        {rawHex[index]}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(reading.timestamp).toLocaleTimeString("en-ZA")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showSessionForm && (
        <BleSessionForm
          onStarted={(newSession) => {
            setSession(newSession);
            setReadings([]);
            setRawHex([]);
            setShowSessionForm(false);
            setSaveResult(null);
          }}
          onCancel={() => setShowSessionForm(false)}
          deviceName={(() => {
            const dn = bleDevice ? bleDevice.device.name : null;
            return dn ? dn : null;
          })()}
        />
      )}
    </div>
  );
}

function BleSessionForm({
  onStarted,
  onCancel,
  deviceName,
}: {
  onStarted: (session: PositectorStreamingSession) => void;
  onCancel: () => void;
  deviceName: string | null;
}) {
  const startSessionMutation = useStartPositectorStreamingSession();
  const [jobCardId, setJobCardId] = useState("");
  const [entityType, setEntityType] = useState<"dft" | "blast_profile" | "shore_hardness">("dft");
  const [coatType, setCoatType] = useState("primer");
  const [paintProduct, setPaintProduct] = useState("");
  const [specMin, setSpecMin] = useState("");
  const [specMax, setSpecMax] = useState("");
  const [specMicrons, setSpecMicrons] = useState("");
  const [rubberSpec, setRubberSpec] = useState("");
  const [requiredShore, setRequiredShore] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobCardId) {
      setError("Job Card ID is required");
      return;
    }

    try {
      setIsStarting(true);
      setError(null);

      const session = await startSessionMutation.mutateAsync({
        deviceId: 0,
        jobCardId: parseInt(jobCardId, 10),
        entityType,
        coatType: entityType === "dft" ? coatType : undefined,
        paintProduct: entityType === "dft" ? paintProduct || "Unknown" : undefined,
        specMinMicrons: entityType === "dft" ? parseFloat(specMin) || 0 : undefined,
        specMaxMicrons: entityType === "dft" ? parseFloat(specMax) || 0 : undefined,
        specMicrons: entityType === "blast_profile" ? parseFloat(specMicrons) || 0 : undefined,
        rubberSpec: entityType === "shore_hardness" ? rubberSpec || "Unknown" : undefined,
        requiredShore:
          entityType === "shore_hardness" ? parseInt(requiredShore, 10) || 0 : undefined,
      });

      onStarted(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Start BLE Recording Session</h2>
        <p className="mb-4 text-sm text-gray-500">
          {deviceName
            ? `Connected to ${deviceName}. Configure the recording session.`
            : "Configure the recording session for BLE readings."}
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) =>
                  setEntityType(e.target.value as "dft" | "blast_profile" | "shore_hardness")
                }
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Min (um)</label>
                  <input
                    type="number"
                    value={specMin}
                    onChange={(e) => setSpecMin(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Max (um)</label>
                  <input
                    type="number"
                    value={specMax}
                    onChange={(e) => setSpecMax(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {entityType === "blast_profile" && (
            <div className="rounded-md bg-gray-50 p-3">
              <label className="block text-xs font-medium text-gray-600">Spec (um)</label>
              <input
                type="number"
                value={specMicrons}
                onChange={(e) => setSpecMicrons(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {entityType === "shore_hardness" && (
            <div className="grid grid-cols-2 gap-3 rounded-md bg-gray-50 p-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Rubber Spec</label>
                <input
                  type="text"
                  value={rubberSpec}
                  onChange={(e) => setRubberSpec(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Required Shore</label>
                <input
                  type="number"
                  value={requiredShore}
                  onChange={(e) => setRequiredShore(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isStarting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isStarting ? "Starting..." : "Start Recording"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
