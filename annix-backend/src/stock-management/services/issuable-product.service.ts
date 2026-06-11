import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateIssuableProductDto,
  IssuableProductFilters,
  PaintProductExtraDto,
  RubberRollExtraDto,
  SolutionExtraDto,
  UpdateIssuableProductDto,
} from "../dto/issuable-product.dto";
import { IssuableProduct, type IssuableProductType } from "../entities/issuable-product.entity";
import { PaintProduct } from "../entities/paint-product.entity";
import { RubberRoll } from "../entities/rubber-roll.entity";
import { SolutionProduct } from "../entities/solution-product.entity";
import { ConsumableProductRepository } from "../repositories/consumable-product.repository";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { PaintProductRepository } from "../repositories/paint-product.repository";
import { RubberRollRepository } from "../repositories/rubber-roll.repository";
import { SolutionProductRepository } from "../repositories/solution-product.repository";

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
    private readonly productRepo: IssuableProductRepository,
    private readonly consumableRepo: ConsumableProductRepository,
    private readonly paintRepo: PaintProductRepository,
    private readonly rubberRollRepo: RubberRollRepository,
    private readonly solutionRepo: SolutionProductRepository,
  ) {}

  async list(
    companyId: number,
    filters: IssuableProductFilters = {},
  ): Promise<IssuableProductListResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));
    const { items, total } = await this.productRepo.findPaginatedForCompany(
      {
        companyId,
        productType: filters.productType,
        categoryId: filters.categoryId,
        active: filters.active,
      },
      filters.search,
      (page - 1) * pageSize,
      pageSize,
    );
    return { items, total, page, pageSize };
  }

  async byId(companyId: number, id: number): Promise<IssuableProduct> {
    const product = await this.productRepo.findByIdForCompanyWithDetail(companyId, id);
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
    const allInGroup = await this.productRepo.findAllOfTypeWithPaint(
      companyId,
      "paint" as IssuableProductType,
    );
    return allInGroup.filter((p) => {
      const key = p.paint?.componentGroupKey;
      return key === groupKey && p.id !== productId;
    });
  }

  async create(companyId: number, dto: CreateIssuableProductDto): Promise<IssuableProduct> {
    const existing = await this.productRepo.findBySkuForCompany(companyId, dto.sku);
    if (existing) {
      throw new ConflictException(`Product with SKU "${dto.sku}" already exists for this company`);
    }

    const product = this.productRepo.build({
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
        this.consumableRepo.build({
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
      const conflict = await this.productRepo.findBySkuForCompany(companyId, dto.sku);
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
        (await this.consumableRepo.findByProductId(id)) ??
        this.consumableRepo.build({ productId: id, notes: null });
      if (dto.consumable.notes !== undefined) child.notes = dto.consumable.notes;
      await this.consumableRepo.save(child);
    } else if (product.productType === "paint" && dto.paint) {
      const child =
        (await this.paintRepo.findByProductId(id)) ?? this.buildPaintChild(id, undefined);
      this.applyPaintUpdate(child, dto.paint);
      await this.paintRepo.save(child);
    } else if (product.productType === "rubber_roll" && dto.rubberRoll) {
      const child = await this.rubberRollRepo.findByProductId(id);
      if (!child) {
        throw new NotFoundException(`Rubber roll detail row not found for product ${id}`);
      }
      this.applyRubberRollUpdate(child, dto.rubberRoll);
      await this.rubberRollRepo.save(child);
    } else if (product.productType === "solution" && dto.solution) {
      const child =
        (await this.solutionRepo.findByProductId(id)) ?? this.buildSolutionChild(id, undefined);
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
    return this.productRepo.findByLegacyStockItemId(companyId, legacyStockItemId);
  }

  async adjustQuantity(companyId: number, id: number, delta: number): Promise<void> {
    const product = await this.productRepo.findByIdForCompany(companyId, id);
    if (!product) {
      return;
    }
    product.quantity = Math.max(0, Number(product.quantity || 0) + delta);
    await this.productRepo.save(product);
  }

  async countByType(companyId: number): Promise<Record<IssuableProductType, number>> {
    return this.productRepo.countByType(companyId);
  }

  private buildPaintChild(productId: number, dto: PaintProductExtraDto | undefined): PaintProduct {
    const child = this.paintRepo.build({ productId, isBanding: false });
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
    const child = this.rubberRollRepo.build({
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
    const child = this.solutionRepo.build({ productId });
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
