"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PositectorDevice,
  PositectorStreamingReading,
  PositectorStreamingSaveResult,
  PositectorStreamingSession,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

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
  const [devices, setDevices] = useState<PositectorDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PositectorStreamingSession | null>(null);
  const [readings, setReadings] = useState<PositectorStreamingReading[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [saveResult, setSaveResult] = useState<PositectorStreamingSaveResult | null>(null);
  const [showStartForm, setShowStartForm] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.positectorDevices({ active: true });
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

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

  const specLimits = session?.specLimits ?? { min: null, max: null };
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

      {saveResult && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Session saved: {saveResult.readingsImported} readings imported as{" "}
                {ENTITY_TYPE_LABELS[saveResult.entityType] ?? saveResult.entityType}
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
      )}

      {session && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${connected ? "animate-pulse bg-green-500" : "bg-gray-400"}`}
                  />
                  <span className="text-sm text-gray-600">
                    {connected ? "Connected" : "Waiting for connection..."}
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
                  {ENTITY_TYPE_LABELS[session.config.entityType] ?? session.config.entityType}
                </span>
                <span className="text-xs text-gray-500">Job Card #{session.config.jobCardId}</span>
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
                  <div className="mt-4 rounded-md bg-gray-50 p-3 text-left text-xs text-gray-500">
                    <p className="mb-1 font-medium">PosiTector WiFi Streaming URL:</p>
                    <code className="break-all text-gray-700">
                      {stockControlApiClient.positectorStreamingEventsUrl("webhook")}
                      ?company=YOUR_COMPANY_ID&device=YOUR_DEVICE_ID&value=[thickness]&units=[units]&probe=[probetype]&serial=[serial]
                    </code>
                  </div>
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
                        <span className="w-8 text-right text-xs text-gray-400">{index + 1}</span>
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

          {readings.length > 0 && <ReadingSummaryBar readings={readings} specLimits={specLimits} />}

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
      )}

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
  const [jobCardId, setJobCardId] = useState("");
  const [entityType, setEntityType] = useState<"dft" | "blast_profile" | "shore_hardness">("dft");
  const [coatType, setCoatType] = useState("primer");
  const [paintProduct, setPaintProduct] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [specMin, setSpecMin] = useState("");
  const [specMax, setSpecMax] = useState("");
  const [specMicrons, setSpecMicrons] = useState("");
  const [rubberSpec, setRubberSpec] = useState("");
  const [rubberBatchNumber, setRubberBatchNumber] = useState("");
  const [requiredShore, setRequiredShore] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceId || !jobCardId) {
      setError("Device and Job Card ID are required");
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Start Live Streaming Session</h2>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Device</label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select device...</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deviceName} ({d.ipAddress})
                </option>
              ))}
            </select>
          </div>
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
          <div className="rounded-md bg-gray-50 p-3">
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
            {isStarting ? "Starting..." : "Start Streaming"}
          </button>
        </div>
      </form>
    </div>
  );
}
