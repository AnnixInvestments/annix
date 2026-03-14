"use client";

import { Camera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  CoatDetail,
  CoatingAnalysis,
  JobCard,
  PositectorConnectionStatus,
  PositectorDevice,
  PositectorStreamingReading,
  PositectorStreamingSaveResult,
  PositectorStreamingSession,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { usePositectorDevices } from "@/app/lib/query/hooks";
import { QrScanner } from "@/app/stock-control/components/QrScanner";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  dft: "DFT Reading",
  blast_profile: "Blast Profile",
  shore_hardness: "Shore Hardness",
};

function specStatus(
  value: number,
  specLimits: { min: number | null; max: number | null },
): "in-spec" | "out-of-spec" | "unknown" {
  if (specLimits.min === null && specLimits.max === null) return "unknown";

  if (specLimits.min !== null && value < specLimits.min) return "out-of-spec";
  if (specLimits.max !== null && value > specLimits.max) return "out-of-spec";

  return "in-spec";
}

function specStatusColor(status: "in-spec" | "out-of-spec" | "unknown"): string {
  if (status === "in-spec") return "bg-green-100 text-green-800";
  if (status === "out-of-spec") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function specStatusDot(status: "in-spec" | "out-of-spec" | "unknown"): string {
  if (status === "in-spec") return "bg-green-500";
  if (status === "out-of-spec") return "bg-red-500";
  return "bg-gray-400";
}

export default function PositectorLiveStreamingPage() {
  const { data: devices = [], isLoading } = usePositectorDevices();
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PositectorStreamingSession | null>(null);
  const [readings, setReadings] = useState<PositectorStreamingReading[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [saveResult, setSaveResult] = useState<PositectorStreamingSaveResult | null>(null);
  const [showStartForm, setShowStartForm] = useState(false);
  const { profile } = useStockControlAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const checkForActiveSessions = useCallback(async () => {
    try {
      const sessions = await stockControlApiClient.positectorStreamingSessions();
      if (Array.isArray(sessions) && sessions.length > 0) {
        const activeSession = sessions[0];
        const details = await stockControlApiClient.positectorStreamingSession(
          activeSession.sessionId,
        );
        setSession(details);
        setReadings(details.readings ?? []);
      }
    } catch {
      // No active sessions
    }
  }, []);

  useEffect(() => {
    checkForActiveSessions();
  }, [checkForActiveSessions]);

  useEffect(() => {
    if (!session) return;

    const url = stockControlApiClient.positectorStreamingEventsUrl(session.sessionId);
    const token =
      localStorage.getItem("stockControlAccessToken") ??
      sessionStorage.getItem("stockControlAccessToken");

    const eventSource = new EventSource(`${url}?token=${token}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    eventSource.addEventListener("reading", (event) => {
      const data = JSON.parse(event.data);
      const reading: PositectorStreamingReading = {
        value: data.value,
        units: data.units,
        probeType: data.probeType,
        serialNumber: data.serialNumber,
        timestamp: data.timestamp,
      };
      setReadings((prev) => [...prev, reading]);
    });

    eventSource.addEventListener("session_saved", (event) => {
      const data = JSON.parse(event.data) as PositectorStreamingSaveResult;
      setSaveResult(data);
    });

    eventSource.addEventListener("session_ended", () => {
      setConnected(false);
      setSession(null);
      eventSource.close();
    });

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [session?.sessionId]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [readings, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  const handleEndSession = async () => {
    if (!session) return;
    try {
      const result = await stockControlApiClient.endPositectorStreamingSession(session.sessionId);
      setSaveResult(result);
      setSession(null);
      setReadings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session");
    }
  };

  const handleDiscardSession = async () => {
    if (!session) return;
    try {
      await stockControlApiClient.discardPositectorStreamingSession(session.sessionId);
      setSession(null);
      setReadings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard session");
    }
  };

  const specLimits = session?.specLimits || { min: null, max: null };
  const average =
    readings.length > 0 ? readings.reduce((sum, r) => sum + r.value, 0) / readings.length : null;
  const outOfSpecCount = readings.filter(
    (r) => specStatus(r.value, specLimits) === "out-of-spec",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Streaming</h1>
          <p className="mt-1 text-sm text-gray-500">
            Receive real-time readings from PosiTector devices via WiFi streaming
          </p>
        </div>
        {!session && (
          <button
            onClick={() => setShowStartForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start Session
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

      {saveResult &&
        (() => {
          const entityLabel = ENTITY_TYPE_LABELS[saveResult.entityType] ?? saveResult.entityType;
          return (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Session saved: {saveResult.readingsImported} readings imported as {entityLabel}
                    {saveResult.average !== null && ` (avg: ${saveResult.average.toFixed(1)})`}
                  </p>
                  <p className="mt-1 text-xs text-green-600">Record ID: {saveResult.recordId}</p>
                </div>
                <button
                  onClick={() => setSaveResult(null)}
                  className="text-sm text-green-500 hover:text-green-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })()}

      {session &&
        (() => {
          const sessionConfig = session.config;
          const sessionEntityType = sessionConfig.entityType;
          const sessionEntityLabel = ENTITY_TYPE_LABELS[sessionEntityType] ?? sessionEntityType;
          const sessionJobCardId = sessionConfig.jobCardId;
          return (
            <>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${connected ? "animate-pulse bg-green-500" : "bg-gray-400"}`}
                      />
                      <span className="text-sm text-gray-600">
                        {connected ? "Live stream active" : "Connecting to server..."}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{readings.length}</span> readings
                    </div>
                    {average !== null && (
                      <div className="text-sm text-gray-600">
                        Avg: <span className="font-medium text-gray-900">{average.toFixed(1)}</span>
                      </div>
                    )}
                    {outOfSpecCount > 0 && (
                      <div className="text-sm text-red-600">
                        <span className="font-medium">{outOfSpecCount}</span> out of spec
                      </div>
                    )}
                    {specLimits.min !== null && (
                      <div className="text-xs text-gray-500">
                        Spec: {specLimits.min}
                        {specLimits.max !== null ? ` – ${specLimits.max}` : "+"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                      {sessionEntityLabel}
                    </span>
                    <span className="text-xs text-gray-500">Job Card #{sessionJobCardId}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                  <span className="text-sm font-medium text-gray-700">Live Readings</span>
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
                  onScroll={handleScroll}
                  className="max-h-[500px] overflow-y-auto p-4"
                >
                  {readings.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <p className="text-lg font-medium">Waiting for readings...</p>
                      <p className="mt-2 text-sm">
                        Take a measurement on the PosiTector device. Readings will appear here in
                        real-time.
                      </p>
                      {profile?.companyId && session?.deviceId && (
                        <div className="mt-4 rounded-md bg-gray-50 p-3 text-left text-xs text-gray-500">
                          <p className="mb-1 font-medium">PosiTector WiFi Streaming URL:</p>
                          <code className="break-all text-gray-700">
                            {stockControlApiClient.positectorWebhookUrl(
                              profile.companyId,
                              session.deviceId,
                            )}
                          </code>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {readings.map((reading, index) => {
                        const status = specStatus(reading.value, specLimits);
                        return (
                          <div
                            key={`${reading.timestamp}-${index}`}
                            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-50"
                          >
                            <span className="w-8 text-right text-xs text-gray-400">
                              {index + 1}
                            </span>
                            <div className={`h-2 w-2 rounded-full ${specStatusDot(status)}`} />
                            <span className="min-w-[80px] font-mono text-sm font-medium text-gray-900">
                              {reading.value.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-500">{reading.units ?? ""}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${specStatusColor(status)}`}
                            >
                              {status === "in-spec"
                                ? "In Spec"
                                : status === "out-of-spec"
                                  ? "Out of Spec"
                                  : "-"}
                            </span>
                            <span className="ml-auto text-xs text-gray-400">
                              {new Date(reading.timestamp).toLocaleTimeString("en-ZA")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {readings.length > 0 && (
                <ReadingSummaryBar readings={readings} specLimits={specLimits} />
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleDiscardSession}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Discard Session
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={readings.length === 0}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Save & End Session ({readings.length} readings)
                </button>
              </div>
            </>
          );
        })()}

      {!session && !showStartForm && !isLoading && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No active streaming session</p>
          <p className="mt-1 text-sm text-gray-400">
            Start a session to receive live readings from a PosiTector device
          </p>
        </div>
      )}

      {showStartForm && !session && (
        <StartSessionForm
          devices={devices}
          onStarted={(newSession) => {
            setSession(newSession);
            setReadings(newSession.readings ?? []);
            setShowStartForm(false);
            setSaveResult(null);
          }}
          onCancel={() => setShowStartForm(false)}
        />
      )}
    </div>
  );
}

function ReadingSummaryBar({
  readings,
  specLimits,
}: {
  readings: PositectorStreamingReading[];
  specLimits: { min: number | null; max: number | null };
}) {
  const values = readings.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const inSpecCount = readings.filter((r) => specStatus(r.value, specLimits) === "in-spec").length;
  const outCount = readings.filter((r) => specStatus(r.value, specLimits) === "out-of-spec").length;

  return (
    <div className="grid grid-cols-5 gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-center">
        <p className="text-xs text-gray-500">Min</p>
        <p className="text-lg font-semibold text-gray-900">{min.toFixed(1)}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">Max</p>
        <p className="text-lg font-semibold text-gray-900">{max.toFixed(1)}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">Average</p>
        <p className="text-lg font-semibold text-gray-900">{avg.toFixed(1)}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">In Spec</p>
        <p className="text-lg font-semibold text-green-600">{inSpecCount}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">Out of Spec</p>
        <p className="text-lg font-semibold text-red-600">{outCount}</p>
      </div>
    </div>
  );
}

function coatLabel(coat: CoatDetail): string {
  const area = coat.area === "external" ? "Ext" : "Int";
  const type = coat.genericType ?? coat.product;
  return `${type} (${area}) — ${coat.minDftUm}–${coat.maxDftUm} µm`;
}

function StartSessionForm({
  devices,
  onStarted,
  onCancel,
}: {
  devices: PositectorDevice[];
  onStarted: (session: PositectorStreamingSession) => void;
  onCancel: () => void;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<PositectorConnectionStatus | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [jobCardId, setJobCardId] = useState("");
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoadingJobCards, setIsLoadingJobCards] = useState(true);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [coatingAnalysis, setCoatingAnalysis] = useState<CoatingAnalysis | null>(null);
  const [rubberShore, setRubberShore] = useState<number | null>(null);
  const [rubberCompound, setRubberCompound] = useState<string | null>(null);
  const [isLoadingCoating, setIsLoadingCoating] = useState(false);
  const [entityType, setEntityType] = useState<"dft" | "blast_profile" | "shore_hardness">("dft");
  const [selectedCoatIndex, setSelectedCoatIndex] = useState<string>("");
  const [paintProduct, setPaintProduct] = useState("");
  const [coatType, setCoatType] = useState("primer");
  const [batchNumber, setBatchNumber] = useState("");
  const [specMin, setSpecMin] = useState("");
  const [specMax, setSpecMax] = useState("");
  const [specMicrons, setSpecMicrons] = useState("");
  const [rubberSpec, setRubberSpec] = useState("");
  const [rubberBatchNumber, setRubberBatchNumber] = useState("");
  const [requiredShore, setRequiredShore] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeviceChange = useCallback(async (selectedId: string) => {
    setDeviceId(selectedId);
    setDeviceStatus(null);

    if (!selectedId) return;

    try {
      setIsCheckingDevice(true);
      const status = await stockControlApiClient.checkPositectorConnection(
        parseInt(selectedId, 10),
      );
      setDeviceStatus(status);
    } catch {
      setDeviceStatus(null);
      setError("Failed to check device connection");
    } finally {
      setIsCheckingDevice(false);
    }
  }, []);

  const handleRetryConnection = useCallback(async () => {
    if (!deviceId) return;

    try {
      setIsCheckingDevice(true);
      const status = await stockControlApiClient.checkPositectorConnection(parseInt(deviceId, 10));
      setDeviceStatus(status);
    } catch {
      setDeviceStatus(null);
      setError("Failed to check device connection");
    } finally {
      setIsCheckingDevice(false);
    }
  }, [deviceId]);

  useEffect(() => {
    const fetchJobCards = async () => {
      try {
        const data = await stockControlApiClient.jobCards("active");
        setJobCards(Array.isArray(data) ? data : []);
      } catch {
        setJobCards([]);
      } finally {
        setIsLoadingJobCards(false);
      }
    };
    fetchJobCards();
  }, []);

  const selectJobCard = useCallback(
    async (id: number) => {
      setJobCardId(String(id));
      const jc = jobCards.find((j) => j.id === id) ?? null;
      setSelectedJobCard(jc);
      setCoatingAnalysis(null);
      setSelectedCoatIndex("");
      setPaintProduct("");
      setSpecMin("");
      setSpecMax("");
      setRubberShore(null);
      setRubberCompound(null);
      setRubberSpec("");
      setRequiredShore("");

      try {
        setIsLoadingCoating(true);
        const [analysis, rubberOptions] = await Promise.all([
          stockControlApiClient.jobCardCoatingAnalysis(id).catch(() => null),
          stockControlApiClient.rubberStockOptions(id).catch(() => null),
        ]);
        setCoatingAnalysis(analysis);

        if (rubberOptions?.rubberSpec) {
          const spec = rubberOptions.rubberSpec;
          setRubberShore(spec.shore);
          setRubberCompound(spec.compound);
          if (spec.shore !== null) {
            setRequiredShore(String(spec.shore));
          }
          const specParts = [
            spec.compound,
            spec.shore !== null ? `${spec.shore} Shore` : null,
            spec.color,
          ]
            .filter(Boolean)
            .join(" ");
          if (specParts) {
            setRubberSpec(specParts);
          }
        }
      } catch {
        setCoatingAnalysis(null);
      } finally {
        setIsLoadingCoating(false);
      }
    },
    [jobCards],
  );

  const handleJobCardDropdownChange = useCallback(
    (value: string) => {
      if (value) {
        selectJobCard(parseInt(value, 10));
      } else {
        setJobCardId("");
        setSelectedJobCard(null);
        setCoatingAnalysis(null);
        setSelectedCoatIndex("");
      }
    },
    [selectJobCard],
  );

  const handleQrScan = useCallback(
    async (result: string) => {
      setShowQrScanner(false);
      try {
        const parsed = await stockControlApiClient.scanQrCode(result);
        if (parsed.type === "job_card") {
          selectJobCard(parsed.id);
        } else {
          setError("Scanned QR code is not a job card");
        }
      } catch {
        const idMatch = result.match(/\d+/);
        if (idMatch) {
          selectJobCard(parseInt(idMatch[0], 10));
        } else {
          setError("Could not identify job card from QR code");
        }
      }
    },
    [selectJobCard],
  );

  const handleCoatSelection = useCallback(
    (index: string) => {
      setSelectedCoatIndex(index);
      if (index && coatingAnalysis) {
        const coat = coatingAnalysis.coats[parseInt(index, 10)];
        if (coat) {
          setPaintProduct(coat.product);
          setSpecMin(String(coat.minDftUm));
          setSpecMax(String(coat.maxDftUm));
          const isPrimer =
            coat.genericType?.toLowerCase().includes("primer") ||
            coat.product.toLowerCase().includes("primer");
          setCoatType(isPrimer ? "primer" : "final");
        }
      }
    },
    [coatingAnalysis],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceId || !jobCardId) {
      setError("Device and Job Card are required");
      return;
    }

    if (deviceStatus && !deviceStatus.online) {
      setError(
        "Device is offline. Please ensure the PosiTector is powered on and connected to WiFi before starting a session.",
      );
      return;
    }

    try {
      setIsStarting(true);
      setError(null);

      const session = await stockControlApiClient.startPositectorStreamingSession({
        deviceId: parseInt(deviceId, 10),
        jobCardId: parseInt(jobCardId, 10),
        entityType,
        coatType: entityType === "dft" ? coatType : undefined,
        paintProduct: entityType === "dft" ? paintProduct || "Unknown" : undefined,
        batchNumber: entityType === "dft" && batchNumber ? batchNumber : null,
        specMinMicrons: entityType === "dft" ? parseFloat(specMin) || 0 : undefined,
        specMaxMicrons: entityType === "dft" ? parseFloat(specMax) || 0 : undefined,
        specMicrons: entityType === "blast_profile" ? parseFloat(specMicrons) || 0 : undefined,
        rubberSpec: entityType === "shore_hardness" ? rubberSpec || "Unknown" : undefined,
        rubberBatchNumber:
          entityType === "shore_hardness" && rubberBatchNumber ? rubberBatchNumber : null,
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

  const availableCoats = coatingAnalysis?.coats || [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Start Live Streaming Session</h2>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showQrScanner && <QrScanner onScan={handleQrScan} onClose={() => setShowQrScanner(false)} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Device</label>
            <select
              value={deviceId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select device...</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deviceName} ({d.ipAddress})
                </option>
              ))}
            </select>
            {isCheckingDevice && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                Checking device connection...
              </div>
            )}
            {!isCheckingDevice && deviceStatus && (
              <div
                className={`mt-2 flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                  deviceStatus.online ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      deviceStatus.online ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {deviceStatus.online ? (
                    <span>
                      Device online
                      {deviceStatus.probeType && ` — ${deviceStatus.probeType}`}
                      {deviceStatus.batchCount !== null &&
                        ` (${deviceStatus.batchCount} batches on device)`}
                    </span>
                  ) : (
                    <span>
                      Device offline — ensure PosiTector is powered on, connected to WiFi, and WiFi
                      streaming is enabled
                    </span>
                  )}
                </div>
                {!deviceStatus.online && (
                  <button
                    type="button"
                    onClick={handleRetryConnection}
                    className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
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

        <div>
          <label className="block text-sm font-medium text-gray-700">Job Card</label>
          <div className="mt-1 flex gap-2">
            <select
              value={jobCardId}
              onChange={(e) => handleJobCardDropdownChange(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">
                {isLoadingJobCards ? "Loading job cards..." : "Select job card..."}
              </option>
              {jobCards.map((jc) => (
                <option key={jc.id} value={jc.id}>
                  {jc.jobNumber} — {jc.jobName}
                  {jc.customerName ? ` (${jc.customerName})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowQrScanner(true)}
              className="flex items-center gap-1.5 rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
              title="Scan Job Card QR Code"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          </div>
          {selectedJobCard && (
            <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <span className="font-medium">{selectedJobCard.jobNumber}</span> —{" "}
              {selectedJobCard.jobName}
              {selectedJobCard.customerName && (
                <span className="text-blue-600"> ({selectedJobCard.customerName})</span>
              )}
            </div>
          )}
        </div>

        {isLoadingCoating && (
          <div className="text-sm text-gray-500">Loading coating specifications...</div>
        )}

        {entityType === "dft" && jobCardId && (
          <div className="space-y-3 rounded-md bg-gray-50 p-3">
            {availableCoats.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600">
                  Select Coat (auto-fills specs)
                </label>
                <select
                  value={selectedCoatIndex}
                  onChange={(e) => handleCoatSelection(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Choose a coat...</option>
                  {availableCoats.map((coat, idx) => (
                    <option key={`${coat.product}-${coat.area}-${idx}`} value={String(idx)}>
                      {coatLabel(coat)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Coat Type</label>
                <select
                  value={coatType}
                  onChange={(e) => setCoatType(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="primer">Primer</option>
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
                <label className="block text-xs font-medium text-gray-600">Spec Min (µm)</label>
                <input
                  type="number"
                  value={specMin}
                  onChange={(e) => setSpecMin(e.target.value)}
                  placeholder="e.g. 240"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Spec Max (µm)</label>
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
          <div className="rounded-md bg-gray-50 p-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Spec (µm)</label>
              <input
                type="number"
                value={specMicrons}
                onChange={(e) => setSpecMicrons(e.target.value)}
                placeholder="e.g. 75"
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
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
            {requiredShore && (
              <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Tolerance per SANS 1198:2013 — ±5 Shore: acceptable range{" "}
                <span className="font-semibold">
                  {parseInt(requiredShore, 10) - 5} – {parseInt(requiredShore, 10) + 5}
                </span>{" "}
                Shore A
              </div>
            )}
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
            disabled={
              isStarting || isCheckingDevice || (deviceStatus !== null && !deviceStatus.online)
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isStarting ? "Starting..." : "Start Streaming"}
          </button>
        </div>
      </form>
    </div>
  );
}
