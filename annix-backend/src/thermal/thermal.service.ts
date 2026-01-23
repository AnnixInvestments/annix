import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ExpansionRequirementDto,
  ExpansionRequirementResponseDto,
  BellowsSelectionDto,
  BellowsSelectionResponseDto,
  BellowsOptionDto,
  LoopSizingDto,
  LoopSizingResponseDto,
  ExpansionCoefficientDto,
  ThermalMaterial,
} from './dto/thermal.dto';

interface ExpansionCoefficient {
  material_code: string;
  material_name: string;
  temperature_c: number;
  mean_coefficient_per_c: string;
  instantaneous_coefficient_per_c: string;
  total_expansion_mm_per_m: string;
  modulus_of_elasticity_gpa: string;
  thermal_conductivity_w_mk: string;
  reference_standard: string;
}

interface BellowsJoint {
  id: number;
  joint_type: string;
  bellows_material: string;
  nominal_size_mm: number;
  axial_compression_mm: string;
  axial_extension_mm: string;
  lateral_offset_mm: string;
  angular_rotation_deg: string;
  max_pressure_bar: string;
  min_temperature_c: number;
  max_temperature_c: number;
  face_to_face_length_mm: string;
  weight_kg: string;
  list_price_zar: string;
}

interface LoopSizing {
  loop_type: string;
  nominal_size_mm: number;
  pipe_schedule: string;
  material_code: string;
  expansion_mm: number;
  loop_height_mm: number;
  loop_width_mm: number;
  total_pipe_length_mm: number;
  number_of_elbows: number;
}

@Injectable()
export class ThermalService {
  private readonly fallbackCoefficients: Record<ThermalMaterial, number> = {
    [ThermalMaterial.CARBON_STEEL]: 0.0000117,
    [ThermalMaterial.STAINLESS_304]: 0.0000165,
    [ThermalMaterial.STAINLESS_316]: 0.0000160,
    [ThermalMaterial.DUPLEX_2205]: 0.0000132,
    [ThermalMaterial.INCONEL_625]: 0.0000135,
    [ThermalMaterial.MONEL_400]: 0.0000148,
    [ThermalMaterial.HASTELLOY_C276]: 0.0000124,
    [ThermalMaterial.COPPER]: 0.0000170,
    [ThermalMaterial.ALUMINUM_6061]: 0.0000238,
    [ThermalMaterial.CHROME_MOLY_P22]: 0.0000132,
  };

  private readonly materialNames: Record<ThermalMaterial, string> = {
    [ThermalMaterial.CARBON_STEEL]: 'Carbon Steel',
    [ThermalMaterial.STAINLESS_304]: 'Stainless Steel 304',
    [ThermalMaterial.STAINLESS_316]: 'Stainless Steel 316',
    [ThermalMaterial.DUPLEX_2205]: 'Duplex 2205',
    [ThermalMaterial.INCONEL_625]: 'Inconel 625',
    [ThermalMaterial.MONEL_400]: 'Monel 400',
    [ThermalMaterial.HASTELLOY_C276]: 'Hastelloy C-276',
    [ThermalMaterial.COPPER]: 'Copper',
    [ThermalMaterial.ALUMINUM_6061]: 'Aluminum 6061',
    [ThermalMaterial.CHROME_MOLY_P22]: 'Chrome-Moly P22',
  };

  constructor(private readonly dataSource: DataSource) {}

