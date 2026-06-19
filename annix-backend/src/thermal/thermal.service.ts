import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import {
  BellowsOptionDto,
  BellowsSelectionDto,
  BellowsSelectionResponseDto,
  ExpansionCoefficientDto,
  ExpansionRequirementDto,
  ExpansionRequirementResponseDto,
  LoopSizingDto,
  LoopSizingResponseDto,
  ThermalMaterial,
} from "./dto/thermal.dto";

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
    [ThermalMaterial.STAINLESS_316]: 0.000016,
    [ThermalMaterial.DUPLEX_2205]: 0.0000132,
    [ThermalMaterial.INCONEL_625]: 0.0000135,
    [ThermalMaterial.MONEL_400]: 0.0000148,
    [ThermalMaterial.HASTELLOY_C276]: 0.0000124,
    [ThermalMaterial.COPPER]: 0.000017,
    [ThermalMaterial.ALUMINUM_6061]: 0.0000238,
    [ThermalMaterial.CHROME_MOLY_P22]: 0.0000132,
  };

  private readonly materialNames: Record<ThermalMaterial, string> = {
    [ThermalMaterial.CARBON_STEEL]: "Carbon Steel",
    [ThermalMaterial.STAINLESS_304]: "Stainless Steel 304",
    [ThermalMaterial.STAINLESS_316]: "Stainless Steel 316",
    [ThermalMaterial.DUPLEX_2205]: "Duplex 2205",
    [ThermalMaterial.INCONEL_625]: "Inconel 625",
    [ThermalMaterial.MONEL_400]: "Monel 400",
    [ThermalMaterial.HASTELLOY_C276]: "Hastelloy C-276",
    [ThermalMaterial.COPPER]: "Copper",
    [ThermalMaterial.ALUMINUM_6061]: "Aluminum 6061",
    [ThermalMaterial.CHROME_MOLY_P22]: "Chrome-Moly P22",
  };

  constructor(@InjectConnection() private readonly connection: Connection) {}

  private numericOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const num = typeof value === "number" ? value : parseFloat(String(value));
    return Number.isNaN(num) ? null : num;
  }

  private numeric(value: unknown): number {
    return this.numericOrNull(value) ?? 0;
  }

  async expansionRequirement(
    dto: ExpansionRequirementDto,
  ): Promise<ExpansionRequirementResponseDto> {
    const { lengthM, fromTempC, toTempC, material, nominalSizeMm } = dto;
    const temperatureChange = toTempC - fromTempC;
    const isExpansion = temperatureChange > 0;

    const coefficient = await this.interpolatedCoefficient(material, fromTempC, toTempC);

    const expansionMm = coefficient * lengthM * 1000 * Math.abs(temperatureChange);
    const expansionPerMeterMm = coefficient * 1000 * Math.abs(temperatureChange);

    const recommendedJointCapacityMm = Math.ceil((expansionMm * 1.25) / 25) * 25;
    const maxSingleJointMovement = 50;
    const recommendedNumberOfJoints =
      expansionMm > maxSingleJointMovement ? Math.ceil(expansionMm / maxSingleJointMovement) : 1;

    let recommendedLoopHeightMm: number | undefined;
    let recommendedLoopType: string | undefined;

    if (nominalSizeMm && expansionMm > 10) {
      const loopSizing = await this.loopSizing({
        nominalSizeMm,
        expansionMm: Math.ceil(expansionMm),
        material,
        schedule: dto.schedule || "Std",
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
      referenceStandard: "ASME B31.3",
    };
  }

  async bellowsSelection(dto: BellowsSelectionDto): Promise<BellowsSelectionResponseDto> {
    const {
      nominalSizeMm,
      axialMovementMm,
      lateralMovementMm,
      angularMovementDeg,
      designPressureBar,
      designTemperatureC,
      preferredMaterial,
    } = dto;

    const filter: Record<string, unknown> = {
      nominal_size_mm: nominalSizeMm,
      max_pressure_bar: { $gte: designPressureBar },
      max_temperature_c: { $gte: designTemperatureC },
      min_temperature_c: { $lte: designTemperatureC },
    };

    if (lateralMovementMm && lateralMovementMm > 0) {
      filter.lateral_offset_mm = { $gte: lateralMovementMm };
    }

    if (angularMovementDeg && angularMovementDeg > 0) {
      filter.angular_rotation_deg = { $gte: angularMovementDeg };
    }

    if (preferredMaterial) {
      filter.bellows_material = preferredMaterial;
    }

    const docs = await this.connection
      .collection<BellowsJoint>("bellows_expansion_joints")
      .find(filter)
      .toArray();

    const results = docs
      .filter(
        (b) =>
          this.numeric(b.axial_compression_mm) + this.numeric(b.axial_extension_mm) >=
          axialMovementMm,
      )
      .sort((a, b) => this.numeric(a.list_price_zar) - this.numeric(b.list_price_zar));

    const options: BellowsOptionDto[] = results.map((b) => {
      const suitabilityScore = this.calculateBellowsSuitability(b, dto);

      return {
        id: b.id,
        jointType: b.joint_type,
        bellowsMaterial: b.bellows_material,
        nominalSizeMm: b.nominal_size_mm,
        axialCompressionMm: parseFloat(b.axial_compression_mm),
        axialExtensionMm: parseFloat(b.axial_extension_mm),
        lateralOffsetMm: b.lateral_offset_mm ? parseFloat(b.lateral_offset_mm) : undefined,
        angularRotationDeg: b.angular_rotation_deg ? parseFloat(b.angular_rotation_deg) : undefined,
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
    const { nominalSizeMm, expansionMm, material, schedule, preferredLoopType } = dto;

    const loopCollection = this.connection.collection<LoopSizing>("expansion_loop_sizing");

    const exactFilter: Record<string, unknown> = {
      nominal_size_mm: nominalSizeMm,
      expansion_mm: expansionMm,
      material_code: material,
      pipe_schedule: schedule || "Std",
    };

    if (preferredLoopType) {
      exactFilter.loop_type = preferredLoopType;
    }

    const exactMatch = await loopCollection.findOne(exactFilter);

    if (exactMatch) {
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

    const [nearestLower, nearestHigher] = await Promise.all([
      loopCollection.findOne(
        {
          nominal_size_mm: nominalSizeMm,
          material_code: material,
          expansion_mm: { $lte: expansionMm },
        },
        { sort: { expansion_mm: -1 } },
      ),
      loopCollection.findOne(
        {
          nominal_size_mm: nominalSizeMm,
          material_code: material,
          expansion_mm: { $gte: expansionMm },
        },
        { sort: { expansion_mm: 1 } },
      ),
    ]);

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
          ratio * (nearestHigher.total_pipe_length_mm - nearestLower.total_pipe_length_mm),
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

    const calculatedHeight = this.calculateLoopHeight(nominalSizeMm, expansionMm, material);

    return {
      loopType: "full_loop",
      loopHeightMm: calculatedHeight,
      loopWidthMm: Math.round(calculatedHeight / 2),
      totalPipeLengthMm: calculatedHeight * 3,
      numberOfElbows: 4,
      elbowRadiusFactor: 1.5,
      isCalculated: true,
      notes:
        "Calculated using guided cantilever formula. H = 3√(Δ × OD × 0.03 / SA). Consider verifying with stress analysis for critical applications.",
    };
  }

  async coefficientsForMaterial(material: ThermalMaterial): Promise<ExpansionCoefficientDto[]> {
    const docs = await this.connection
      .collection<ExpansionCoefficient>("pipe_expansion_coefficients")
      .find({ material_code: material })
      .toArray();

    return docs
      .sort((a, b) => this.numeric(a.temperature_c) - this.numeric(b.temperature_c))
      .map((r) => ({
        materialCode: r.material_code,
        materialName: r.material_name,
        temperatureC: this.numeric(r.temperature_c),
        meanCoefficientPerC: this.numeric(r.mean_coefficient_per_c),
        instantaneousCoefficientPerC:
          this.numericOrNull(r.instantaneous_coefficient_per_c) ?? undefined,
        totalExpansionMmPerM: this.numericOrNull(r.total_expansion_mm_per_m) ?? undefined,
        modulusOfElasticityGpa: this.numericOrNull(r.modulus_of_elasticity_gpa) ?? undefined,
        thermalConductivityWmK: this.numericOrNull(r.thermal_conductivity_w_mk) ?? undefined,
        referenceStandard: r.reference_standard,
      }));
  }

  async availableMaterials(): Promise<{ code: string; name: string }[]> {
    const docs = await this.connection
      .collection<ExpansionCoefficient>("pipe_expansion_coefficients")
      .find({}, { projection: { material_code: 1, material_name: 1 } })
      .toArray();

    const byCode = docs.reduce<Map<string, { code: string; name: string }>>((acc, doc) => {
      if (doc.material_code && !acc.has(doc.material_code)) {
        acc.set(doc.material_code, { code: doc.material_code, name: doc.material_name });
      }
      return acc;
    }, new Map());

    return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private async interpolatedCoefficient(
    material: ThermalMaterial,
    fromTemp: number,
    toTemp: number,
  ): Promise<number> {
    const avgTemp = (fromTemp + toTemp) / 2;
    const coefficients = this.connection.collection<ExpansionCoefficient>(
      "pipe_expansion_coefficients",
    );

    const [lower, higher] = await Promise.all([
      coefficients.findOne(
        { material_code: material, temperature_c: { $lte: avgTemp } },
        { sort: { temperature_c: -1 } },
      ),
      coefficients.findOne(
        { material_code: material, temperature_c: { $gte: avgTemp } },
        { sort: { temperature_c: 1 } },
      ),
    ]);

    if (!lower && !higher) {
      return this.fallbackCoefficients[material];
    }

    if (!lower) {
      return this.numeric(higher?.mean_coefficient_per_c);
    }

    if (!higher) {
      return this.numeric(lower.mean_coefficient_per_c);
    }

    const lowerTemp = this.numeric(lower.temperature_c);
    const higherTemp = this.numeric(higher.temperature_c);

    if (lowerTemp === higherTemp) {
      return this.numeric(lower.mean_coefficient_per_c);
    }

    const ratio = (avgTemp - lowerTemp) / (higherTemp - lowerTemp);
    const lowerCoeff = this.numeric(lower.mean_coefficient_per_c);
    const higherCoeff = this.numeric(higher.mean_coefficient_per_c);

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
        : material === ThermalMaterial.STAINLESS_304 || material === ThermalMaterial.STAINLESS_316
          ? 172
          : 165;

    const height = 3 * Math.sqrt((expansionMm * od * 0.03) / allowableStressMpa);
    const heightMm = height * 1000;

    return Math.ceil(heightMm / 50) * 50;
  }

  private calculateBellowsSuitability(bellows: BellowsJoint, dto: BellowsSelectionDto): number {
    let score = 100;

    const totalAxial =
      parseFloat(bellows.axial_compression_mm) + parseFloat(bellows.axial_extension_mm);
    const axialMargin = (totalAxial - dto.axialMovementMm) / dto.axialMovementMm;
    if (axialMargin > 0.5) score -= 10;
    if (axialMargin > 1.0) score -= 10;
    if (axialMargin < 0.2) score -= 20;

    const pressureMargin =
      (parseFloat(bellows.max_pressure_bar) - dto.designPressureBar) / dto.designPressureBar;
    if (pressureMargin > 1.0) score -= 5;
    if (pressureMargin < 0.2) score -= 15;

    if (dto.lateralMovementMm && parseFloat(bellows.lateral_offset_mm) > 0) {
      score += 10;
    }

    if (bellows.bellows_material.includes("stainless")) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private bellowsNotes(bellows: BellowsJoint, dto: BellowsSelectionDto): string {
    const notes: string[] = [];

    const totalAxial =
      parseFloat(bellows.axial_compression_mm) + parseFloat(bellows.axial_extension_mm);
    const axialMargin = ((totalAxial - dto.axialMovementMm) / dto.axialMovementMm) * 100;
    notes.push(`Axial capacity margin: ${axialMargin.toFixed(0)}%`);

    const pressureMargin =
      ((parseFloat(bellows.max_pressure_bar) - dto.designPressureBar) / dto.designPressureBar) *
      100;
    notes.push(`Pressure rating margin: ${pressureMargin.toFixed(0)}%`);

    if (bellows.joint_type === "tied_universal") {
      notes.push("Tie rods transfer pressure thrust - no anchor required");
    }

    return notes.join(". ");
  }

  private buildExpansionNotes(
    tempChange: number,
    expansion: number,
    joints: number,
    material: ThermalMaterial,
  ): string {
    const direction = tempChange > 0 ? "expansion" : "contraction";
    const absExpansion = Math.abs(expansion);
    const notes: string[] = [];

    notes.push(`Thermal ${direction}: ΔL = α × L × ΔT`);

    if (absExpansion < 10) {
      notes.push("Minor movement - fixed supports may be acceptable");
    } else if (absExpansion < 50) {
      notes.push("Moderate movement - expansion loops or bellows recommended");
    } else {
      notes.push("Significant movement - expansion joints required");
    }

    if (joints > 1) {
      notes.push(`Recommend ${joints} expansion points to distribute movement`);
    }

    if (material === ThermalMaterial.STAINLESS_304 || material === ThermalMaterial.STAINLESS_316) {
      notes.push("Stainless steel has ~45% higher expansion than carbon steel");
    }

    if (material === ThermalMaterial.ALUMINUM_6061) {
      notes.push(
        "Aluminum has very high expansion (~2x carbon steel) - ensure adequate flexibility",
      );
    }

    return `${notes.join(". ")}.`;
  }

  private buildSelectionNotes(count: number, dto: BellowsSelectionDto): string {
    if (count === 0) {
      return `No bellows found matching requirements. Consider: increasing size tolerance, reducing movement requirements, or using expansion loops. Required: ${dto.nominalSizeMm}mm, ${dto.axialMovementMm}mm axial, ${dto.designPressureBar} bar.`;
    }

    if (count === 1) {
      return "Single option available. Verify suitability with manufacturer.";
    }

    return `${count} options available. Options sorted by suitability score. Consider lead time and availability when selecting.`;
  }
}
