import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreatePumpProductDto } from "./dto/create-pump-product.dto";
import { PumpProduct, PumpProductCategory } from "./entities/pump-product.entity";

export interface PumpProductImportRow {
  sku: string;
  title: string;
  description?: string;
  pumpType: string;
  category: string;
  manufacturer: string;
  modelNumber?: string;
  api610Type?: string;
  flowRateMin?: number;
  flowRateMax?: number;
  headMin?: number;
  headMax?: number;
  maxTemperature?: number;
  maxPressure?: number;
  suctionSize?: string;
  dischargeSize?: string;
  casingMaterial?: string;
  impellerMaterial?: string;
  shaftMaterial?: string;
  sealType?: string;
  motorPowerKw?: number;
  voltage?: string;
  frequency?: string;
  weightKg?: number;
  certifications?: string;
  applications?: string;
  baseCost?: number;
  listPrice?: number;
  leadTimeDays?: number;
  stockQuantity?: number;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; sku: string; error: string }>;
}

export interface ManufacturerCatalog {
  manufacturer: string;
  lastUpdated: Date;
  products: CreatePumpProductDto[];
}

@Injectable()
export class PumpDataImportService {
  private readonly logger = new Logger(PumpDataImportService.name);

  constructor(
    @InjectRepository(PumpProduct)
    private readonly productRepository: Repository<PumpProduct>,
  ) {}

  async importFromCsv(
    csvData: string,
    options: { updateExisting?: boolean; supplierId?: number } = {},
  ): Promise<ImportResult> {
    const { updateExisting = false, supplierId } = options;
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const lines = csvData.trim().split("\n");
    if (lines.length < 2) {
      throw new BadRequestException("CSV must have header row and at least one data row");
    }

    const headers = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const requiredHeaders = ["sku", "title", "pumptype", "category", "manufacturer"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h.toLowerCase()));

    if (missingHeaders.length > 0) {
      throw new BadRequestException(`Missing required headers: ${missingHeaders.join(", ")}`);
    }

    result.totalRows = lines.length - 1;

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row = this.mapRowToObject(headers, values);

