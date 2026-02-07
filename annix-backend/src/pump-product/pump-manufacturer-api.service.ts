import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreatePumpProductDto } from "./dto/create-pump-product.dto";
import { PumpProductCategory } from "./entities/pump-product.entity";
import { PumpCurveData } from "./pump-datasheet.service";

export interface ManufacturerApiConfig {
  manufacturer: string;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
}

export interface ManufacturerProduct {
  sku: string;
  title: string;
  description?: string;
  pumpType: string;
  modelNumber: string;
  flowRateMin?: number;
  flowRateMax?: number;
  headMin?: number;
  headMax?: number;
  maxTemperature?: number;
  maxPressure?: number;
  motorPowerKw?: number;
  certifications?: string[];
  datasheetUrl?: string;
  imageUrl?: string;
  curveData?: PumpCurveData;
  specifications?: Record<string, any>;
}

export interface ManufacturerApiResponse {
  success: boolean;
  products: ManufacturerProduct[];
  totalProducts: number;
  lastUpdated: Date;
  error?: string;
}

export interface IManufacturerApiClient {
  manufacturer: string;
  fetchProducts(options?: FetchOptions): Promise<ManufacturerApiResponse>;
  fetchProductById(productId: string): Promise<ManufacturerProduct | null>;
  fetchProductCurve(productId: string): Promise<PumpCurveData | null>;
  isAvailable(): Promise<boolean>;
}

export interface FetchOptions {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class PumpManufacturerApiService {
  private readonly logger = new Logger(PumpManufacturerApiService.name);
  private readonly clients: Map<string, IManufacturerApiClient> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeClients();
  }

  private initializeClients(): void {
    const ksbConfig = this.manufacturerConfig("KSB");
    if (ksbConfig.enabled) {
      this.clients.set("KSB", new KsbApiClient(ksbConfig));
    }

    const grundfosConfig = this.manufacturerConfig("GRUNDFOS");
    if (grundfosConfig.enabled) {
      this.clients.set("Grundfos", new GrundfosApiClient(grundfosConfig));
    }

    const sulzerConfig = this.manufacturerConfig("SULZER");
    if (sulzerConfig.enabled) {
      this.clients.set("Sulzer", new SulzerApiClient(sulzerConfig));
    }

    const weirConfig = this.manufacturerConfig("WEIR");
    if (weirConfig.enabled) {
      this.clients.set("Weir Minerals", new WeirApiClient(weirConfig));
    }

    this.logger.log(
      `Initialized ${this.clients.size} manufacturer API clients: ${Array.from(this.clients.keys()).join(", ")}`,
    );
  }

  private manufacturerConfig(prefix: string): ManufacturerApiConfig {
    return {
      manufacturer: prefix,
      baseUrl: this.configService.get<string>(`${prefix}_API_URL`) || "",
      apiKey: this.configService.get<string>(`${prefix}_API_KEY`),
      enabled: !!this.configService.get<string>(`${prefix}_API_URL`),
    };
  }

  availableManufacturers(): string[] {
    return Array.from(this.clients.keys());
  }

  async checkAvailability(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    for (const [name, client] of this.clients) {
      try {
        result[name] = await client.isAvailable();
      } catch {
        result[name] = false;
      }
    }

    return result;
  }