  async expansionRequirement(
    dto: ExpansionRequirementDto,
  ): Promise<ExpansionRequirementResponseDto> {
    const { lengthM, fromTempC, toTempC, material, nominalSizeMm } = dto;
    const temperatureChange = toTempC - fromTempC;
    const isExpansion = temperatureChange > 0;

    const coefficient = await this.interpolatedCoefficient(
      material,
      fromTempC,
      toTempC,
    );

    const expansionMm = coefficient * lengthM * 1000 * Math.abs(temperatureChange);
    const expansionPerMeterMm = coefficient * 1000 * Math.abs(temperatureChange);

    const recommendedJointCapacityMm = Math.ceil((expansionMm * 1.25) / 25) * 25;
    const maxSingleJointMovement = 50;
    const recommendedNumberOfJoints =
      expansionMm > maxSingleJointMovement
        ? Math.ceil(expansionMm / maxSingleJointMovement)
        : 1;

    let recommendedLoopHeightMm: number | undefined;
    let recommendedLoopType: string | undefined;

    if (nominalSizeMm && expansionMm > 10) {
      const loopSizing = await this.loopSizing({
        nominalSizeMm,
        expansionMm: Math.ceil(expansionMm),
        material,
        schedule: dto.schedule || 'Std',
      });
      recommendedLoopHeightMm = loopSizing.loopHeightMm;
      recommendedLoopType = loopSizing.loopType;
    }

    const notes = this.buildExpansionNotes(
      temperatureChange,
      expansionMm,
      recommendedNumberOfJoints,
      material,
    );

    return {
      expansionMm: Math.round(expansionMm * 100) / 100,
      expansionPerMeterMm: Math.round(expansionPerMeterMm * 1000) / 1000,
      meanCoefficientPerC: coefficient,
      temperatureChangeC: temperatureChange,
      isExpansion,
      materialName: this.materialNames[material],
      recommendedJointCapacityMm,
      recommendedNumberOfJoints,
      recommendedLoopHeightMm,
      recommendedLoopType,
      notes,
      referenceStandard: 'ASME B31.3',
    };
  }

  async bellowsSelection(
    dto: BellowsSelectionDto,
  ): Promise<BellowsSelectionResponseDto> {
    const {
      nominalSizeMm,
      axialMovementMm,
      lateralMovementMm,
      angularMovementDeg,
      designPressureBar,
      designTemperatureC,
      preferredMaterial,
    } = dto;

    let query = `
      SELECT *
      FROM bellows_expansion_joints
      WHERE nominal_size_mm = $1
      AND max_pressure_bar >= $2
      AND max_temperature_c >= $3
      AND min_temperature_c <= $3
      AND (axial_compression_mm + axial_extension_mm) >= $4
    `;

    const params: (string | number)[] = [
      nominalSizeMm,
      designPressureBar,
      designTemperatureC,
      axialMovementMm,
    ];

    if (lateralMovementMm && lateralMovementMm > 0) {
      params.push(lateralMovementMm);
      query += ` AND lateral_offset_mm >= $${params.length}`;
    }

    if (angularMovementDeg && angularMovementDeg > 0) {
      params.push(angularMovementDeg);
      query += ` AND angular_rotation_deg >= $${params.length}`;
    }

    if (preferredMaterial) {
      params.push(preferredMaterial);
      query += ` AND bellows_material = $${params.length}`;
    }

    query += ' ORDER BY list_price_zar ASC';

    const results: BellowsJoint[] = await this.dataSource.query(query, params);

    const options: BellowsOptionDto[] = results.map((b) => {
      const suitabilityScore = this.calculateBellowsSuitability(b, dto);

      return {
        id: b.id,
        jointType: b.joint_type,
        bellowsMaterial: b.bellows_material,
        nominalSizeMm: b.nominal_size_mm,
        axialCompressionMm: parseFloat(b.axial_compression_mm),
        axialExtensionMm: parseFloat(b.axial_extension_mm),
        lateralOffsetMm: b.lateral_offset_mm
          ? parseFloat(b.lateral_offset_mm)
          : undefined,
        angularRotationDeg: b.angular_rotation_deg
          ? parseFloat(b.angular_rotation_deg)
          : undefined,
        maxPressureBar: parseFloat(b.max_pressure_bar),
        maxTemperatureC: b.max_temperature_c,
        minTemperatureC: b.min_temperature_c,
        faceToFaceLengthMm: parseFloat(b.face_to_face_length_mm),
        weightKg: parseFloat(b.weight_kg),
        listPriceZar: b.list_price_zar ? parseFloat(b.list_price_zar) : undefined,
        suitabilityScore,
        notes: this.bellowsNotes(b, dto),
      };
    });

    options.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const notes = this.buildSelectionNotes(options.length, dto);

    return { options, notes };
  }

