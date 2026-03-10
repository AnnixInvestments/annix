import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { filter, map, Observable, Subject } from "rxjs";
import { Repository } from "typeorm";
import { nowISO } from "../../lib/datetime";
import type { DftReadingEntry } from "../entities/qc-dft-reading.entity";
import { DftCoatType, QcDftReading } from "../entities/qc-dft-reading.entity";
import type { BlastProfileReadingEntry } from "../entities/qc-blast-profile.entity";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import type {
  ShoreHardnessAverages,
  ShoreHardnessReadings,
} from "../entities/qc-shore-hardness.entity";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";

export interface StreamingReading {
  value: number;
  units: string | null;
  probeType: string | null;
  serialNumber: string | null;
  timestamp: string;
}

export interface StreamingSessionConfig {
  jobCardId: number;
  entityType: "dft" | "blast_profile" | "shore_hardness";
  coatType?: DftCoatType;
  paintProduct?: string;
  batchNumber?: string | null;
  specMinMicrons?: number;
  specMaxMicrons?: number;
  specMicrons?: number;
  rubberSpec?: string;
  rubberBatchNumber?: string | null;
  requiredShore?: number;
}

export interface StreamingSession {
  sessionId: string;
  companyId: number;
  deviceId: number;
  config: StreamingSessionConfig;
  readings: StreamingReading[];
  startedAt: string;
  startedByName: string;
  startedById: number | null;
}

export interface StreamingEvent {
  sessionId: string;
  companyId: number;
  type: "reading" | "session_started" | "session_ended" | "session_saved";
  data: StreamingReading | StreamingSession | SavedSessionResult;
}

export interface SavedSessionResult {
  sessionId: string;
  entityType: string;
  recordId: number;
  readingsImported: number;
  average: number | null;
}

export interface SpecLimits {
  min: number | null;
  max: number | null;
}

@Injectable()
export class PositectorStreamingService implements OnModuleDestroy {
  private readonly logger = new Logger(PositectorStreamingService.name);
  private readonly eventSubject = new Subject<StreamingEvent>();
  private readonly activeSessions = new Map<string, StreamingSession>();

  constructor(
    @InjectRepository(QcDftReading)
    private readonly dftRepo: Repository<QcDftReading>,
    @InjectRepository(QcBlastProfile)
    private readonly blastRepo: Repository<QcBlastProfile>,
    @InjectRepository(QcShoreHardness)
    private readonly shoreRepo: Repository<QcShoreHardness>,
  ) {}

  onModuleDestroy(): void {
    this.logger.log("Completing streaming event subject on module destroy");
    this.eventSubject.complete();
    this.activeSessions.clear();
  }

  startSession(
    companyId: number,
    deviceId: number,
    config: StreamingSessionConfig,
    user: { id?: number; name: string },
  ): StreamingSession {
    const existingSession = this.findActiveSession(companyId, deviceId);
    if (existingSession) {
      this.logger.log(
        `Resuming existing session ${existingSession.sessionId} for device ${deviceId}`,
      );
      return existingSession;
    }

    const sessionId = `${companyId}-${deviceId}-${Date.now()}`;
    const session: StreamingSession = {
      sessionId,
      companyId,
      deviceId,
      config,
      readings: [],
      startedAt: nowISO(),
      startedByName: user.name,
      startedById: user.id ?? null,
    };

    this.activeSessions.set(sessionId, session);

    this.eventSubject.next({
      sessionId,
      companyId,
      type: "session_started",
      data: session,
    });

    this.logger.log(
      `Started streaming session ${sessionId} for device ${deviceId}, job card ${config.jobCardId}`,
    );

    return session;
  }

  findActiveSession(companyId: number, deviceId: number): StreamingSession | null {
    const found = Array.from(this.activeSessions.values()).find(
      (s) => s.companyId === companyId && s.deviceId === deviceId,
    );
    return found ?? null;
  }

