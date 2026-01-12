import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialLimit } from './entities/material-limit.entity';

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
  constructor(
    @InjectRepository(MaterialLimit)
    private materialLimitRepository: Repository<MaterialLimit>,
  ) {}

  async findAll(): Promise<MaterialLimit[]> {
    return this.materialLimitRepository.find({
      relations: ['steelSpecification'],
    });
  }

  async findBySpecName(steelSpecName: string): Promise<MaterialLimit | null> {
    // Try exact match first
    const limit = await this.materialLimitRepository.findOne({
      where: { steel_spec_name: steelSpecName },
      relations: ['steelSpecification'],
    });

    if (limit) return limit;

    // Try partial match (e.g., "ASTM A106 Grade B" matches "ASTM A106")
    const allLimits = await this.materialLimitRepository.find();
    const partialMatch = allLimits.find((l) =>
      steelSpecName.toLowerCase().includes(l.steel_spec_name.toLowerCase()),
    );

    if (partialMatch) return partialMatch;

    // Try reverse partial match (e.g., spec name contains limit name)
    const reverseMatch = allLimits.find((l) =>
      l.steel_spec_name.toLowerCase().includes(steelSpecName.toLowerCase()),
    );

    return reverseMatch || null;
  }

  async findBySpecId(
    steelSpecificationId: number,
  ): Promise<MaterialLimit | null> {
    return this.materialLimitRepository.findOne({
      where: { steel_specification_id: steelSpecificationId },
      relations: ['steelSpecification'],
    });
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

    // Check temperature limits
    if (temperatureC !== undefined) {
      if (temperatureC < limits.min_temperature_celsius) {
        isSuitable = false;
        warnings.push(
          `Temperature ${temperatureC}°C is below minimum ${limits.min_temperature_celsius}°C for ${steelSpecName}`,
        );
      }
      if (temperatureC > limits.max_temperature_celsius) {
        isSuitable = false;
        warnings.push(
          `Temperature ${temperatureC}°C exceeds maximum ${limits.max_temperature_celsius}°C for ${steelSpecName}`,
        );
      }
    }

    // Check pressure limits
    if (pressureBar !== undefined) {
      const maxPressure = Number(limits.max_pressure_bar);
      if (pressureBar > maxPressure) {
        warnings.push(
          `Pressure ${pressureBar} bar may require special consideration for ${steelSpecName} (typical max: ${maxPressure} bar)`,
        );
      }
    }

    // Generate recommendation if unsuitable
    let recommendation: string | undefined;
    if (!isSuitable) {
      recommendation = await this.generateRecommendation(
        temperatureC,
        pressureBar,
      );
    }

    return {
      isSuitable,
      warnings,
      recommendation,
      limits: {
        minTempC: limits.min_temperature_celsius,
        maxTempC: limits.max_temperature_celsius,
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
    const allLimits = await this.materialLimitRepository.find();
    const suitable: string[] = [];

    for (const limits of allLimits) {
      let isOk = true;

      if (temperatureC !== undefined) {
        if (
          temperatureC < limits.min_temperature_celsius ||
          temperatureC > limits.max_temperature_celsius
        ) {
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
        suitable.push(limits.steel_spec_name);
      }
    }

    return suitable;
  }

  private async generateRecommendation(
    temperatureC: number | undefined,
    pressureBar: number | undefined,
  ): Promise<string> {
    if (temperatureC !== undefined && temperatureC > 400) {
      return 'Consider ASTM A106 Grade B (up to 427°C), ASTM A335 P11/P22 (up to 593°C), or ASTM A312 stainless (up to 816°C)';
    } else if (temperatureC !== undefined && temperatureC < -29) {
      return 'Consider ASTM A333 Grade 6 (down to -100°C) or ASTM A312 stainless (down to -196°C)';
    }

    // Get suitable materials
    const suitable = await this.getSuitableMaterials(temperatureC, pressureBar);
    if (suitable.length > 0) {
      return `Consider: ${suitable.slice(0, 3).join(', ')}`;
    }

    return 'Consult with materials engineer for special requirements';
  }
}
