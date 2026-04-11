import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  RubberCompound,
  type RubberCompoundDatasheetStatus,
  type RubberCompoundFamily,
} from "../entities/rubber-compound.entity";
import { StockManagementNotificationsService } from "./stock-management-notifications.service";

export interface CreateRubberCompoundDto {
  code: string;
  name: string;
  supplierId?: number | null;
  supplierName?: string | null;
  compoundFamily?: RubberCompoundFamily;
  shoreHardness?: number | null;
  densityKgPerM3?: number | null;
  specificGravity?: number | null;
  tempRangeMinC?: number | null;
  tempRangeMaxC?: number | null;
  elongationAtBreakPct?: number | null;
  tensileStrengthMpa?: number | null;
  chemicalResistance?: string[] | null;
  defaultColour?: string | null;
  notes?: string | null;
}

export type UpdateRubberCompoundDto = Partial<CreateRubberCompoundDto> & {
  active?: boolean;
};

interface SeedCompound {
  code: string;
  name: string;
  family: RubberCompoundFamily;
  shoreHardness: number;
  densityKgPerM3: number;
  defaultColour: string;
  tempMin: number;
  tempMax: number;
}

const SEED_COMPOUNDS: ReadonlyArray<SeedCompound> = [
  {
    code: "NR60",
    name: "Natural Rubber 60 Shore A",
    family: "NR",
    shoreHardness: 60,
    densityKgPerM3: 920,
    defaultColour: "black",
    tempMin: -50,
    tempMax: 70,
  },
  {
    code: "NR70",
    name: "Natural Rubber 70 Shore A",
    family: "NR",
    shoreHardness: 70,
    densityKgPerM3: 920,
    defaultColour: "black",
    tempMin: -50,
    tempMax: 70,
  },
  {
    code: "SBR60",
    name: "SBR 60 Shore A",
    family: "SBR",
    shoreHardness: 60,
    densityKgPerM3: 940,
    defaultColour: "black",
    tempMin: -40,
    tempMax: 90,
  },
  {
    code: "SBR70",
    name: "SBR 70 Shore A",
    family: "SBR",
    shoreHardness: 70,
    densityKgPerM3: 940,
    defaultColour: "black",
    tempMin: -40,
    tempMax: 90,
  },
  {
    code: "NBR70",
    name: "Nitrile (NBR) 70 Shore A",
    family: "NBR",
    shoreHardness: 70,
    densityKgPerM3: 1000,
    defaultColour: "black",
    tempMin: -30,
    tempMax: 100,
  },
  {
    code: "EPDM65",
    name: "EPDM 65 Shore A",
    family: "EPDM",
    shoreHardness: 65,
    densityKgPerM3: 860,
    defaultColour: "black",
    tempMin: -50,
    tempMax: 130,
  },
  {
    code: "CR65",
    name: "Neoprene (CR) 65 Shore A",
    family: "CR",
    shoreHardness: 65,
    densityKgPerM3: 1230,
    defaultColour: "black",
    tempMin: -40,
    tempMax: 100,
  },
  {
    code: "FKM75",
    name: "Viton (FKM) 75 Shore A",
    family: "FKM",
    shoreHardness: 75,
    densityKgPerM3: 1800,
    defaultColour: "black",
    tempMin: -20,
    tempMax: 200,
  },
  {
    code: "IIR60",
    name: "Butyl (IIR) 60 Shore A",
    family: "IIR",
    shoreHardness: 60,
    densityKgPerM3: 920,
    defaultColour: "black",
    tempMin: -40,
    tempMax: 100,
  },
];

@Injectable()
export class RubberCompoundService {
  private readonly logger = new Logger(RubberCompoundService.name);

  constructor(
    @InjectRepository(RubberCompound)
    private readonly compoundRepo: Repository<RubberCompound>,
    @Inject(forwardRef(() => StockManagementNotificationsService))
    private readonly notifications: StockManagementNotificationsService,
  ) {}

  async list(companyId: number, includeInactive = false): Promise<RubberCompound[]> {
    const where: { companyId: number; active?: boolean } = { companyId };
    if (!includeInactive) {
      where.active = true;
    }
    return this.compoundRepo.find({
      where,
      order: { compoundFamily: "ASC", shoreHardness: "ASC", name: "ASC" },
    });
  }

  async byId(companyId: number, id: number): Promise<RubberCompound> {
    const compound = await this.compoundRepo.findOne({ where: { id, companyId } });
    if (!compound) {
      throw new NotFoundException(`Rubber compound ${id} not found`);
    }
    return compound;
  }

  async byCode(companyId: number, code: string): Promise<RubberCompound | null> {
    return this.compoundRepo.findOne({ where: { companyId, code } });
  }