  async fetchProductsFromManufacturer(
    manufacturer: string,
    options?: FetchOptions,
  ): Promise<ManufacturerApiResponse> {
    const client = this.clients.get(manufacturer);

    if (!client) {
      return {
        success: false,
        products: [],
        totalProducts: 0,
        lastUpdated: new Date(),
        error: `No API client configured for ${manufacturer}`,
      };
    }

    try {
      const response = await client.fetchProducts(options);
      this.logger.log(`Fetched ${response.products.length} products from ${manufacturer}`);
      return response;
    } catch (error) {
      this.logger.error(`Error fetching from ${manufacturer}: ${error}`);
      return {
        success: false,
        products: [],
        totalProducts: 0,
        lastUpdated: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchAllProducts(options?: FetchOptions): Promise<{
    results: Record<string, ManufacturerApiResponse>;
    totalProducts: number;
  }> {
    const results: Record<string, ManufacturerApiResponse> = {};
    let totalProducts = 0;

    for (const manufacturer of this.clients.keys()) {
      results[manufacturer] = await this.fetchProductsFromManufacturer(manufacturer, options);
      totalProducts += results[manufacturer].totalProducts;
    }

    return { results, totalProducts };
  }

  mapToCreateDto(product: ManufacturerProduct, manufacturer: string): CreatePumpProductDto {
    const categoryMap: Record<string, PumpProductCategory> = {
      centrifugal: PumpProductCategory.CENTRIFUGAL,
      end_suction: PumpProductCategory.CENTRIFUGAL,
      multistage: PumpProductCategory.CENTRIFUGAL,
      split_case: PumpProductCategory.CENTRIFUGAL,
      positive_displacement: PumpProductCategory.POSITIVE_DISPLACEMENT,
      progressive_cavity: PumpProductCategory.POSITIVE_DISPLACEMENT,
      gear: PumpProductCategory.POSITIVE_DISPLACEMENT,
      slurry: PumpProductCategory.SPECIALTY,
      submersible: PumpProductCategory.SPECIALTY,
    };

    const category = categoryMap[product.pumpType.toLowerCase()] || PumpProductCategory.CENTRIFUGAL;

    return {
      sku: product.sku,
      title: product.title,
      description: product.description,
      pumpType: product.pumpType,
      category,
      manufacturer,
      modelNumber: product.modelNumber,
      flowRateMin: product.flowRateMin,
      flowRateMax: product.flowRateMax,
      headMin: product.headMin,
      headMax: product.headMax,
      maxTemperature: product.maxTemperature,
      maxPressure: product.maxPressure,
      motorPowerKw: product.motorPowerKw,
      certifications: product.certifications || [],
      applications: [],
      datasheetUrl: product.datasheetUrl,
      imageUrl: product.imageUrl,
      pumpCurveData: product.curveData as Record<string, any>,
      specifications: product.specifications,
    };
  }
}

abstract class BaseManufacturerApiClient implements IManufacturerApiClient {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly config: ManufacturerApiConfig) {}

  abstract get manufacturer(): string;

  abstract fetchProducts(options?: FetchOptions): Promise<ManufacturerApiResponse>;

  abstract fetchProductById(productId: string): Promise<ManufacturerProduct | null>;

  abstract fetchProductCurve(productId: string): Promise<PumpCurveData | null>;

  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled || !this.config.baseUrl) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: "GET",
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}

class KsbApiClient extends BaseManufacturerApiClient {
  get manufacturer(): string {
    return "KSB";
  }

