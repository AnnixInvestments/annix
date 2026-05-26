import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreatePumpProductDto } from "./dto/create-pump-product.dto";
import {
  PumpProductListResponseDto,
  PumpProductResponseDto,
} from "./dto/pump-product-response.dto";
import { UpdatePumpProductDto } from "./dto/update-pump-product.dto";
import {
  PumpProduct,
  PumpProductCategory,
  PumpProductStatus,
} from "./entities/pump-product.entity";
import { PumpProductRepository } from "./pump-product.repository";

export interface PumpProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: PumpProductCategory;
  manufacturer?: string;
  status?: PumpProductStatus;
  minFlowRate?: number;
  maxFlowRate?: number;
  minHead?: number;
  maxHead?: number;
  sortBy?: "title" | "manufacturer" | "flowRateMax" | "headMax" | "listPrice" | "relevance";
  sortOrder?: "ASC" | "DESC";
}

export interface PumpSearchResult {
  product: PumpProductResponseDto;
  relevanceScore: number;
  matchedFields: string[];
}

@Injectable()
export class PumpProductService {
  constructor(private readonly productRepository: PumpProductRepository) {}

  async create(dto: CreatePumpProductDto): Promise<PumpProductResponseDto> {
    const existingSku = await this.productRepository.findBySku(dto.sku);

    if (existingSku) {
      throw new BadRequestException(`Product with SKU ${dto.sku} already exists`);
    }

    const saved = await this.productRepository.create({
      ...dto,
      certifications: dto.certifications || [],
      applications: dto.applications || [],
    });
    return this.mapToResponseDto(saved);
  }

  async findAll(params: PumpProductQueryParams = {}): Promise<PumpProductListResponseDto> {
    const { page = 1, limit = 10 } = params;
    const { items, total } = await this.productRepository.searchPaged(params);

    return {
      items: items.map((p) => this.mapToResponseDto(p)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<PumpProductResponseDto> {
    const product = await this.productRepository.findById(id, ["supplier"]);

    if (!product) {
      throw new NotFoundException(`Pump product with ID ${id} not found`);
    }

    return this.mapToResponseDto(product);
  }

  async findBySku(sku: string): Promise<PumpProductResponseDto | null> {
    const product = await this.productRepository.findBySku(sku);
    return product ? this.mapToResponseDto(product) : null;
  }

  async update(id: number, dto: UpdatePumpProductDto): Promise<PumpProductResponseDto> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Pump product with ID ${id} not found`);
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.productRepository.findBySku(dto.sku);

      if (existingSku) {
        throw new BadRequestException(`Product with SKU ${dto.sku} already exists`);
      }
    }

    Object.assign(product, dto);
    const saved = await this.productRepository.save(product);
    return this.mapToResponseDto(saved);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Pump product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
  }

  async findByCategory(category: PumpProductCategory): Promise<PumpProductResponseDto[]> {
    const products = await this.productRepository.findByCategory(category);
    return products.map((p) => this.mapToResponseDto(p));
  }

  async findByManufacturer(manufacturer: string): Promise<PumpProductResponseDto[]> {
    const products = await this.productRepository.findByManufacturerLike(manufacturer);
    return products.map((p) => this.mapToResponseDto(p));
  }

  async manufacturers(): Promise<string[]> {
    return this.productRepository.manufacturers();
  }

  async fullTextSearch(
    query: string,
    params: PumpProductQueryParams = {},
  ): Promise<{ results: PumpSearchResult[]; total: number }> {
    const { items, total } = await this.productRepository.fullTextSearchPaged(query, params);

    const results: PumpSearchResult[] = items.map((product) => {
      const matchedFields: string[] = [];
      const lowerQuery = query.toLowerCase();

      if (product.title.toLowerCase().includes(lowerQuery)) {
        matchedFields.push("title");
      }
      if (product.sku.toLowerCase().includes(lowerQuery)) {
        matchedFields.push("sku");
      }
      if (product.manufacturer.toLowerCase().includes(lowerQuery)) {
        matchedFields.push("manufacturer");
      }
      if (product.description?.toLowerCase().includes(lowerQuery)) {
        matchedFields.push("description");
      }
      if (product.pumpType?.toLowerCase().includes(lowerQuery)) {
        matchedFields.push("pumpType");
      }
      if (product.modelNumber?.toLowerCase().includes(lowerQuery)) {
        matchedFields.push("modelNumber");
      }

      const titleBonus = matchedFields.includes("title") ? 3 : 0;
      const skuBonus = matchedFields.includes("sku") ? 2 : 0;
      const relevanceScore = matchedFields.length + titleBonus + skuBonus;

      return {
        product: this.mapToResponseDto(product),
        relevanceScore,
        matchedFields,
      };
    });

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return { results, total };
  }

  async findByIds(ids: number[]): Promise<PumpProductResponseDto[]> {
    if (ids.length === 0) {
      return [];
    }

    const products = await this.productRepository.findByIdList(ids);

    const productMap = new Map(products.map((p) => [p.id, p]));
    return ids
      .filter((id) => productMap.has(id))
      .map((id) => this.mapToResponseDto(productMap.get(id)!));
  }

  async findSimilar(productId: number, limit: number = 4): Promise<PumpProductResponseDto[]> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      return [];
    }

    const similar = await this.productRepository.findSimilarProducts(product, limit);
    return similar.map((p) => this.mapToResponseDto(p));
  }

  async updateStock(id: number, quantity: number): Promise<PumpProductResponseDto> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Pump product with ID ${id} not found`);
    }

    product.stockQuantity = quantity;
    const saved = await this.productRepository.save(product);
    return this.mapToResponseDto(saved);
  }

  private mapToResponseDto(entity: PumpProduct): PumpProductResponseDto {
    return {
      id: entity.id,
      sku: entity.sku,
      title: entity.title,
      description: entity.description,
      pumpType: entity.pumpType,
      category: entity.category,
      status: entity.status,
      manufacturer: entity.manufacturer,
      modelNumber: entity.modelNumber,
      api610Type: entity.api610Type,
      flowRateMin: entity.flowRateMin ? Number(entity.flowRateMin) : null,
      flowRateMax: entity.flowRateMax ? Number(entity.flowRateMax) : null,
      headMin: entity.headMin ? Number(entity.headMin) : null,
      headMax: entity.headMax ? Number(entity.headMax) : null,
      maxTemperature: entity.maxTemperature ? Number(entity.maxTemperature) : null,
      maxPressure: entity.maxPressure ? Number(entity.maxPressure) : null,
      suctionSize: entity.suctionSize,
      dischargeSize: entity.dischargeSize,
      casingMaterial: entity.casingMaterial,
      impellerMaterial: entity.impellerMaterial,
      shaftMaterial: entity.shaftMaterial,
      sealType: entity.sealType,
      motorPowerKw: entity.motorPowerKw ? Number(entity.motorPowerKw) : null,
      voltage: entity.voltage,
      frequency: entity.frequency,
      weightKg: entity.weightKg ? Number(entity.weightKg) : null,
      certifications: entity.certifications || [],
      applications: entity.applications || [],
      baseCost: entity.baseCost ? Number(entity.baseCost) : null,
      listPrice: entity.listPrice ? Number(entity.listPrice) : null,
      markupPercentage: Number(entity.markupPercentage),
      leadTimeDays: entity.leadTimeDays,
      stockQuantity: entity.stockQuantity,
      datasheetUrl: entity.datasheetUrl,
      imageUrl: entity.imageUrl,
      specifications: entity.specifications,
      pumpCurveData: entity.pumpCurveData,
      notes: entity.notes,
      supplierId: entity.supplierId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
