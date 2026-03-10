import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { nowISO } from "../../lib/datetime";
import { PositectorDevice } from "../entities/positector-device.entity";

export interface RegisterDeviceDto {
  deviceName: string;
  ipAddress: string;
  port?: number;
  probeType?: string | null;
  serialNumber?: string | null;
}

export interface UpdateDeviceDto {
  deviceName?: string;
  ipAddress?: string;
  port?: number;
  probeType?: string | null;
  serialNumber?: string | null;
  isActive?: boolean;
}

export interface PositectorBatchHeader {
  serialNumber: string | null;
  probeType: string | null;
  batchName: string | null;
  model: string | null;
  units: string | null;
  readingCount: number;
  raw: Record<string, string>;
}

export interface PositectorReading {
  index: number;
  value: number;
  units: string | null;
  timestamp: string | null;
  raw: Record<string, string>;
}

export interface PositectorBatch {
  buid: string;
  header: PositectorBatchHeader;
  readings: PositectorReading[];
  statistics: Record<string, string> | null;
}

export interface PositectorBatchSummary {
  buid: string;
  name: string | null;
  probeType: string | null;
  readingCount: number;
}

export interface DeviceConnectionStatus {
  id: number;
  deviceName: string;
  ipAddress: string;
  port: number;
  online: boolean;
  probeType: string | null;
  serialNumber: string | null;
  batchCount: number | null;
}

@Injectable()
export class PositectorService {
  private readonly logger = new Logger(PositectorService.name);

  constructor(
    @InjectRepository(PositectorDevice)
    private readonly deviceRepo: Repository<PositectorDevice>,
  ) {}

  async registerDevice(
    companyId: number,
    dto: RegisterDeviceDto,
    user: { id?: number; name: string },
  ): Promise<PositectorDevice> {
    const existing = await this.deviceRepo.findOne({
      where: { companyId, ipAddress: dto.ipAddress },
    });

    if (existing) {
      throw new BadRequestException(
        `A device is already registered at ${dto.ipAddress}`,
      );
    }

    const device = this.deviceRepo.create({
      companyId,
      deviceName: dto.deviceName,
      ipAddress: dto.ipAddress,
      port: dto.port ?? 8080,
      probeType: dto.probeType ?? null,
      serialNumber: dto.serialNumber ?? null,
      isActive: true,
      registeredByName: user.name,
      registeredById: user.id ?? null,
    });

    return this.deviceRepo.save(device);
  }

  async findAll(
    companyId: number,
    filters?: { active?: boolean },
  ): Promise<PositectorDevice[]> {
    const qb = this.deviceRepo
      .createQueryBuilder("d")
      .where("d.companyId = :companyId", { companyId })
      .orderBy("d.deviceName", "ASC");

    if (filters?.active !== undefined) {
      qb.andWhere("d.isActive = :active", { active: filters.active });
    }

    return qb.getMany();
  }

  async findById(companyId: number, id: number): Promise<PositectorDevice> {
    const device = await this.deviceRepo.findOne({
      where: { id, companyId },
    });

    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }

    return device;
  }

  async updateDevice(
    companyId: number,
    id: number,
    dto: UpdateDeviceDto,
  ): Promise<PositectorDevice> {
    const device = await this.findById(companyId, id);

    if (dto.deviceName !== undefined) device.deviceName = dto.deviceName;
    if (dto.ipAddress !== undefined) device.ipAddress = dto.ipAddress;
    if (dto.port !== undefined) device.port = dto.port;
    if (dto.probeType !== undefined) device.probeType = dto.probeType;
    if (dto.serialNumber !== undefined) device.serialNumber = dto.serialNumber;
    if (dto.isActive !== undefined) device.isActive = dto.isActive;

    return this.deviceRepo.save(device);
  }

  async deleteDevice(companyId: number, id: number): Promise<void> {
    const device = await this.findById(companyId, id);
    await this.deviceRepo.remove(device);
  }

  async checkConnection(
    companyId: number,
    id: number,
  ): Promise<DeviceConnectionStatus> {
    const device = await this.findById(companyId, id);
    const baseUrl = this.deviceBaseUrl(device);

    let online = false;
    let batchCount: number | null = null;
    let detectedProbe: string | null = device.probeType;
    let detectedSerial: string | null = device.serialNumber;

    try {
      const html = await this.fetchFromDevice(`${baseUrl}/usbms/`, 5000);
      online = true;

      const batchDirs = this.parseBatchDirectoryListing(html);
      batchCount = batchDirs.length;

      if (batchDirs.length > 0) {
        const firstBatch = batchDirs[0];
        const header = await this.fetchBatchHeader(baseUrl, firstBatch);

        if (header.probeType && !device.probeType) {
          detectedProbe = header.probeType;
        }

        if (header.serialNumber && !device.serialNumber) {
          detectedSerial = header.serialNumber;
        }
      }

      const updates: Partial<PositectorDevice> = {
        lastConnectedAt: new Date(),
      };

      if (detectedProbe && !device.probeType) {
        updates.probeType = detectedProbe;
      }

      if (detectedSerial && !device.serialNumber) {
        updates.serialNumber = detectedSerial;
      }

      await this.deviceRepo.update({ id: device.id }, updates);
    } catch (err) {
      this.logger.warn(
        `Connection check failed for device ${device.deviceName} (${device.ipAddress}): ${err instanceof Error ? err.message : err}`,
      );
    }

    return {
      id: device.id,
      deviceName: device.deviceName,
      ipAddress: device.ipAddress,
      port: device.port,
      online,
      probeType: detectedProbe,
      serialNumber: detectedSerial,
      batchCount,
    };
  }

  async listBatches(
    companyId: number,
    deviceId: number,
  ): Promise<PositectorBatchSummary[]> {
    const device = await this.findById(companyId, deviceId);
    const baseUrl = this.deviceBaseUrl(device);

    const html = await this.fetchFromDevice(`${baseUrl}/usbms/`, 10000);
    const batchDirs = this.parseBatchDirectoryListing(html);

    const summaries = await Promise.all(
      batchDirs.map(async (buid) => {
        try {
          const header = await this.fetchBatchHeader(baseUrl, buid);
          return {
            buid,
            name: header.batchName,
            probeType: header.probeType,
            readingCount: header.readingCount,
          };
        } catch {
          return {
            buid,
            name: buid,
            probeType: null,
            readingCount: 0,
          };
        }
      }),
    );

    await this.deviceRepo.update(
      { id: device.id },
      { lastConnectedAt: new Date() },
    );

    return summaries;
  }

  async fetchBatch(
    companyId: number,
    deviceId: number,
    buid: string,
  ): Promise<PositectorBatch> {
    const device = await this.findById(companyId, deviceId);
    const baseUrl = this.deviceBaseUrl(device);

    const header = await this.fetchBatchHeader(baseUrl, buid);
    const readings = await this.fetchBatchReadings(baseUrl, buid);

    let statistics: Record<string, string> | null = null;
    try {
      const statsText = await this.fetchFromDevice(
        `${baseUrl}/usbms/${buid}/statistics.txt`,
        10000,
      );
      statistics = this.parseHeaderTxt(statsText);
    } catch {
      this.logger.debug(`No statistics.txt found for batch ${buid}`);
    }

    await this.deviceRepo.update(
      { id: device.id },
      { lastConnectedAt: new Date() },
    );

    return { buid, header, readings, statistics };
  }

  parseBatchFromUpload(
    headerTxt: string | null,
    readingsTxt: string | null,
    jsonContent: string | null,
  ): PositectorBatch {
    if (jsonContent) {
      return this.parseJsonBatch(jsonContent);
    }

    if (!headerTxt || !readingsTxt) {
      throw new BadRequestException(
        "Upload must include either a JSON batch file or both header.txt and readings.txt",
      );
    }

    const header = this.parseHeaderToStruct(this.parseHeaderTxt(headerTxt));
    const readings = this.parseCsvReadings(readingsTxt);

    return {
      buid: "upload",
      header,
      readings,
      statistics: null,
    };
  }

  detectQcEntityType(
    probeType: string | null,
  ): "dft" | "blast_profile" | "shore_hardness" | "environmental" | "pull_test" | "unknown" {
    if (!probeType) return "unknown";

    const normalized = probeType.toUpperCase();

    if (normalized.includes("6000") || normalized.includes("200")) return "dft";
    if (normalized.includes("SPG") || normalized.includes("RTR")) return "blast_profile";
    if (normalized.includes("SHD")) return "shore_hardness";
    if (normalized.includes("DPM")) return "environmental";
    if (normalized.includes("AT")) return "pull_test";

    return "unknown";
  }

  private deviceBaseUrl(device: PositectorDevice): string {
    return `http://${device.ipAddress}:${device.port}`;
  }

  private async fetchFromDevice(
    url: string,
    timeoutMs: number,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.text();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Connection timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseBatchDirectoryListing(html: string): string[] {
    const matches = html.match(/href="([^"]+)\/"/g);

    if (!matches) return [];

    return matches
      .map((m) => {
        const match = m.match(/href="([^"]+)\/"/);
        return match ? match[1] : null;
      })
      .filter(
        (dir): dir is string =>
          dir !== null && dir !== ".." && dir !== "." && !dir.startsWith("/"),
      );
  }

  private async fetchBatchHeader(
    baseUrl: string,
    buid: string,
  ): Promise<PositectorBatchHeader> {
    try {
      const jsonText = await this.fetchFromDevice(
        `${baseUrl}/usbms/${buid}/${buid}.json`,
        10000,
      );
      const batch = this.parseJsonBatch(jsonText);
      return batch.header;
    } catch {
      const headerText = await this.fetchFromDevice(
        `${baseUrl}/usbms/${buid}/header.txt`,
        10000,
      );
      const raw = this.parseHeaderTxt(headerText);
      return this.parseHeaderToStruct(raw);
    }
  }

  private async fetchBatchReadings(
    baseUrl: string,
    buid: string,
  ): Promise<PositectorReading[]> {
    try {
      const jsonText = await this.fetchFromDevice(
        `${baseUrl}/usbms/${buid}/${buid}.json`,
        10000,
      );
      const batch = this.parseJsonBatch(jsonText);
      return batch.readings;
    } catch {
      const csvText = await this.fetchFromDevice(
        `${baseUrl}/usbms/${buid}/readings.txt`,
        10000,
      );
      return this.parseCsvReadings(csvText);
    }
  }

  private parseHeaderTxt(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    lines.forEach((line) => {
      const separatorIdx = line.indexOf(",");

      if (separatorIdx > 0) {
        const key = line.substring(0, separatorIdx).trim();
        const value = line.substring(separatorIdx + 1).trim();
        result[key] = value;
      }
    });

    return result;
  }

  private parseHeaderToStruct(
    raw: Record<string, string>,
  ): PositectorBatchHeader {
    const serialKey = Object.keys(raw).find((k) =>
      k.toLowerCase().includes("serial"),
    );
    const probeKey = Object.keys(raw).find(
      (k) =>
        k.toLowerCase().includes("probe") ||
        k.toLowerCase().includes("model") ||
        k.toLowerCase().includes("type"),
    );
    const batchKey = Object.keys(raw).find(
      (k) =>
        k.toLowerCase().includes("batch") ||
        k.toLowerCase().includes("name"),
    );
    const unitsKey = Object.keys(raw).find((k) =>
      k.toLowerCase().includes("units"),
    );
    const countKey = Object.keys(raw).find(
      (k) =>
        k.toLowerCase().includes("count") ||
        k.toLowerCase().includes("readings"),
    );

    return {
      serialNumber: serialKey ? raw[serialKey] : null,
      probeType: probeKey ? raw[probeKey] : null,
      batchName: batchKey ? raw[batchKey] : null,
      model: probeKey ? raw[probeKey] : null,
      units: unitsKey ? raw[unitsKey] : null,
      readingCount: countKey ? parseInt(raw[countKey], 10) || 0 : 0,
      raw,
    };
  }

  private parseCsvReadings(text: string): PositectorReading[] {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length === 0) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

    const valueIdx = headers.findIndex(
      (h) =>
        h.includes("reading") ||
        h.includes("thickness") ||
        h.includes("value") ||
        h.includes("hardness") ||
        h.includes("profile") ||
        h.includes("measurement"),
    );
    const unitsIdx = headers.findIndex((h) => h.includes("units"));
    const timeIdx = headers.findIndex(
      (h) => h.includes("time") || h.includes("date"),
    );

    const readingColumnIdx = valueIdx >= 0 ? valueIdx : 0;

    return lines.slice(1).map((line, index) => {
      const cols = line.split(",").map((c) => c.trim());
      const rawRecord: Record<string, string> = {};

      headers.forEach((header, i) => {
        if (i < cols.length) {
          rawRecord[header] = cols[i];
        }
      });

      const valueStr = cols[readingColumnIdx] ?? "0";
      const parsed = parseFloat(valueStr);

      return {
        index: index + 1,
        value: isNaN(parsed) ? 0 : parsed,
        units: unitsIdx >= 0 && cols[unitsIdx] ? cols[unitsIdx] : null,
        timestamp: timeIdx >= 0 && cols[timeIdx] ? cols[timeIdx] : null,
        raw: rawRecord,
      };
    });
  }

  private parseJsonBatch(jsonText: string): PositectorBatch {
    const data = JSON.parse(jsonText);

    const probeType =
      data.ProbeType ?? data.probeType ?? data.Model ?? data.model ?? null;
    const serialNumber =
      data.SerialNumber ?? data.serialNumber ?? data.Serial ?? data.serial ?? null;
    const batchName =
      data.BatchName ?? data.batchName ?? data.Name ?? data.name ?? null;
    const units = data.Units ?? data.units ?? null;

    const rawReadings: any[] =
      data.Readings ?? data.readings ?? data.Data ?? data.data ?? [];

    const readings: PositectorReading[] = rawReadings.map(
      (r: any, index: number) => {
        const value =
          r.Value ?? r.value ?? r.Reading ?? r.reading ?? r.Thickness ?? r.thickness ?? 0;
        const readingUnits = r.Units ?? r.units ?? units;
        const timestamp =
          r.Timestamp ?? r.timestamp ?? r.DateTime ?? r.dateTime ?? null;

        const raw: Record<string, string> = {};
        Object.entries(r).forEach(([k, v]) => {
          raw[k] = String(v);
        });

        return {
          index: index + 1,
          value: typeof value === "number" ? value : parseFloat(String(value)) || 0,
          units: readingUnits,
          timestamp,
          raw,
        };
      },
    );

    return {
      buid: data.BUID ?? data.buid ?? "json",
      header: {
        serialNumber,
        probeType,
        batchName,
        model: probeType,
        units,
        readingCount: readings.length,
        raw: Object.fromEntries(
          Object.entries(data)
            .filter(([k]) => k !== "Readings" && k !== "readings" && k !== "Data" && k !== "data")
            .map(([k, v]) => [k, String(v)]),
        ),
      },
      readings,
      statistics: null,
    };
  }
}