  async loopSizing(dto: LoopSizingDto): Promise<LoopSizingResponseDto> {
    const { nominalSizeMm, expansionMm, material, schedule, preferredLoopType } =
      dto;

    let exactQuery = `
      SELECT *
      FROM expansion_loop_sizing
      WHERE nominal_size_mm = $1
      AND expansion_mm = $2
      AND material_code = $3
      AND pipe_schedule = $4
    `;

    const exactParams: (string | number)[] = [
      nominalSizeMm,
      expansionMm,
      material,
      schedule || 'Std',
    ];

    if (preferredLoopType) {
      exactParams.push(preferredLoopType);
      exactQuery += ` AND loop_type = $${exactParams.length}`;
    }

    exactQuery += ' LIMIT 1';

    const exactResults: LoopSizing[] = await this.dataSource.query(
      exactQuery,
      exactParams,
    );

    if (exactResults.length > 0) {
      const exactMatch = exactResults[0];
      return {
        loopType: exactMatch.loop_type,
        loopHeightMm: exactMatch.loop_height_mm,
        loopWidthMm: exactMatch.loop_width_mm,
        totalPipeLengthMm: exactMatch.total_pipe_length_mm,
        numberOfElbows: exactMatch.number_of_elbows,
        elbowRadiusFactor: 1.5,
        isCalculated: false,
        notes: `Standard loop sizing from database for ${expansionMm}mm expansion.`,
      };
    }

    const lowerQuery = `
      SELECT *
      FROM expansion_loop_sizing
      WHERE nominal_size_mm = $1
      AND material_code = $2
      AND expansion_mm <= $3
      ORDER BY expansion_mm DESC
      LIMIT 1
    `;

    const higherQuery = `
      SELECT *
      FROM expansion_loop_sizing
      WHERE nominal_size_mm = $1
      AND material_code = $2
      AND expansion_mm >= $3
      ORDER BY expansion_mm ASC
      LIMIT 1
    `;

    const [lowerResults, higherResults]: [LoopSizing[], LoopSizing[]] =
      await Promise.all([
        this.dataSource.query(lowerQuery, [nominalSizeMm, material, expansionMm]),
        this.dataSource.query(higherQuery, [nominalSizeMm, material, expansionMm]),
      ]);

    const nearestLower = lowerResults[0];
    const nearestHigher = higherResults[0];

    if (nearestLower && nearestHigher) {
      const ratio =
        (expansionMm - nearestLower.expansion_mm) /
        (nearestHigher.expansion_mm - nearestLower.expansion_mm);

      const interpolatedHeight = Math.round(
        nearestLower.loop_height_mm +
          ratio * (nearestHigher.loop_height_mm - nearestLower.loop_height_mm),
      );
      const interpolatedWidth = Math.round(
        nearestLower.loop_width_mm +
          ratio * (nearestHigher.loop_width_mm - nearestLower.loop_width_mm),
      );
      const interpolatedPipeLen = Math.round(
        nearestLower.total_pipe_length_mm +
          ratio *
            (nearestHigher.total_pipe_length_mm -
              nearestLower.total_pipe_length_mm),
      );

      return {
        loopType: nearestLower.loop_type,
        loopHeightMm: interpolatedHeight,
        loopWidthMm: interpolatedWidth,
        totalPipeLengthMm: interpolatedPipeLen,
        numberOfElbows: nearestLower.number_of_elbows,
        elbowRadiusFactor: 1.5,
        isCalculated: true,
        notes: `Interpolated between ${nearestLower.expansion_mm}mm and ${nearestHigher.expansion_mm}mm expansion data.`,
      };
    }

    const calculatedHeight = this.calculateLoopHeight(
      nominalSizeMm,
      expansionMm,
      material,
    );

    return {
      loopType: 'full_loop',
      loopHeightMm: calculatedHeight,
      loopWidthMm: Math.round(calculatedHeight / 2),
      totalPipeLengthMm: calculatedHeight * 3,
      numberOfElbows: 4,
      elbowRadiusFactor: 1.5,
      isCalculated: true,
      notes: `Calculated using guided cantilever formula. H = 3√(Δ × OD × 0.03 / SA). Consider verifying with stress analysis for critical applications.`,
    };
  }

