import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, ILike, Repository } from "typeorm";
import type {
  CreateIssuableProductDto,
  IssuableProductFilters,
  PaintProductExtraDto,
  RubberRollExtraDto,
  SolutionExtraDto,
  UpdateIssuableProductDto,
} from "../dto/issuable-product.dto";
import { ConsumableProduct } from "../entities/consumable-product.entity";
import { IssuableProduct, type IssuableProductType } from "../entities/issuable-product.entity";
import { PaintProduct } from "../entities/paint-product.entity";
import { RubberOffcutStock } from "../entities/rubber-offcut-stock.entity";
import { RubberRoll } from "../entities/rubber-roll.entity";
import { SolutionProduct } from "../entities/solution-product.entity";

export interface IssuableProductListResult {
  items: IssuableProduct[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

@Injectable()
export class IssuableProductService {
  constructor(
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    @InjectRepository(ConsumableProduct)
    private readonly consumableRepo: Repository<ConsumableProduct>,
    @InjectRepository(PaintProduct)
    private readonly paintRepo: Repository<PaintProduct>,
    @InjectRepository(RubberRoll)
    private readonly rubberRollRepo: Repository<RubberRoll>,
    @InjectRepository(RubberOffcutStock)
    private readonly rubberOffcutRepo: Repository<RubberOffcutStock>,
    @InjectRepository(SolutionProduct)
    private readonly solutionRepo: Repository<SolutionProduct>,
  ) {}

  async list(
    companyId: number,
    filters: IssuableProductFilters = {},
  ): Promise<IssuableProductListResult> {
    const where: FindOptionsWhere<IssuableProduct> = { companyId };
    if (filters.productType) {
      where.productType = filters.productType;
    }
    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
    }
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    if (filters.search) {
      where.name = ILike(`%${filters.search}%`);
    }
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));
    const [items, total] = await this.productRepo.findAndCount({
      where,
      relations: {
        category: true,
        consumable: true,
        paint: true,
        rubberRoll: true,
        rubberOffcut: true,
        solution: true,
      },
      order: { name: "ASC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async byId(companyId: number, id: number): Promise<IssuableProduct> {
    const product = await this.productRepo.findOne({
      where: { id, companyId },
      relations: {
        category: true,
        consumable: true,
        paint: true,
        rubberRoll: true,
        rubberOffcut: true,
        solution: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Issuable product ${id} not found`);
    }
    return product;
  }

  async linkedParts(companyId: number, productId: number): Promise<IssuableProduct[]> {
    const product = await this.byId(companyId, productId);
    const groupKey = product.paint?.componentGroupKey;
    if (!groupKey) {
      return [];
    }
    const allInGroup = await this.productRepo.find({
      where: { companyId, productType: "paint" as IssuableProductType },
      relations: { paint: true },
    });
    return allInGroup.filter((p) => {
      const key = p.paint?.componentGroupKey;
      return key === groupKey && p.id !== productId;
    });
  }

  async create(companyId: number, dto: CreateIssuableProductDto): Promise<IssuableProduct> {
    const existing = await this.productRepo.findOne({
      where: { companyId, sku: dto.sku },
    });
    if (existing) {
      throw new ConflictException(`Product with SKU "${dto.sku}" already exists for this company`);
    }

    const product = this.productRepo.create({
      companyId,
      productType: dto.productType,
      sku: dto.sku,
      name: dto.name,
      description: dto.description ?? null,
      categoryId: dto.categoryId ?? null,
      unitOfMeasure: dto.unitOfMeasure ?? "each",
      costPerUnit: dto.costPerUnit ?? 0,
      quantity: dto.quantity ?? 0,
      minStockLevel: dto.minStockLevel ?? 0,
      locationId: dto.locationId ?? null,
      photoUrl: dto.photoUrl ?? null,
      active: dto.active ?? true,
    });
    const saved = await this.productRepo.save(product);

    if (dto.productType === "consumable") {
      await this.consumableRepo.save(
        this.consumableRepo.create({
          productId: saved.id,
          notes: dto.consumable?.notes ?? null,
        }),
      );
    } else if (dto.productType === "paint") {
      await this.paintRepo.save(this.buildPaintChild(saved.id, dto.paint));
    } else if (dto.productType === "rubber_roll") {
      if (!dto.rubberRoll) {
        throw new BadRequestException(
          "rubberRoll detail is required when creating a rubber_roll product",
        );
      }
      await this.rubberRollRepo.save(this.buildRubberRollChild(saved.id, dto.rubberRoll));
    } else if (dto.productType === "solution") {
      await this.solutionRepo.save(this.buildSolutionChild(saved.id, dto.solution));
    }

    return this.byId(companyId, saved.id);
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateIssuableProductDto,
  ): Promise<IssuableProduct> {
    const product = await this.byId(companyId, id);
    if (typeof dto.sku === "string" && dto.sku !== product.sku) {
      const conflict = await this.productRepo.findOne({
        where: { companyId, sku: dto.sku },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
      }
      product.sku = dto.sku;
    }
    if (typeof dto.name === "string") product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (typeof dto.unitOfMeasure === "string") product.unitOfMeasure = dto.unitOfMeasure;
    if (typeof dto.costPerUnit === "number") product.costPerUnit = dto.costPerUnit;
    if (typeof dto.quantity === "number") product.quantity = dto.quantity;
    if (typeof dto.minStockLevel === "number") product.minStockLevel = dto.minStockLevel;
    if (dto.locationId !== undefined) product.locationId = dto.locationId;
    if (dto.photoUrl !== undefined) product.photoUrl = dto.photoUrl;
    if (typeof dto.active === "boolean") product.active = dto.active;
    await this.productRepo.save(product);

    if (product.productType === "consumable" && dto.consumable) {
      const child =
        (await this.consumableRepo.findOne({ where: { productId: id } })) ??
        this.consumableRepo.create({ productId: id, notes: null });
      if (dto.consumable.notes !== undefined) child.notes = dto.consumable.notes;
      await this.consumableRepo.save(child);
    } else if (product.productType === "paint" && dto.paint) {
      const child =
        (await this.paintRepo.findOne({ where: { productId: id } })) ??
        this.buildPaintChild(id, undefined);
      this.applyPaintUpdate(child, dto.paint);
      await this.paintRepo.save(child);
    } else if (product.productType === "rubber_roll" && dto.rubberRoll) {
      const child = await this.rubberRollRepo.findOne({ where: { productId: id } });
      if (!child) {
        throw new NotFoundException(`Rubber roll detail row not found for product ${id}`);
      }
      this.applyRubberRollUpdate(child, dto.rubberRoll);
      await this.rubberRollRepo.save(child);
    } else if (product.productType === "solution" && dto.solution) {
      const child =
        (await this.solutionRepo.findOne({ where: { productId: id } })) ??
        this.buildSolutionChild(id, undefined);
      this.applySolutionUpdate(child, dto.solution);
      await this.solutionRepo.save(child);
    }

    return this.byId(companyId, id);
  }

  async softDelete(companyId: number, id: number): Promise<IssuableProduct> {
    const product = await this.byId(companyId, id);
    product.active = false;
    await this.productRepo.save(product);
    return product;
  }

  async findByLegacyStockItemId(
    companyId: number,
    legacyStockItemId: number,
  ): Promise<IssuableProduct | null> {
    return this.productRepo.findOne({
      where: { companyId, legacyStockItemId },
    });
  }

  async countByType(companyId: number): Promise<Record<IssuableProductType, number>> {
    const rows = await this.productRepo
      .createQueryBuilder("p")
      .select("p.product_type", "type")
      .addSelect("COUNT(*)", "count")
      .where("p.company_id = :companyId", { companyId })
      .groupBy("p.product_type")
      .getRawMany<{ type: IssuableProductType; count: string }>();
    const initial: Record<IssuableProductType, number> = {
      consumable: 0,
      paint: 0,
      rubber_roll: 0,
      rubber_offcut: 0,
      solution: 0,
    };
    return rows.reduce((acc, row) => {
      acc[row.type] = Number(row.count);
      return acc;
    }, initial);
  }

  private buildPaintChild(productId: number, dto: PaintProductExtraDto | undefined): PaintProduct {
    const child = this.paintRepo.create({ productId, isBanding: false });
    if (dto) {
      this.applyPaintUpdate(child, dto);
    }
    return child;
  }

  private applyPaintUpdate(child: PaintProduct, dto: Partial<PaintProductExtraDto>): void {
    if (dto.coverageM2PerLitre !== undefined) child.coverageM2PerLitre = dto.coverageM2PerLitre;
    if (dto.wetFilmThicknessUm !== undefined) child.wetFilmThicknessUm = dto.wetFilmThicknessUm;
    if (dto.dryFilmThicknessUm !== undefined) child.dryFilmThicknessUm = dto.dryFilmThicknessUm;
    if (dto.coatType !== undefined) child.coatType = dto.coatType;
    if (dto.paintSystem !== undefined) child.paintSystem = dto.paintSystem;
    if (dto.numberOfParts !== undefined) child.numberOfParts = dto.numberOfParts;
    if (dto.mixingRatio !== undefined) child.mixingRatio = dto.mixingRatio;
    if (dto.potLifeMinutes !== undefined) child.potLifeMinutes = dto.potLifeMinutes;
    if (dto.isBanding !== undefined) child.isBanding = dto.isBanding;
    if (dto.supplierProductCode !== undefined) child.supplierProductCode = dto.supplierProductCode;
    if (dto.colourCode !== undefined) child.colourCode = dto.colourCode;
    if (dto.glossLevel !== undefined) child.glossLevel = dto.glossLevel;
    if (dto.vocContentGPerL !== undefined) child.vocContentGPerL = dto.vocContentGPerL;
    if (dto.densityKgPerL !== undefined) child.densityKgPerL = dto.densityKgPerL;
    if (dto.datasheetUrl !== undefined) child.datasheetUrl = dto.datasheetUrl;
    if (dto.msdsUrl !== undefined) child.msdsUrl = dto.msdsUrl;
    if (dto.thinnerReference !== undefined) child.thinnerReference = dto.thinnerReference;
    if (dto.shelfLifeMonths !== undefined) child.shelfLifeMonths = dto.shelfLifeMonths;
    if (dto.surfacePrepRequirement !== undefined) {
      child.surfacePrepRequirement = dto.surfacePrepRequirement;
    }
    if (dto.minApplicationTempC !== undefined) child.minApplicationTempC = dto.minApplicationTempC;
    if (dto.maxApplicationTempC !== undefined) child.maxApplicationTempC = dto.maxApplicationTempC;
    if (dto.substrateCompatibility !== undefined) {
      child.substrateCompatibility = dto.substrateCompatibility;
    }
    if (dto.packSizeLitres !== undefined) child.packSizeLitres = dto.packSizeLitres;
    if (dto.componentGroupKey !== undefined) child.componentGroupKey = dto.componentGroupKey;
    if (dto.componentRole !== undefined) child.componentRole = dto.componentRole;
  }

  private buildRubberRollChild(productId: number, dto: RubberRollExtraDto): RubberRoll {
    const child = this.rubberRollRepo.create({
      productId,
      rollNumber: dto.rollNumber,
      status: dto.status ?? "available",
    });
    this.applyRubberRollUpdate(child, dto);
    return child;
  }

  private applyRubberRollUpdate(child: RubberRoll, dto: Partial<RubberRollExtraDto>): void {
    if (dto.rollNumber !== undefined) child.rollNumber = dto.rollNumber;
    if (dto.compoundCode !== undefined) child.compoundCode = dto.compoundCode;
    if (dto.compoundId !== undefined) child.compoundId = dto.compoundId;
    if (dto.colour !== undefined) child.colour = dto.colour;
    if (dto.widthMm !== undefined) child.widthMm = dto.widthMm;
    if (dto.thicknessMm !== undefined) child.thicknessMm = dto.thicknessMm;
    if (dto.lengthM !== undefined) child.lengthM = dto.lengthM;
    if (dto.weightKg !== undefined) child.weightKg = dto.weightKg;
    if (dto.batchNumber !== undefined) child.batchNumber = dto.batchNumber;
    if (dto.supplierName !== undefined) child.supplierName = dto.supplierName;
    if (dto.receivedAt !== undefined) {
      child.receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : null;
    }
    if (dto.status !== undefined) child.status = dto.status;
    if (dto.densityOverrideKgPerM3 !== undefined) {
      child.densityOverrideKgPerM3 = dto.densityOverrideKgPerM3;
    }
  }

  private buildSolutionChild(
    productId: number,
    dto: SolutionExtraDto | undefined,
  ): SolutionProduct {
    const child = this.solutionRepo.create({ productId });
    if (dto) {
      this.applySolutionUpdate(child, dto);
    }
    return child;
  }

  private applySolutionUpdate(child: SolutionProduct, dto: Partial<SolutionExtraDto>): void {
    if (dto.activeIngredient !== undefined) child.activeIngredient = dto.activeIngredient;
    if (dto.concentrationPct !== undefined) child.concentrationPct = dto.concentrationPct;
    if (dto.densityKgPerL !== undefined) child.densityKgPerL = dto.densityKgPerL;
    if (dto.hazardClassification !== undefined) {
      child.hazardClassification = dto.hazardClassification;
    }
    if (dto.storageRequirement !== undefined) child.storageRequirement = dto.storageRequirement;
    if (dto.shelfLifeMonths !== undefined) child.shelfLifeMonths = dto.shelfLifeMonths;
    if (dto.notes !== undefined) child.notes = dto.notes;
  }
}
