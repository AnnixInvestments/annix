import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from "../dto/product-category.dto";
import { ProductCategory, type ProductCategoryType } from "../entities/product-category.entity";

interface SeedCategory {
  productType: ProductCategoryType;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

const SEED_CATEGORIES: ReadonlyArray<SeedCategory> = [
  {
    productType: "consumable",
    slug: "tools",
    name: "Tools",
    description: "Hand tools, power tools, accessories",
    sortOrder: 10,
  },
  {
    productType: "consumable",
    slug: "cleaning",
    name: "Cleaning Supplies",
    description: "Brushes, rags, solvents, cleaning chemicals",
    sortOrder: 20,
  },
  {
    productType: "consumable",
    slug: "ppe",
    name: "PPE",
    description: "Personal protective equipment",
    sortOrder: 30,
  },
  {
    productType: "consumable",
    slug: "fasteners",
    name: "Fasteners & Hardware",
    description: "Bolts, nuts, screws, washers, brackets",
    sortOrder: 40,
  },
  {
    productType: "consumable",
    slug: "abrasives",
    name: "Abrasives",
    description: "Grit, blast media, sanding discs",
    sortOrder: 50,
  },
  {
    productType: "consumable",
    slug: "general",
    name: "General Consumables",
    description: "Miscellaneous shop consumables",
    sortOrder: 100,
  },
  {
    productType: "paint",
    slug: "epoxy-primer",
    name: "Epoxy Primer",
    description: "Two-part epoxy primer coatings",
    sortOrder: 10,
  },
  {
    productType: "paint",
    slug: "zinc-primer",
    name: "Zinc-Rich Primer",
    description: "Zinc-rich anti-corrosion primers",
    sortOrder: 20,
  },
  {
    productType: "paint",
    slug: "intermediate",
    name: "Intermediate Coat",
    description: "Mid-coat layer between primer and finish",
    sortOrder: 30,
  },
  {
    productType: "paint",
    slug: "polyurethane-finish",
    name: "Polyurethane Finish",
    description: "Polyurethane top coats",
    sortOrder: 40,
  },
  {
    productType: "paint",
    slug: "thinner",
    name: "Thinner",
    description: "Paint thinners and reducers",
    sortOrder: 50,
  },
  {
    productType: "paint",
    slug: "banding",
    name: "Banding Paint",
    description: "Banding and stripe coatings",
    sortOrder: 60,
  },
  {
    productType: "rubber_roll",
    slug: "sbr",
    name: "SBR (Styrene-Butadiene)",
    description: "SBR compound rubber rolls",
    sortOrder: 10,
  },
  {
    productType: "rubber_roll",
    slug: "natural",
    name: "Natural Rubber",
    description: "Natural rubber compound rolls",
    sortOrder: 20,
  },
  {
    productType: "rubber_roll",
    slug: "nitrile",
    name: "Nitrile (NBR)",
    description: "Nitrile-butadiene rubber rolls",
    sortOrder: 30,
  },
  {
    productType: "rubber_roll",
    slug: "epdm",
    name: "EPDM",
    description: "EPDM rubber rolls",
    sortOrder: 40,
  },
  {
    productType: "rubber_offcut",
    slug: "general-offcuts",
    name: "General Offcuts",
    description: "Allocatable rubber offcut pieces",
    sortOrder: 10,
  },
  {
    productType: "solution",
    slug: "test-reagent",
    name: "Test Reagent",
    description: "Quality test solutions and reagents",
    sortOrder: 10,
  },
];

@Injectable()
export class ProductCategoryService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
  ) {}

  async listForCompany(
    companyId: number,
    productType?: ProductCategoryType,
  ): Promise<ProductCategory[]> {
    const where: { companyId: number; productType?: ProductCategoryType } = { companyId };
    if (productType) {
      where.productType = productType;
    }
    return this.categoryRepo.find({
      where,
      order: { productType: "ASC", sortOrder: "ASC", name: "ASC" },
    });
  }

  async byId(companyId: number, id: number): Promise<ProductCategory> {
    const category = await this.categoryRepo.findOne({ where: { id, companyId } });
    if (!category) {
      throw new NotFoundException(`Product category ${id} not found`);
    }
    return category;
  }

  async create(companyId: number, dto: CreateProductCategoryDto): Promise<ProductCategory> {
    const existing = await this.categoryRepo.findOne({
      where: { companyId, productType: dto.productType, slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Category with slug "${dto.slug}" already exists for product type "${dto.productType}"`,
      );
    }
    const created = this.categoryRepo.create({
      companyId,
      productType: dto.productType,
      slug: dto.slug,
      name: dto.name,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 100,
      iconKey: dto.iconKey ?? null,
      workflowHints: dto.workflowHints ?? {},
      active: dto.active ?? true,
    });
    return this.categoryRepo.save(created);
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateProductCategoryDto,
  ): Promise<ProductCategory> {
    const category = await this.byId(companyId, id);
    if (typeof dto.name === "string") category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (typeof dto.sortOrder === "number") category.sortOrder = dto.sortOrder;
    if (dto.iconKey !== undefined) category.iconKey = dto.iconKey;
    if (dto.workflowHints !== undefined) category.workflowHints = dto.workflowHints;
    if (typeof dto.active === "boolean") category.active = dto.active;
    return this.categoryRepo.save(category);
  }

  async softDelete(companyId: number, id: number): Promise<ProductCategory> {
    const category = await this.byId(companyId, id);
    category.active = false;
    return this.categoryRepo.save(category);
  }

  async ensureSeedDataForCompany(companyId: number): Promise<number> {
    const existing = await this.categoryRepo.find({ where: { companyId } });
    const existingKeys = new Set(existing.map((c) => `${c.productType}:${c.slug}`));
    const toCreate = SEED_CATEGORIES.filter(
      (seed) => !existingKeys.has(`${seed.productType}:${seed.slug}`),
    );
    if (toCreate.length === 0) {
      return 0;
    }
    const records = toCreate.map((seed) =>
      this.categoryRepo.create({
        companyId,
        productType: seed.productType,
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        sortOrder: seed.sortOrder,
        active: true,
        workflowHints: {},
      }),
    );
    await this.categoryRepo.save(records);
    return records.length;
  }
}
