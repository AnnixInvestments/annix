import { Injectable } from "@nestjs/common";
import { MaterialLimitResponseDto } from "./dto/material-limit-response.dto";
import { MaterialLimit } from "./entities/material-limit.entity";
import { MaterialValidationRepository } from "./material-validation.repository";

export interface MaterialSuitabilityResult {
  isSuitable: boolean;
  warnings: string[];
  recommendation?: string;
  limits?: {
    minTempC: number;
    maxTempC: number;
    maxPressureBar: number;
    materialType: string;
    notes?: string;
  };
}

export interface MaterialLimitsInfo {
  minTempC: number;
  maxTempC: number;
  maxPressureBar: number;
  materialType: string;
  notes?: string;
}

@Injectable()
export class MaterialValidationService {
  private cachedLimits: MaterialLimit[] | null = null;
  private cacheLoadedAt = 0;
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(private readonly materialValidationRepository: MaterialValidationRepository) {}

  private async loadLimits(): Promise<MaterialLimit[]> {
    const now = Date.now();
    if (this.cachedLimits && now - this.cacheLoadedAt < MaterialValidationService.CACHE_TTL_MS) {
      return this.cachedLimits;
    }
    this.cachedLimits = await this.materialValidationRepository.findAllLimits();
    this.cacheLoadedAt = now;
    return this.cachedLimits;
  }

  async findAll(): Promise<MaterialLimitResponseDto[]> {
    const entities = await this.loadLimits();
    return MaterialLimitResponseDto.fromEntities(entities);
  }

  async findBySpecName(steelSpecName: string): Promise<MaterialLimit | null> {
    const allLimits = await this.loadLimits();

    const specNameLower = steelSpecName.toLowerCase();

    const patternMatch = allLimits.find((l) => {
      const pattern = l.specification_pattern.toLowerCase();
      return (
        specNameLower.includes(pattern) ||
        pattern.includes(specNameLower) ||
        new RegExp(pattern.replace(/%/g, ".*"), "i").test(steelSpecName)
      );
    });

    return patternMatch || null;
  }

  async findBySpecId(steelSpecificationId: number): Promise<MaterialLimit | null> {
    return this.materialValidationRepository.findBySpecId(steelSpecificationId);
  }

  async checkMaterialSuitability(
    steelSpecName: string,
    temperatureC: number | undefined,
    pressureBar: number | undefined,
  ): Promise<MaterialSuitabilityResult> {
    const limits = await this.findBySpecName(steelSpecName);

    if (!limits) {
      return {
        isSuitable: true,
        warnings: [
          `No material limits found for ${steelSpecName}. Please verify suitability manually.`,
        ],
      };
    }

    const warnings: string[] = [];
    let isSuitable = true;

    if (temperatureC !== undefined) {
      if (temperatureC < limits.min_temp_c) {
        isSuitable = false;
        warnings.push(
          `Temperature ${temperatureC}°C is below minimum ${limits.min_temp_c}°C for ${steelSpecName}`,
        );
      }
      if (temperatureC > limits.max_temp_c) {
        isSuitable = false;
        warnings.push(
          `Temperature ${temperatureC}°C exceeds maximum ${limits.max_temp_c}°C for ${steelSpecName}`,
        );
      }
    }

    if (pressureBar !== undefined) {
      const maxPressure = Number(limits.max_pressure_bar);
      if (pressureBar > maxPressure) {
        warnings.push(
          `Pressure ${pressureBar} bar may require special consideration for ${steelSpecName} (typical max: ${maxPressure} bar)`,
        );
      }
    }

    let recommendation: string | undefined;
    if (!isSuitable) {
      recommendation = await this.generateRecommendation(temperatureC, pressureBar);
    }

    return {
      isSuitable,
      warnings,
      recommendation,
      limits: {
        minTempC: limits.min_temp_c,
        maxTempC: limits.max_temp_c,
        maxPressureBar: Number(limits.max_pressure_bar),
        materialType: limits.material_type,
        notes: limits.notes,
      },
    };
  }

  async getSuitableMaterials(
    temperatureC: number | undefined,
    pressureBar: number | undefined,
  ): Promise<string[]> {
    const allLimits = await this.loadLimits();
    const suitable: string[] = [];

    for (const limits of allLimits) {
      let isOk = true;

      if (temperatureC !== undefined) {
        if (temperatureC < limits.min_temp_c || temperatureC > limits.max_temp_c) {
          isOk = false;
        }
      }

      if (pressureBar !== undefined) {
        const maxPressure = Number(limits.max_pressure_bar);
        if (pressureBar > maxPressure) {
          isOk = false;
        }
      }

      if (isOk) {
        suitable.push(limits.specification_pattern);
      }
    }

    return suitable;
  }

  private async generateRecommendation(
    temperatureC: number | undefined,
    pressureBar: number | undefined,
  ): Promise<string> {
    if (temperatureC !== undefined && temperatureC > 400) {
      return "Consider ASTM A106 Grade B (up to 427°C), ASTM A335 P11/P22 (up to 593°C), or ASTM A312 stainless (up to 816°C)";
    } else if (temperatureC !== undefined && temperatureC < -29) {
      return "Consider ASTM A333 Grade 6 (down to -100°C) or ASTM A312 stainless (down to -196°C)";
    }

    const suitable = await this.getSuitableMaterials(temperatureC, pressureBar);
    if (suitable.length > 0) {
      return `Consider: ${suitable.slice(0, 3).join(", ")}`;
    }

    return "Consult with materials engineer for special requirements";
  }
}