  async create(companyId: number, dto: CreateRubberCompoundDto): Promise<RubberCompound> {
    const existing = await this.compoundRepo.findOne({
      where: { companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Rubber compound with code "${dto.code}" already exists`);
    }
    const created = this.compoundRepo.create({
      companyId,
      code: dto.code,
      name: dto.name,
      supplierId: dto.supplierId ?? null,
      supplierName: dto.supplierName ?? null,
      compoundFamily: dto.compoundFamily ?? "other",
      shoreHardness: dto.shoreHardness ?? null,
      densityKgPerM3: dto.densityKgPerM3 ?? null,
      specificGravity: dto.specificGravity ?? null,
      tempRangeMinC: dto.tempRangeMinC ?? null,
      tempRangeMaxC: dto.tempRangeMaxC ?? null,
      elongationAtBreakPct: dto.elongationAtBreakPct ?? null,
      tensileStrengthMpa: dto.tensileStrengthMpa ?? null,
      chemicalResistance: dto.chemicalResistance ?? null,
      defaultColour: dto.defaultColour ?? null,
      notes: dto.notes ?? null,
      datasheetStatus: "missing",
      active: true,
    });
    const saved = await this.compoundRepo.save(created);
    void this.notifications
      .notifyMissingDatasheet({
        productType: "rubber_compound",
        productId: saved.id,
        productName: saved.name,
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to fire missing-datasheet notification for compound ${saved.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    return saved;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateRubberCompoundDto,
  ): Promise<RubberCompound> {
    const compound = await this.byId(companyId, id);
    if (typeof dto.code === "string") compound.code = dto.code;
    if (typeof dto.name === "string") compound.name = dto.name;
    if (dto.supplierId !== undefined) compound.supplierId = dto.supplierId;
    if (dto.supplierName !== undefined) compound.supplierName = dto.supplierName;
    if (dto.compoundFamily !== undefined) compound.compoundFamily = dto.compoundFamily;
    if (dto.shoreHardness !== undefined) compound.shoreHardness = dto.shoreHardness;
    if (dto.densityKgPerM3 !== undefined) compound.densityKgPerM3 = dto.densityKgPerM3;
    if (dto.specificGravity !== undefined) compound.specificGravity = dto.specificGravity;
    if (dto.tempRangeMinC !== undefined) compound.tempRangeMinC = dto.tempRangeMinC;
    if (dto.tempRangeMaxC !== undefined) compound.tempRangeMaxC = dto.tempRangeMaxC;
    if (dto.elongationAtBreakPct !== undefined) {
      compound.elongationAtBreakPct = dto.elongationAtBreakPct;
    }
    if (dto.tensileStrengthMpa !== undefined) compound.tensileStrengthMpa = dto.tensileStrengthMpa;
    if (dto.chemicalResistance !== undefined) compound.chemicalResistance = dto.chemicalResistance;
    if (dto.defaultColour !== undefined) compound.defaultColour = dto.defaultColour;
    if (dto.notes !== undefined) compound.notes = dto.notes;
    if (typeof dto.active === "boolean") compound.active = dto.active;
    return this.compoundRepo.save(compound);
  }

  async setDatasheetStatus(
    id: number,
    status: RubberCompoundDatasheetStatus,
    datasheetId?: number,
  ): Promise<void> {
    await this.compoundRepo.update(id, {
      datasheetStatus: status,
      ...(datasheetId !== undefined ? { lastExtractionDatasheetId: datasheetId } : {}),
    });
  }

  async ensureSeedCompoundsForCompany(companyId: number): Promise<number> {
    const existing = await this.compoundRepo.find({ where: { companyId } });
    const existingCodes = new Set(existing.map((c) => c.code));
    const toCreate = SEED_COMPOUNDS.filter((seed) => !existingCodes.has(seed.code));
    if (toCreate.length === 0) {
      return 0;
    }
    const records = toCreate.map((seed) =>
      this.compoundRepo.create({
        companyId,
        code: seed.code,
        name: seed.name,
        compoundFamily: seed.family,
        shoreHardness: seed.shoreHardness,
        densityKgPerM3: seed.densityKgPerM3,
        specificGravity: seed.densityKgPerM3 / 1000,
        defaultColour: seed.defaultColour,
        tempRangeMinC: seed.tempMin,
        tempRangeMaxC: seed.tempMax,
        datasheetStatus: "missing",
        active: true,
      }),
    );
    await this.compoundRepo.save(records);
    this.logger.log(`Seeded ${records.length} rubber compounds for company ${companyId}`);
    return records.length;
  }

  fallbackDensityForFamily(family: RubberCompoundFamily): number {
    const map: Record<RubberCompoundFamily, number> = {
      NR: 920,
      SBR: 940,
      NBR: 1000,
      EPDM: 860,
      CR: 1230,
      FKM: 1800,
      IIR: 920,
      BR: 920,
      CSM: 1300,
      PU: 1100,
      other: 1000,
    };
    return map[family];
  }
}
