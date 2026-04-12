import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { StockItem } from "../../stock-control/entities/stock-item.entity";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { PaintProduct } from "../entities/paint-product.entity";
import { ProductCategory } from "../entities/product-category.entity";
import { RubberCompound } from "../entities/rubber-compound.entity";
import { FifoBatchService } from "./fifo-batch.service";
import { IssuableProductService } from "./issuable-product.service";
import { ProductCategoryService } from "./product-category.service";
import { RubberCompoundService } from "./rubber-compound.service";

export interface DemoSeedResult {
  productsCreated: number;
  productsSkipped: number;
  compoundsCreated: number;
  categoriesCreated: number;
  batchesCreated: number;
}

@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(PaintProduct)
    private readonly paintRepo: Repository<PaintProduct>,
    @InjectRepository(RubberCompound)
    private readonly compoundRepo: Repository<RubberCompound>,
    private readonly categoryService: ProductCategoryService,
    private readonly compoundService: RubberCompoundService,
    private readonly productService: IssuableProductService,
    private readonly fifoBatchService: FifoBatchService,
    private readonly dataSource: DataSource,
  ) {}

  async seed(companyId: number): Promise<DemoSeedResult> {
    this.logger.log(`Seeding demo data for company ${companyId}`);

    const categoriesCreated = await this.categoryService.ensureSeedDataForCompany(companyId);
    const compoundsCreated = await this.compoundService.ensureSeedCompoundsForCompany(companyId);

    const categories = await this.categoryRepo.find({ where: { companyId } });
    const compounds = await this.compoundRepo.find({ where: { companyId } });

    const toolsCategory = categories.find(
      (c) => c.productType === "consumable" && c.slug === "tools",
    );
    const cleaningCategory = categories.find(
      (c) => c.productType === "consumable" && c.slug === "cleaning",
    );
    const epoxyCategory = categories.find(
      (c) => c.productType === "paint" && c.slug === "epoxy-primer",
    );
    const rubberSbrCategory = categories.find(
      (c) => c.productType === "rubber_roll" && c.slug === "sbr",
    );

    const sbr70 = compounds.find((c) => c.code === "SBR70");
    const nbr70 = compounds.find((c) => c.code === "NBR70");
    const epdm65 = compounds.find((c) => c.code === "EPDM65");

    let productsCreated = 0;
    let productsSkipped = 0;
    let batchesCreated = 0;

    const createIfMissing = async (
      sku: string,
      creator: () => Promise<IssuableProduct | null>,
      costPerUnit: number,
    ): Promise<void> => {
      const existing = await this.productRepo.findOne({
        where: { companyId, sku },
      });
      if (existing) {
        productsSkipped += 1;
        return;
      }
      const created = await creator();
      if (!created) {
        productsSkipped += 1;
        return;
      }
      productsCreated += 1;
      await this.fifoBatchService.createBatch(companyId, {
        productId: created.id,
        sourceType: "legacy",
        quantityPurchased: created.quantity,
        costPerUnit,
        receivedAt: now().toJSDate(),
        isLegacyBatch: true,
        notes: "Demo seed data",
      });
      batchesCreated += 1;
    };

    await createIfMissing(
      "DEMO-BRUSH-50",
      () =>
        this.productService.create(companyId, {
          productType: "consumable",
          sku: "DEMO-BRUSH-50",
          name: "Paint Brush 50mm",
          description: "Standard 50mm paint brush for cutting in",
          categoryId: toolsCategory?.id ?? null,
          unitOfMeasure: "each",
          costPerUnit: 35,
          quantity: 48,
          minStockLevel: 10,
        }),
      35,
    );

    await createIfMissing(
      "DEMO-GLOVES-L",
      () =>
        this.productService.create(companyId, {
          productType: "consumable",
          sku: "DEMO-GLOVES-L",
          name: "Nitrile Gloves Large (box of 100)",
          description: "Disposable nitrile gloves, powder-free, large",
          categoryId: toolsCategory?.id ?? null,
          unitOfMeasure: "box",
          costPerUnit: 220,
          quantity: 12,
          minStockLevel: 4,
        }),
      220,
    );

    await createIfMissing(
      "DEMO-THINNER-5L",
      () =>
        this.productService.create(companyId, {
          productType: "consumable",
          sku: "DEMO-THINNER-5L",
          name: "Mineral Thinners 5L",
          description: "General-purpose mineral thinners for cleaning brushes and equipment",
          categoryId: cleaningCategory?.id ?? null,
          unitOfMeasure: "litres",
          costPerUnit: 185,
          quantity: 24,
          minStockLevel: 6,
        }),
      185,
    );

    await createIfMissing(
      "DEMO-RAGS-BALE",
      () =>
        this.productService.create(companyId, {
          productType: "consumable",
          sku: "DEMO-RAGS-BALE",
          name: "Cotton Cleaning Rags (10kg bale)",
          description: "Mixed cotton rags for general cleaning",
          categoryId: cleaningCategory?.id ?? null,
          unitOfMeasure: "bale",
          costPerUnit: 280,
          quantity: 8,
          minStockLevel: 2,
        }),
      280,
    );

    await createIfMissing(
      "DEMO-JOTUN-EPX-BASE-20L",
      () =>
        this.productService.create(companyId, {
          productType: "paint",
          sku: "DEMO-JOTUN-EPX-BASE-20L",
          name: "Jotun Jotamastic 90 Base 20L",
          description: "Two-pack epoxy primer base component",
          categoryId: epoxyCategory?.id ?? null,
          unitOfMeasure: "litres",
          costPerUnit: 890,
          quantity: 240,
          minStockLevel: 60,
          paint: {
            coverageM2PerLitre: 7,
            dryFilmThicknessUm: 150,
            wetFilmThicknessUm: 200,
            coatType: "primer",
            paintSystem: "epoxy",
            numberOfParts: 2,
            mixingRatio: "3:1",
            potLifeMinutes: 180,
            colourCode: "RAL 7035",
            densityKgPerL: 1.45,
          },
        }),
      890,
    );

    await createIfMissing(
      "DEMO-JOTUN-EPX-HARDENER-5L",
      () =>
        this.productService.create(companyId, {
          productType: "paint",
          sku: "DEMO-JOTUN-EPX-HARDENER-5L",
          name: "Jotun Jotamastic 90 Hardener 5L",
          description: "Two-pack epoxy primer hardener component",
          categoryId: epoxyCategory?.id ?? null,
          unitOfMeasure: "litres",
          costPerUnit: 950,
          quantity: 80,
          minStockLevel: 20,
          paint: {
            coatType: "primer",
            paintSystem: "epoxy",
            numberOfParts: 2,
            mixingRatio: "3:1",
            potLifeMinutes: 180,
            densityKgPerL: 1.05,
          },
        }),
      950,
    );

    await createIfMissing(
      "DEMO-HEMPADUR-15570-20L",
      () =>
        this.productService.create(companyId, {
          productType: "paint",
          sku: "DEMO-HEMPADUR-15570-20L",
          name: "Hempel Hempadur 15570 Topcoat 20L",
          description: "Two-pack polyurethane topcoat",
          categoryId: epoxyCategory?.id ?? null,
          unitOfMeasure: "litres",
          costPerUnit: 1150,
          quantity: 160,
          minStockLevel: 40,
          paint: {
            coverageM2PerLitre: 9,
            dryFilmThicknessUm: 60,
            wetFilmThicknessUm: 90,
            coatType: "finish",
            paintSystem: "polyurethane",
            numberOfParts: 2,
            mixingRatio: "4:1",
            potLifeMinutes: 240,
            colourCode: "RAL 9010",
            glossLevel: "gloss",
            densityKgPerL: 1.35,
          },
        }),
      1150,
    );

    if (sbr70) {
      await createIfMissing(
        "DEMO-ROLL-SBR-A001",
        () =>
          this.productService.create(companyId, {
            productType: "rubber_roll",
            sku: "DEMO-ROLL-SBR-A001",
            name: `SBR Roll A-001 (${sbr70.code})`,
            description: "Demo SBR 70 Shore A rubber roll",
            unitOfMeasure: "kg",
            costPerUnit: 82,
            quantity: 72,
            rubberRoll: {
              rollNumber: "A-001",
              compoundCode: sbr70.code,
              compoundId: sbr70.id,
              colour: "black",
              widthMm: 1200,
              thicknessMm: 6,
              lengthM: 10,
              weightKg: 72,
              batchNumber: "SBR-B1",
              supplierName: "Polymer Liners (Pty) Ltd",
              status: "available",
            },
          }),
        82,
      );
    }
    if (nbr70) {
      await createIfMissing(
        "DEMO-ROLL-NBR-B002",
        () =>
          this.productService.create(companyId, {
            productType: "rubber_roll",
            sku: "DEMO-ROLL-NBR-B002",
            name: `NBR Roll B-002 (${nbr70.code})`,
            description: "Demo Nitrile rubber roll, oil-resistant",
            unitOfMeasure: "kg",
            costPerUnit: 98,
            quantity: 54,
            rubberRoll: {
              rollNumber: "B-002",
              compoundCode: nbr70.code,
              compoundId: nbr70.id,
              colour: "black",
              widthMm: 1000,
              thicknessMm: 8,
              lengthM: 6.75,
              weightKg: 54,
              batchNumber: "NBR-B2",
              supplierName: "Polymer Liners (Pty) Ltd",
              status: "available",
            },
          }),
        98,
      );
    }
    if (epdm65) {
      await createIfMissing(
        "DEMO-ROLL-EPDM-C003",
        () =>
          this.productService.create(companyId, {
            productType: "rubber_roll",
            sku: "DEMO-ROLL-EPDM-C003",
            name: `EPDM Roll C-003 (${epdm65.code})`,
            description: "Demo EPDM rubber roll, chemical resistant",
            unitOfMeasure: "kg",
            costPerUnit: 110,
            quantity: 41,
            rubberRoll: {
              rollNumber: "C-003",
              compoundCode: epdm65.code,
              compoundId: epdm65.id,
              colour: "black",
              widthMm: 1200,
              thicknessMm: 5,
              lengthM: 8,
              weightKg: 41,
              batchNumber: "EPDM-B3",
              supplierName: "Polymer Liners (Pty) Ltd",
              status: "available",
            },
          }),
        110,
      );
    }

    const result = {
      productsCreated,
      productsSkipped,
      compoundsCreated,
      categoriesCreated,
      batchesCreated,
    };

    this.logger.log(`Demo seed complete for company ${companyId}: ${JSON.stringify(result)}`);
    void rubberSbrCategory;
    return result;
  }

  async syncLegacyStock(companyId: number): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    this.logger.log(`Syncing legacy stock items for company ${companyId}`);

    const stockItems = await this.dataSource.getRepository(StockItem).find({
      where: { companyId },
    });
    this.logger.log(`Found ${stockItems.length} legacy stock items`);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    const paintKeywords = [
      "paint",
      "primer",
      "topcoat",
      "hardener",
      "base",
      "epoxy",
      "jotamastic",
      "penguard",
      "hempadur",
      "hempel",
      "jotun",
      "sigma",
      "international",
      "polyurethane",
      "zinc",
      "sealer",
      "thinner",
      "solvent",
    ];

    for (const si of stockItems) {
      const existing = await this.productRepo.findOne({
        where: { companyId, legacyStockItemId: si.id },
        relations: { paint: true },
      });
      if (existing) {
        const paintChild = existing.paint;
        if (
          paintChild &&
          (paintChild.packSizeLitres == null || paintChild.componentGroupKey == null)
        ) {
          let updated = false;
          if (paintChild.packSizeLitres == null && si.packSizeLitres) {
            paintChild.packSizeLitres = Number(si.packSizeLitres);
            updated = true;
          }
          if (paintChild.componentGroupKey == null && si.componentGroup) {
            paintChild.componentGroupKey = si.componentGroup;
            updated = true;
          }
          if (paintChild.componentRole == null && si.componentRole) {
            paintChild.componentRole = si.componentRole;
            updated = true;
          }
          if (updated) {
            await this.paintRepo.save(paintChild);
          }
        }
        skipped++;
        continue;
      }

      const alsoExistsBySku = await this.productRepo.findOne({
        where: { companyId, sku: si.sku },
      });
      if (alsoExistsBySku) {
        skipped++;
        continue;
      }

      try {
        const productType = this.classifyStockItem(si, paintKeywords);
        const createDto: any = {
          productType,
          sku: si.sku,
          name: si.name,
          description: si.description,
          unitOfMeasure: si.unitOfMeasure,
          costPerUnit: Number(si.costPerUnit) || 0,
          quantity: Number(si.quantity) || 0,
          minStockLevel: Number(si.minStockLevel) || 0,
          legacyStockItemId: si.id,
        };

        if (productType === "paint") {
          const numParts = si.mixRatio ? si.mixRatio.split(":").length : 1;
          const nameLower = si.name.toLowerCase();
          let coatType: string | null = null;
          if (nameLower.includes("primer") || nameLower.includes("red oxide")) coatType = "primer";
          else if (nameLower.includes("intermediate")) coatType = "intermediate";
          else if (nameLower.includes("hardener") || si.componentRole === "hardener")
            coatType = "finish";
          else if (nameLower.includes("topcoat") || nameLower.includes("finish"))
            coatType = "finish";
          else if (nameLower.includes("thinner")) coatType = null;

          let paintSystem: string | null = null;
          if (
            nameLower.includes("epoxy") ||
            nameLower.includes("jotamastic") ||
            nameLower.includes("hempadur")
          )
            paintSystem = "epoxy";
          else if (nameLower.includes("polyurethane") || nameLower.includes("hardtop"))
            paintSystem = "polyurethane";
          else if (nameLower.includes("zinc")) paintSystem = "zinc_rich";
          else if (nameLower.includes("alkyd")) paintSystem = "alkyd";

          createDto.paint = {
            numberOfParts: numParts > 1 ? numParts : si.componentGroup ? 2 : 1,
            mixingRatio: si.mixRatio || null,
            coatType,
            paintSystem,
            colourCode: si.color || null,
            isBanding: false,
            packSizeLitres: si.packSizeLitres ? Number(si.packSizeLitres) : null,
            componentGroupKey: si.componentGroup || null,
            componentRole: si.componentRole || null,
          };
        } else if (productType === "rubber_roll") {
          createDto.rubberRoll = {
            rollNumber: si.rollNumber || si.sku,
            compoundCode: si.compoundCode || null,
            colour: si.color || "black",
            widthMm: si.widthMm ? Number(si.widthMm) : null,
            thicknessMm: si.thicknessMm ? Number(si.thicknessMm) : null,
            lengthM: si.lengthM ? Number(si.lengthM) : null,
            weightKg: Number(si.quantity) || null,
            status: "available",
          };
        } else if (productType === "consumable") {
          createDto.consumable = { notes: null };
        }

        await this.productService.create(companyId, createDto);

        const createdProduct = await this.productRepo.findOne({
          where: { companyId, sku: si.sku },
        });
        if (createdProduct) {
          createdProduct.legacyStockItemId = si.id;
          await this.productRepo.save(createdProduct);

          if (Number(si.quantity) > 0) {
            await this.fifoBatchService.createBatch(companyId, {
              productId: createdProduct.id,
              sourceType: "legacy",
              quantityPurchased: Number(si.quantity),
              costPerUnit: Number(si.costPerUnit) || 0,
              receivedAt: now().toJSDate(),
              isLegacyBatch: true,
              notes: `Synced from stock item #${si.id}`,
            });
          }
        }

        created++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`SKU ${si.sku}: ${message}`);
      }
    }

    this.logger.log(
      `Sync complete: ${created} created, ${skipped} skipped, ${errors.length} errors`,
    );
    return { created, skipped, errors };
  }

  private classifyStockItem(si: StockItem, paintKeywords: string[]): string {
    if (si.rollNumber || si.sourceRollNumber) return "rubber_roll";
    if (si.isLeftover && (si.widthMm || si.thicknessMm || si.lengthM)) return "rubber_roll";
    if (si.compoundCode) return "rubber_roll";

    const nameLower = si.name.toLowerCase();
    const categoryLower = (si.category || "").toLowerCase();
    const uom = (si.unitOfMeasure || "").toLowerCase();

    if (si.componentRole || si.componentGroup || si.mixRatio) return "paint";
    if (si.packSizeLitres) return "paint";
    if (uom === "litres" || uom === "litre" || uom === "liter" || uom === "l") return "paint";

    for (const kw of paintKeywords) {
      if (nameLower.includes(kw) || categoryLower.includes(kw)) return "paint";
    }

    return "consumable";
  }
}