      try {
        const dto = this.mapRowToDto(row, supplierId);
        const existing = await this.productRepository.findOne({
          where: { sku: dto.sku },
        });

        if (existing) {
          if (updateExisting) {
            Object.assign(existing, dto);
            await this.productRepository.save(existing);
            result.updated++;
            this.logger.debug(`Updated product: ${dto.sku}`);
          } else {
            result.skipped++;
            this.logger.debug(`Skipped existing product: ${dto.sku}`);
          }
        } else {
          const entity = this.productRepository.create(dto);
          await this.productRepository.save(entity);
          result.imported++;
          this.logger.debug(`Imported product: ${dto.sku}`);
        }
      } catch (error) {
        result.errors.push({
          row: i + 1,
          sku: row.sku || "unknown",
          error: error instanceof Error ? error.message : String(error),
        });
        this.logger.warn(`Error importing row ${i + 1}: ${error}`);
      }
    }

    result.success = result.errors.length === 0;
    this.logger.log(
      `Import completed: ${result.imported} imported, ${result.updated} updated, ` +
        `${result.skipped} skipped, ${result.errors.length} errors`,
    );

    return result;
  }

  async importFromJson(
    products: CreatePumpProductDto[],
    options: { updateExisting?: boolean; supplierId?: number } = {},
  ): Promise<ImportResult> {
    const { updateExisting = false, supplierId } = options;
    const result: ImportResult = {
      success: true,
      totalRows: products.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < products.length; i++) {
      const dto = { ...products[i] };
      if (supplierId) {
        dto.supplierId = supplierId;
      }

      try {
        const existing = await this.productRepository.findOne({
          where: { sku: dto.sku },
        });

        if (existing) {
          if (updateExisting) {
            Object.assign(existing, dto);
            await this.productRepository.save(existing);
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          const entity = this.productRepository.create(dto);
          await this.productRepository.save(entity);
          result.imported++;
        }
      } catch (error) {
        result.errors.push({
          row: i + 1,
          sku: dto.sku || "unknown",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async importManufacturerCatalog(
    catalog: ManufacturerCatalog,
    options: { updateExisting?: boolean; supplierId?: number } = {},
  ): Promise<ImportResult> {
    this.logger.log(`Importing ${catalog.products.length} products from ${catalog.manufacturer}`);

    const productsWithManufacturer = catalog.products.map((p) => ({
      ...p,
      manufacturer: catalog.manufacturer,
    }));

    return this.importFromJson(productsWithManufacturer, options);
  }

  generateCsvTemplate(): string {
    const headers = [
      "sku",
      "title",
      "description",
      "pumpType",
      "category",
      "manufacturer",
      "modelNumber",
      "api610Type",
      "flowRateMin",
      "flowRateMax",
      "headMin",
      "headMax",
      "maxTemperature",
      "maxPressure",
      "suctionSize",
      "dischargeSize",
      "casingMaterial",
      "impellerMaterial",
      "shaftMaterial",
      "sealType",
      "motorPowerKw",
      "voltage",
      "frequency",
      "weightKg",
      "certifications",
      "applications",
      "baseCost",
      "listPrice",
      "leadTimeDays",
      "stockQuantity",
      "notes",
    ];

    const exampleRow = [
      "KSB-ETN-50-200",
      "KSB Etanorm 50-200",
      "Single-stage end suction pump",
      "end_suction",
      "centrifugal",
      "KSB",
      "ETN 50-200",
      "OH1",
      "20",
      "100",
      "20",
      "65",
      "120",
      "16",
      "DN80",
      "DN65",
      "cast_iron",
      "bronze",
      "stainless_steel",
      "mechanical_single",
      "7.5",
      "380V",
      "50Hz",
      "85",
      "ISO 9001;CE",
      "water_supply;hvac",
      "35000",
      "45000",
      "14",
      "3",
      "Sample pump for template",
    ];

    return `${headers.join(",")}\n${exampleRow.join(",")}`;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  private mapRowToObject(headers: string[], values: string[]): PumpProductImportRow {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });

    return {
      sku: obj["sku"] || "",
      title: obj["title"] || "",
      description: obj["description"] || undefined,
      pumpType: obj["pumptype"] || obj["pump_type"] || "",
      category: obj["category"] || "",
      manufacturer: obj["manufacturer"] || "",
      modelNumber: obj["modelnumber"] || obj["model_number"] || undefined,
      api610Type: obj["api610type"] || obj["api_610_type"] || undefined,
      flowRateMin: obj["flowratemin"] ? parseFloat(obj["flowratemin"]) : undefined,
      flowRateMax: obj["flowratemax"] ? parseFloat(obj["flowratemax"]) : undefined,
      headMin: obj["headmin"] ? parseFloat(obj["headmin"]) : undefined,
      headMax: obj["headmax"] ? parseFloat(obj["headmax"]) : undefined,
      maxTemperature: obj["maxtemperature"] ? parseFloat(obj["maxtemperature"]) : undefined,
      maxPressure: obj["maxpressure"] ? parseFloat(obj["maxpressure"]) : undefined,
      suctionSize: obj["suctionsize"] || undefined,
      dischargeSize: obj["dischargesize"] || undefined,
      casingMaterial: obj["casingmaterial"] || undefined,
      impellerMaterial: obj["impellermaterial"] || undefined,
      shaftMaterial: obj["shaftmaterial"] || undefined,
      sealType: obj["sealtype"] || undefined,
      motorPowerKw: obj["motorpowerkw"] ? parseFloat(obj["motorpowerkw"]) : undefined,
      voltage: obj["voltage"] || undefined,
      frequency: obj["frequency"] || undefined,
      weightKg: obj["weightkg"] ? parseFloat(obj["weightkg"]) : undefined,
      certifications: obj["certifications"] || undefined,
      applications: obj["applications"] || undefined,
      baseCost: obj["basecost"] ? parseFloat(obj["basecost"]) : undefined,
      listPrice: obj["listprice"] ? parseFloat(obj["listprice"]) : undefined,
      leadTimeDays: obj["leadtimedays"] ? parseInt(obj["leadtimedays"], 10) : undefined,
      stockQuantity: obj["stockquantity"] ? parseInt(obj["stockquantity"], 10) : undefined,
      notes: obj["notes"] || undefined,
    };
  }

  private mapRowToDto(row: PumpProductImportRow, supplierId?: number): CreatePumpProductDto {
    if (!row.sku || !row.title || !row.pumpType || !row.category || !row.manufacturer) {
      throw new BadRequestException(
        "Missing required fields: sku, title, pumpType, category, manufacturer",
      );
    }

    const categoryMap: Record<string, PumpProductCategory> = {
      centrifugal: PumpProductCategory.CENTRIFUGAL,
      positive_displacement: PumpProductCategory.POSITIVE_DISPLACEMENT,
      specialty: PumpProductCategory.SPECIALTY,
    };

    const category = categoryMap[row.category.toLowerCase()];
    if (!category) {
      throw new BadRequestException(
        `Invalid category: ${row.category}. Must be one of: centrifugal, positive_displacement, specialty`,
      );
    }

    return {
      sku: row.sku,
      title: row.title,
      description: row.description,
      pumpType: row.pumpType,
      category,
      manufacturer: row.manufacturer,
      modelNumber: row.modelNumber,
      api610Type: row.api610Type,
      flowRateMin: row.flowRateMin,
      flowRateMax: row.flowRateMax,
      headMin: row.headMin,
      headMax: row.headMax,
      maxTemperature: row.maxTemperature,
      maxPressure: row.maxPressure,
      suctionSize: row.suctionSize,
      dischargeSize: row.dischargeSize,
      casingMaterial: row.casingMaterial,
      impellerMaterial: row.impellerMaterial,
      shaftMaterial: row.shaftMaterial,
      sealType: row.sealType,
      motorPowerKw: row.motorPowerKw,
      voltage: row.voltage,
      frequency: row.frequency,
      weightKg: row.weightKg,
      certifications: row.certifications?.split(";").map((c) => c.trim()) || [],
      applications: row.applications?.split(";").map((a) => a.trim()) || [],
      baseCost: row.baseCost,
      listPrice: row.listPrice,
      leadTimeDays: row.leadTimeDays,
      stockQuantity: row.stockQuantity || 0,
      notes: row.notes,
      supplierId,
    };
  }
}