  async coefficientsForMaterial(
    material: ThermalMaterial,
  ): Promise<ExpansionCoefficientDto[]> {
    const query = `
      SELECT *
      FROM pipe_expansion_coefficients
      WHERE material_code = $1
      ORDER BY temperature_c ASC
    `;

    const results: ExpansionCoefficient[] = await this.dataSource.query(query, [
      material,
    ]);

    return results.map((r) => ({
      materialCode: r.material_code,
      materialName: r.material_name,
      temperatureC: r.temperature_c,
      meanCoefficientPerC: parseFloat(r.mean_coefficient_per_c),
      instantaneousCoefficientPerC: r.instantaneous_coefficient_per_c
        ? parseFloat(r.instantaneous_coefficient_per_c)
        : undefined,
      totalExpansionMmPerM: r.total_expansion_mm_per_m
        ? parseFloat(r.total_expansion_mm_per_m)
        : undefined,
      modulusOfElasticityGpa: r.modulus_of_elasticity_gpa
        ? parseFloat(r.modulus_of_elasticity_gpa)
        : undefined,
      thermalConductivityWmK: r.thermal_conductivity_w_mk
        ? parseFloat(r.thermal_conductivity_w_mk)
        : undefined,
      referenceStandard: r.reference_standard,
    }));
  }

  async availableMaterials(): Promise<{ code: string; name: string }[]> {
    const query = `
      SELECT DISTINCT material_code as code, material_name as name
      FROM pipe_expansion_coefficients
      ORDER BY material_name
    `;

    const results = await this.dataSource.query(query);
    return results.map((r: { code: string; name: string }) => ({
      code: r.code,
      name: r.name,
    }));
  }

  private async interpolatedCoefficient(
    material: ThermalMaterial,
    fromTemp: number,
    toTemp: number,
  ): Promise<number> {
    const avgTemp = (fromTemp + toTemp) / 2;

    const lowerQuery = `
      SELECT *
      FROM pipe_expansion_coefficients
      WHERE material_code = $1 AND temperature_c <= $2
      ORDER BY temperature_c DESC
      LIMIT 1
    `;

    const higherQuery = `
      SELECT *
      FROM pipe_expansion_coefficients
      WHERE material_code = $1 AND temperature_c >= $2
      ORDER BY temperature_c ASC
      LIMIT 1
    `;

    const [lowerResults, higherResults]: [
      ExpansionCoefficient[],
      ExpansionCoefficient[],
    ] = await Promise.all([
      this.dataSource.query(lowerQuery, [material, avgTemp]),
      this.dataSource.query(higherQuery, [material, avgTemp]),
    ]);

    const lower = lowerResults[0];
    const higher = higherResults[0];

    if (!lower && !higher) {
      return this.fallbackCoefficients[material];
    }

    if (!lower) {
      return parseFloat(higher!.mean_coefficient_per_c);
    }

    if (!higher) {
      return parseFloat(lower.mean_coefficient_per_c);
    }

    if (lower.temperature_c === higher.temperature_c) {
      return parseFloat(lower.mean_coefficient_per_c);
    }

    const ratio =
      (avgTemp - lower.temperature_c) /
      (higher.temperature_c - lower.temperature_c);
    const lowerCoeff = parseFloat(lower.mean_coefficient_per_c);
    const higherCoeff = parseFloat(higher.mean_coefficient_per_c);

    return lowerCoeff + ratio * (higherCoeff - lowerCoeff);
  }

  private calculateLoopHeight(
    nominalSizeMm: number,
    expansionMm: number,
    material: ThermalMaterial,
  ): number {
    const odMap: Record<number, number> = {
      25: 33.4,
      50: 60.3,
      80: 88.9,
      100: 114.3,
      150: 168.3,
      200: 219.1,
      250: 273.1,
      300: 323.9,
    };

    const od = odMap[nominalSizeMm] || nominalSizeMm * 1.25;

    const allowableStressMpa =
      material === ThermalMaterial.CARBON_STEEL
        ? 207
        : material === ThermalMaterial.STAINLESS_304 ||
            material === ThermalMaterial.STAINLESS_316
          ? 172
          : 165;

    const height = 3 * Math.sqrt((expansionMm * od * 0.03) / allowableStressMpa);
    const heightMm = height * 1000;

    return Math.ceil(heightMm / 50) * 50;
  }

