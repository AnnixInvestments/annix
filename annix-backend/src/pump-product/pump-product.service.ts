import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";
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
}

@Injectable()
export class PumpProductService {
  constructor(
    @InjectRepository(PumpProduct)
    private readonly productRepository: Repository<PumpProduct>,
  ) {}

  async create(dto: CreatePumpProductDto): Promise<PumpProductResponseDto> {
    const existingSku = await this.productRepository.findOne({
      where: { sku: dto.sku },
    });

    if (existingSku) {
      throw new BadRequestException(`Product with SKU ${dto.sku} already exists`);
    }

    const entity = this.productRepository.create({
      ...dto,
      certifications: dto.certifications || [],
      applications: dto.applications || [],
    });

    const saved = await this.productRepository.save(entity);
    return this.mapToResponseDto(saved);
  }

  async findAll(params: PumpProductQueryParams = {}): Promise<PumpProductListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      manufacturer,
      status,
      minFlowRate,
      maxFlowRate,
      minHead,
      maxHead,
    } = params;

    const queryBuilder = this.productRepository.createQueryBuilder("product");

    if (search) {
      queryBuilder.andWhere(
        "(product.title ILIKE :search OR product.sku ILIKE :search OR product.manufacturer ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    if (manufacturer) {
      queryBuilder.andWhere("product.manufacturer ILIKE :manufacturer", {
        manufacturer: `%${manufacturer}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere("product.status = :status", { status });
    }

    if (minFlowRate !== undefined) {
      queryBuilder.andWhere("product.flow_rate_max >= :minFlowRate", { minFlowRate });
    }

    if (maxFlowRate !== undefined) {
      queryBuilder.andWhere("product.flow_rate_min <= :maxFlowRate", { maxFlowRate });
    }

    if (minHead !== undefined) {
      queryBuilder.andWhere("product.head_max >= :minHead", { minHead });
    }

    if (maxHead !== undefined) {
      queryBuilder.andWhere("product.head_min <= :maxHead", { maxHead });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy("product.title", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const products = await queryBuilder.getMany();

    return {
      items: products.map((p) => this.mapToResponseDto(p)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<PumpProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ["supplier"],
    });

    if (!product) {
      throw new NotFoundException(`Pump product with ID ${id} not found`);
    }

    return this.mapToResponseDto(product);
  }

  async findBySku(sku: string): Promise<PumpProductResponseDto | null> {
    const product = await this.productRepository.findOne({
      where: { sku },
      relations: ["supplier"],
    });

    return product ? this.mapToResponseDto(product) : null;
  }

  async update(id: number, dto: UpdatePumpProductDto): Promise<PumpProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Pump product with ID ${id} not found`);
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku: dto.sku },
      });

      if (existingSku) {
        throw new BadRequestException(`Product with SKU ${dto.sku} already exists`);
      }
    }

    Object.assign(product, dto);
    const saved = await this.productRepository.save(product);
    return this.mapToResponseDto(saved);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Pump product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
  }

  async findByCategory(category: PumpProductCategory): Promise<PumpProductResponseDto[]> {
    const products = await this.productRepository.find({
      where: { category, status: PumpProductStatus.ACTIVE },
      order: { title: "ASC" },
    });

    return products.map((p) => this.mapToResponseDto(p));
  }

  async findByManufacturer(manufacturer: string): Promise<PumpProductResponseDto[]> {
    const products = await this.productRepository.find({
      where: {
        manufacturer: Like(`%${manufacturer}%`),
        status: PumpProductStatus.ACTIVE,
      },
      order: { title: "ASC" },
    });

    return products.map((p) => this.mapToResponseDto(p));
  }

  async manufacturers(): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder("product")
      .select("DISTINCT product.manufacturer", "manufacturer")
      .where("product.status = :status", { status: PumpProductStatus.ACTIVE })
      .orderBy("product.manufacturer", "ASC")
      .getRawMany();

    return result.map((r) => r.manufacturer);
  }

  async updateStock(id: number, quantity: number): Promise<PumpProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });

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
