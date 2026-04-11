import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  StockTakeVarianceCategory,
  type VarianceCategorySeverity,
} from "../entities/stock-take-variance-category.entity";

export interface CreateVarianceCategoryDto {
  slug: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  requiresPhoto?: boolean;
  requiresIncidentRef?: boolean;
  notifyOnSubmit?: string[];
  severity?: VarianceCategorySeverity;
}

export type UpdateVarianceCategoryDto = Partial<CreateVarianceCategoryDto> & {
  active?: boolean;
};

interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  severity: VarianceCategorySeverity;
  requiresPhoto: boolean;
  notifyOnSubmit: string[];
  sortOrder: number;
}

const SEED_CATEGORIES: ReadonlyArray<SeedCategory> = [
  {
    slug: "damaged",
    name: "Damaged / Unusable",
    description: "Item is physically damaged and cannot be used",
    severity: "medium",
    requiresPhoto: true,
    notifyOnSubmit: [],
    sortOrder: 10,
  },
  {
    slug: "miscounted",
    name: "Miscounted / Recount Needed",
    description: "Counting error, recount likely required",
    severity: "low",
    requiresPhoto: false,
    notifyOnSubmit: [],
    sortOrder: 20,
  },
  {
    slug: "shrinkage",
    name: "Unexplained Shrinkage",
    description: "Stock missing without identifiable cause",
    severity: "medium",
    requiresPhoto: false,
    notifyOnSubmit: ["accounts"],
    sortOrder: 30,
  },
  {
    slug: "theft",
    name: "Suspected Theft",
    description: "Stock missing under circumstances suggesting theft",
    severity: "critical",
    requiresPhoto: true,
    notifyOnSubmit: ["accounts", "admin"],
    sortOrder: 40,
  },
  {
    slug: "found_wrong_shelf",
    name: "Found in Different Location",
    description: "Item discovered in a location other than where the system expected",
    severity: "low",
    requiresPhoto: false,
    notifyOnSubmit: [],
    sortOrder: 50,
  },
  {
    slug: "spillage",
    name: "Spillage / Contamination",
    description: "Liquid spilled or contaminated, partial loss",
    severity: "medium",
    requiresPhoto: true,
    notifyOnSubmit: [],
    sortOrder: 60,
  },
  {
    slug: "expired",
    name: "Past Shelf Life",
    description: "Stock has passed its expiry / shelf life date",
    severity: "low",
    requiresPhoto: true,
    notifyOnSubmit: ["accounts"],
    sortOrder: 70,
  },
  {
    slug: "not_received",
    name: "Not Actually Received (GRN Error)",
    description: "Stock was booked in but never physically received",
    severity: "high",
    requiresPhoto: false,
    notifyOnSubmit: ["accounts", "admin"],
    sortOrder: 80,
  },
  {
    slug: "conversion_loss",
    name: "Converted to Offcuts/Wastage",
    description: "Stock was converted to offcuts or wastage during fabrication",
    severity: "low",
    requiresPhoto: false,
    notifyOnSubmit: [],
    sortOrder: 90,
  },
  {
    slug: "data_entry_error",
    name: "System Data Entry Error",
    description: "Variance is due to a previous data entry mistake, not physical stock",
    severity: "medium",
    requiresPhoto: false,
    notifyOnSubmit: ["accounts"],
    sortOrder: 100,
  },
];

@Injectable()
export class VarianceCategoryService {
  private readonly logger = new Logger(VarianceCategoryService.name);

  constructor(
    @InjectRepository(StockTakeVarianceCategory)
    private readonly categoryRepo: Repository<StockTakeVarianceCategory>,
  ) {}

  async list(companyId: number, includeInactive = false): Promise<StockTakeVarianceCategory[]> {
    const where: { companyId: number; active?: boolean } = { companyId };
    if (!includeInactive) {
      where.active = true;
    }
    return this.categoryRepo.find({ where, order: { sortOrder: "ASC", name: "ASC" } });
  }

  async byId(companyId: number, id: number): Promise<StockTakeVarianceCategory> {
    const category = await this.categoryRepo.findOne({ where: { id, companyId } });
    if (!category) {
      throw new NotFoundException(`Variance category ${id} not found`);
    }
    return category;
  }

  async create(
    companyId: number,
    dto: CreateVarianceCategoryDto,
  ): Promise<StockTakeVarianceCategory> {
    const existing = await this.categoryRepo.findOne({
      where: { companyId, slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Variance category with slug "${dto.slug}" already exists`);
    }
    const created = this.categoryRepo.create({
      companyId,
      slug: dto.slug,
      name: dto.name,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 100,
      requiresPhoto: dto.requiresPhoto ?? false,
      requiresIncidentRef: dto.requiresIncidentRef ?? false,
      notifyOnSubmit: dto.notifyOnSubmit ?? [],
      severity: dto.severity ?? "low",
      active: true,
    });
    return this.categoryRepo.save(created);
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateVarianceCategoryDto,
  ): Promise<StockTakeVarianceCategory> {
    const category = await this.byId(companyId, id);
    if (typeof dto.name === "string") category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (typeof dto.sortOrder === "number") category.sortOrder = dto.sortOrder;
    if (typeof dto.requiresPhoto === "boolean") category.requiresPhoto = dto.requiresPhoto;
    if (typeof dto.requiresIncidentRef === "boolean") {
      category.requiresIncidentRef = dto.requiresIncidentRef;
    }
    if (dto.notifyOnSubmit !== undefined) category.notifyOnSubmit = dto.notifyOnSubmit;
    if (dto.severity !== undefined) category.severity = dto.severity;
    if (typeof dto.active === "boolean") category.active = dto.active;
    return this.categoryRepo.save(category);
  }

  async ensureSeedDataForCompany(companyId: number): Promise<number> {
    const existing = await this.categoryRepo.find({ where: { companyId } });
    const existingSlugs = new Set(existing.map((c) => c.slug));
    const toCreate = SEED_CATEGORIES.filter((seed) => !existingSlugs.has(seed.slug));
    if (toCreate.length === 0) {
      return 0;
    }
    const records = toCreate.map((seed) =>
      this.categoryRepo.create({
        companyId,
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        sortOrder: seed.sortOrder,
        requiresPhoto: seed.requiresPhoto,
        requiresIncidentRef: false,
        notifyOnSubmit: seed.notifyOnSubmit,
        severity: seed.severity,
        active: true,
      }),
    );
    await this.categoryRepo.save(records);
    this.logger.log(
      `Seeded ${records.length} default variance categories for company ${companyId}`,
    );
    return records.length;
  }
}