  private calculateBellowsSuitability(
    bellows: BellowsJoint,
    dto: BellowsSelectionDto,
  ): number {
    let score = 100;

    const totalAxial =
      parseFloat(bellows.axial_compression_mm) +
      parseFloat(bellows.axial_extension_mm);
    const axialMargin = (totalAxial - dto.axialMovementMm) / dto.axialMovementMm;
    if (axialMargin > 0.5) score -= 10;
    if (axialMargin > 1.0) score -= 10;
    if (axialMargin < 0.2) score -= 20;

    const pressureMargin =
      (parseFloat(bellows.max_pressure_bar) - dto.designPressureBar) /
      dto.designPressureBar;
    if (pressureMargin > 1.0) score -= 5;
    if (pressureMargin < 0.2) score -= 15;

    if (dto.lateralMovementMm && parseFloat(bellows.lateral_offset_mm) > 0) {
      score += 10;
    }

    if (bellows.bellows_material.includes('stainless')) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private bellowsNotes(bellows: BellowsJoint, dto: BellowsSelectionDto): string {
    const notes: string[] = [];

    const totalAxial =
      parseFloat(bellows.axial_compression_mm) +
      parseFloat(bellows.axial_extension_mm);
    const axialMargin = ((totalAxial - dto.axialMovementMm) / dto.axialMovementMm) * 100;
    notes.push(`Axial capacity margin: ${axialMargin.toFixed(0)}%`);

    const pressureMargin =
      ((parseFloat(bellows.max_pressure_bar) - dto.designPressureBar) /
        dto.designPressureBar) *
      100;
    notes.push(`Pressure rating margin: ${pressureMargin.toFixed(0)}%`);

    if (bellows.joint_type === 'tied_universal') {
      notes.push('Tie rods transfer pressure thrust - no anchor required');
    }

    return notes.join('. ');
  }

  private buildExpansionNotes(
    tempChange: number,
    expansion: number,
    joints: number,
    material: ThermalMaterial,
  ): string {
    const direction = tempChange > 0 ? 'expansion' : 'contraction';
    const absExpansion = Math.abs(expansion);
    const notes: string[] = [];

    notes.push(`Thermal ${direction}: ΔL = α × L × ΔT`);

    if (absExpansion < 10) {
      notes.push('Minor movement - fixed supports may be acceptable');
    } else if (absExpansion < 50) {
      notes.push('Moderate movement - expansion loops or bellows recommended');
    } else {
      notes.push('Significant movement - expansion joints required');
    }

    if (joints > 1) {
      notes.push(`Recommend ${joints} expansion points to distribute movement`);
    }

    if (
      material === ThermalMaterial.STAINLESS_304 ||
      material === ThermalMaterial.STAINLESS_316
    ) {
      notes.push('Stainless steel has ~45% higher expansion than carbon steel');
    }

    if (material === ThermalMaterial.ALUMINUM_6061) {
      notes.push(
        'Aluminum has very high expansion (~2x carbon steel) - ensure adequate flexibility',
      );
    }

    return notes.join('. ') + '.';
  }

  private buildSelectionNotes(count: number, dto: BellowsSelectionDto): string {
    if (count === 0) {
      return `No bellows found matching requirements. Consider: increasing size tolerance, reducing movement requirements, or using expansion loops. Required: ${dto.nominalSizeMm}mm, ${dto.axialMovementMm}mm axial, ${dto.designPressureBar} bar.`;
    }

    if (count === 1) {
      return 'Single option available. Verify suitability with manufacturer.';
    }

    return `${count} options available. Options sorted by suitability score. Consider lead time and availability when selecting.`;
  }
}