  findSessionById(sessionId: string): StreamingSession | null {
    return this.activeSessions.get(sessionId) ?? null;
  }

  activeSessionsForCompany(companyId: number): StreamingSession[] {
    return Array.from(this.activeSessions.values()).filter(
      (s) => s.companyId === companyId,
    );
  }

  receiveReading(sessionId: string, reading: StreamingReading): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`No active session found for ${sessionId}`);
      return false;
    }

    session.readings = [...session.readings, reading];

    this.eventSubject.next({
      sessionId,
      companyId: session.companyId,
      type: "reading",
      data: reading,
    });

    return true;
  }

  receiveWebhookReading(
    companyId: number,
    deviceId: number,
    value: number,
    units: string | null,
    probeType: string | null,
    serialNumber: string | null,
  ): boolean {
    const session = this.findActiveSession(companyId, deviceId);
    if (!session) {
      this.logger.warn(
        `No active session for company ${companyId}, device ${deviceId} — ignoring webhook reading`,
      );
      return false;
    }

    const reading: StreamingReading = {
      value,
      units,
      probeType,
      serialNumber,
      timestamp: nowISO(),
    };

    return this.receiveReading(session.sessionId, reading);
  }

  async endSession(sessionId: string): Promise<SavedSessionResult | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const result = await this.saveSessionToEntity(session);

    this.activeSessions.delete(sessionId);

    this.eventSubject.next({
      sessionId,
      companyId: session.companyId,
      type: "session_saved",
      data: result,
    });

    this.eventSubject.next({
      sessionId,
      companyId: session.companyId,
      type: "session_ended",
      data: session,
    });

    this.logger.log(
      `Ended and saved session ${sessionId}: ${result.readingsImported} readings -> ${result.entityType} #${result.recordId}`,
    );

    return result;
  }

  discardSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    this.activeSessions.delete(sessionId);

    this.eventSubject.next({
      sessionId,
      companyId: session.companyId,
      type: "session_ended",
      data: session,
    });

    this.logger.log(`Discarded session ${sessionId} with ${session.readings.length} readings`);

    return true;
  }

  subscribe(companyId: number, sessionId: string): Observable<MessageEvent> {
    return this.eventSubject.pipe(
      filter((event) => event.companyId === companyId && event.sessionId === sessionId),
      map(
        (event) =>
          ({
            data: JSON.stringify({
              type: event.type,
              ...event.data,
            }),
            type: event.type,
          }) as MessageEvent,
      ),
    );
  }

  specLimitsForSession(session: StreamingSession): SpecLimits {
    const config = session.config;

    if (config.entityType === "dft") {
      return {
        min: config.specMinMicrons ?? null,
        max: config.specMaxMicrons ?? null,
      };
    }

    if (config.entityType === "blast_profile") {
      return {
        min: config.specMicrons ?? null,
        max: null,
      };
    }

    if (config.entityType === "shore_hardness") {
      return {
        min: config.requiredShore ?? null,
        max: null,
      };
    }

    return { min: null, max: null };
  }

  private async saveSessionToEntity(session: StreamingSession): Promise<SavedSessionResult> {
    const { config, readings, companyId } = session;

    if (config.entityType === "dft") {
      return this.saveDftSession(companyId, config, readings, session);
    }

    if (config.entityType === "blast_profile") {
      return this.saveBlastSession(companyId, config, readings, session);
    }

    if (config.entityType === "shore_hardness") {
      return this.saveShoreSession(companyId, config, readings, session);
    }

    return {
      sessionId: session.sessionId,
      entityType: config.entityType,
      recordId: 0,
      readingsImported: 0,
      average: null,
    };
  }

  private async saveDftSession(
    companyId: number,
    config: StreamingSessionConfig,
    readings: StreamingReading[],
    session: StreamingSession,
  ): Promise<SavedSessionResult> {
    const dftReadings: DftReadingEntry[] = readings.map((r, i) => ({
      itemNumber: i + 1,
      reading: r.value,
    }));

    const sum = dftReadings.reduce((acc, r) => acc + r.reading, 0);
    const average = dftReadings.length > 0 ? sum / dftReadings.length : null;

    const record = this.dftRepo.create({
      companyId,
      jobCardId: config.jobCardId,
      coatType: config.coatType ?? DftCoatType.PRIMER,
      paintProduct: config.paintProduct ?? "Unknown",
      batchNumber: config.batchNumber ?? null,
      specMinMicrons: config.specMinMicrons ?? 0,
      specMaxMicrons: config.specMaxMicrons ?? 0,
      readings: dftReadings,
      averageMicrons: average,
      readingDate: nowISO().split("T")[0],
      capturedByName: session.startedByName,
      capturedById: session.startedById,
    });

    const saved = await this.dftRepo.save(record);

    return {
      sessionId: session.sessionId,
      entityType: "dft",
      recordId: saved.id,
      readingsImported: dftReadings.length,
      average,
    };
  }

  private async saveBlastSession(
    companyId: number,
    config: StreamingSessionConfig,
    readings: StreamingReading[],
    session: StreamingSession,
  ): Promise<SavedSessionResult> {
    const blastReadings: BlastProfileReadingEntry[] = readings.map((r, i) => ({
      itemNumber: i + 1,
      reading: r.value,
    }));

    const sum = blastReadings.reduce((acc, r) => acc + r.reading, 0);
    const average = blastReadings.length > 0 ? sum / blastReadings.length : null;

    const record = this.blastRepo.create({
      companyId,
      jobCardId: config.jobCardId,
      specMicrons: config.specMicrons ?? 0,
      readings: blastReadings,
      averageMicrons: average,
      temperature: null,
      humidity: null,
      readingDate: nowISO().split("T")[0],
      capturedByName: session.startedByName,
      capturedById: session.startedById,
    });

    const saved = await this.blastRepo.save(record);

    return {
      sessionId: session.sessionId,
      entityType: "blast_profile",
      recordId: saved.id,
      readingsImported: blastReadings.length,
      average,
    };
  }

  private async saveShoreSession(
    companyId: number,
    config: StreamingSessionConfig,
    readings: StreamingReading[],
    session: StreamingSession,
  ): Promise<SavedSessionResult> {
    const values = readings.map((r) => r.value);
    const perColumn = Math.ceil(values.length / 4);

    const column1 = values.slice(0, perColumn);
    const column2 = values.slice(perColumn, perColumn * 2);
    const column3 = values.slice(perColumn * 2, perColumn * 3);
    const column4 = values.slice(perColumn * 3);

    const columnAverage = (col: number[]): number | null =>
      col.length === 0 ? null : col.reduce((a, b) => a + b, 0) / col.length;

    const avg1 = columnAverage(column1);
    const avg2 = columnAverage(column2);
    const avg3 = columnAverage(column3);
    const avg4 = columnAverage(column4);

    const overall =
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

    const shoreReadings: ShoreHardnessReadings = { column1, column2, column3, column4 };
    const averages: ShoreHardnessAverages = {
      column1: avg1,
      column2: avg2,
      column3: avg3,
      column4: avg4,
      overall,
    };

    const record = this.shoreRepo.create({
      companyId,
      jobCardId: config.jobCardId,
      rubberSpec: config.rubberSpec ?? "Unknown",
      rubberBatchNumber: config.rubberBatchNumber ?? null,
      requiredShore: config.requiredShore ?? 0,
      readings: shoreReadings,
      averages,
      readingDate: nowISO().split("T")[0],
      capturedByName: session.startedByName,
      capturedById: session.startedById,
    });

    const saved = await this.shoreRepo.save(record);

    return {
      sessionId: session.sessionId,
      entityType: "shore_hardness",
      recordId: saved.id,
      readingsImported: values.length,
      average: overall,
    };
  }
}