  async fetchProducts(options?: FetchOptions): Promise<ManufacturerApiResponse> {
    if (!this.config.enabled) {
      return this.mockKsbProducts();
    }

    try {
      const params = new URLSearchParams();
      if (options?.category) params.append("category", options.category);
      if (options?.search) params.append("q", options.search);
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());

      const response = await fetch(`${this.config.baseUrl}/products?${params}`, {
        headers: this.authHeaders(),
      });

      if (!response.ok) {
        throw new Error(`KSB API error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapKsbResponse(data);
    } catch (error) {
      this.logger.warn(`KSB API unavailable, using mock data: ${error}`);
      return this.mockKsbProducts();
    }
  }

  async fetchProductById(productId: string): Promise<ManufacturerProduct | null> {
    return null;
  }

  async fetchProductCurve(productId: string): Promise<PumpCurveData | null> {
    return null;
  }

  private mapKsbResponse(data: any): ManufacturerApiResponse {
    return {
      success: true,
      products:
        data.products?.map((p: any) => ({
          sku: `KSB-${p.articleNumber}`,
          title: p.name,
          description: p.description,
          pumpType: p.pumpType || "centrifugal",
          modelNumber: p.articleNumber,
          flowRateMin: p.minFlow,
          flowRateMax: p.maxFlow,
          headMin: p.minHead,
          headMax: p.maxHead,
          motorPowerKw: p.motorPower,
          certifications: p.certifications,
          datasheetUrl: p.datasheetUrl,
          imageUrl: p.imageUrl,
        })) || [],
      totalProducts: data.total || 0,
      lastUpdated: new Date(),
    };
  }

  private mockKsbProducts(): ManufacturerApiResponse {
    return {
      success: true,
      products: [
        {
          sku: "KSB-ETN-32-160",
          title: "KSB Etanorm 32-160",
          description: "Single-stage standardized water pump to EN 733",
          pumpType: "end_suction",
          modelNumber: "ETN 32-160",
          flowRateMin: 2.5,
          flowRateMax: 18,
          headMin: 8,
          headMax: 32,
          motorPowerKw: 1.5,
          certifications: ["EN 733", "ISO 9001", "CE"],
        },
        {
          sku: "KSB-ETN-50-200",
          title: "KSB Etanorm 50-200",
          description: "Single-stage end suction pump for clean water",
          pumpType: "end_suction",
          modelNumber: "ETN 50-200",
          flowRateMin: 20,
          flowRateMax: 100,
          headMin: 20,
          headMax: 65,
          motorPowerKw: 7.5,
          certifications: ["EN 733", "ISO 9001", "CE"],
        },
        {
          sku: "KSB-MTC-80-200",
          title: "KSB Multitec 80-200",
          description: "High-pressure multistage centrifugal pump",
          pumpType: "multistage",
          modelNumber: "MTC 80-200",
          flowRateMin: 30,
          flowRateMax: 120,
          headMin: 80,
          headMax: 320,
          motorPowerKw: 45,
          certifications: ["ISO 9001", "CE", "ATEX"],
        },
      ],
      totalProducts: 3,
      lastUpdated: new Date(),
    };
  }
}

class GrundfosApiClient extends BaseManufacturerApiClient {
  get manufacturer(): string {
    return "Grundfos";
  }

  async fetchProducts(options?: FetchOptions): Promise<ManufacturerApiResponse> {
    return this.mockGrundfosProducts();
  }

  async fetchProductById(productId: string): Promise<ManufacturerProduct | null> {
    return null;
  }

  async fetchProductCurve(productId: string): Promise<PumpCurveData | null> {
    return null;
  }

  private mockGrundfosProducts(): ManufacturerApiResponse {
    return {
      success: true,
      products: [
        {
          sku: "GRU-CR-15-4",
          title: "Grundfos CR 15-4",
          description: "Vertical multistage centrifugal pump",
          pumpType: "multistage",
          modelNumber: "CR 15-4",
          flowRateMin: 5,
          flowRateMax: 20,
          headMin: 30,
          headMax: 120,
          motorPowerKw: 5.5,
          certifications: ["ISO 9001", "WRAS", "CE"],
        },
        {
          sku: "GRU-NB-65-200",
          title: "Grundfos NB 65-200",
          description: "End-suction pump for industrial applications",
          pumpType: "end_suction",
          modelNumber: "NB 65-200",
          flowRateMin: 40,
          flowRateMax: 180,
          headMin: 25,
          headMax: 80,
          motorPowerKw: 15,
          certifications: ["ISO 9001", "CE"],
        },
      ],
      totalProducts: 2,
      lastUpdated: new Date(),
    };
  }
}

class SulzerApiClient extends BaseManufacturerApiClient {
  get manufacturer(): string {
    return "Sulzer";
  }

  async fetchProducts(options?: FetchOptions): Promise<ManufacturerApiResponse> {
    return this.mockSulzerProducts();
  }

  async fetchProductById(productId: string): Promise<ManufacturerProduct | null> {
    return null;
  }

  async fetchProductCurve(productId: string): Promise<PumpCurveData | null> {
    return null;
  }

  private mockSulzerProducts(): ManufacturerApiResponse {
    return {
      success: true,
      products: [
        {
          sku: "SUL-ZLN-125-250",
          title: "Sulzer ZLN 125-250",
          description: "API 610 OH2 process pump",
          pumpType: "process",
          modelNumber: "ZLN 125-250",
          flowRateMin: 80,
          flowRateMax: 350,
          headMin: 30,
          headMax: 120,
          motorPowerKw: 55,
          certifications: ["API 610", "ATEX", "ISO 9001"],
        },
        {
          sku: "SUL-HST-100",
          title: "Sulzer HST 100",
          description: "Horizontal split case pump",
          pumpType: "split_case",
          modelNumber: "HST 100",
          flowRateMin: 200,
          flowRateMax: 1200,
          headMin: 20,
          headMax: 100,
          motorPowerKw: 132,
          certifications: ["ISO 9001", "CE"],
        },
      ],
      totalProducts: 2,
      lastUpdated: new Date(),
    };
  }
}

class WeirApiClient extends BaseManufacturerApiClient {
  get manufacturer(): string {
    return "Weir Minerals";
  }

  async fetchProducts(options?: FetchOptions): Promise<ManufacturerApiResponse> {
    return this.mockWeirProducts();
  }

  async fetchProductById(productId: string): Promise<ManufacturerProduct | null> {
    return null;
  }

  async fetchProductCurve(productId: string): Promise<PumpCurveData | null> {
    return null;
  }

  private mockWeirProducts(): ManufacturerApiResponse {
    return {
      success: true,
      products: [
        {
          sku: "WEI-WBH-100",
          title: "Weir Warman WBH 100",
          description: "Heavy duty slurry pump for mining",
          pumpType: "slurry",
          modelNumber: "WBH 100",
          flowRateMin: 50,
          flowRateMax: 300,
          headMin: 10,
          headMax: 60,
          motorPowerKw: 45,
          certifications: ["ISO 9001", "ATEX"],
        },
        {
          sku: "WEI-AH-6/4",
          title: "Weir Warman AH 6/4",
          description: "Horizontal slurry pump",
          pumpType: "slurry",
          modelNumber: "AH 6/4",
          flowRateMin: 30,
          flowRateMax: 200,
          headMin: 15,
          headMax: 50,
          motorPowerKw: 30,
          certifications: ["ISO 9001"],
        },
      ],
      totalProducts: 2,
      lastUpdated: new Date(),
    };
  }
}
