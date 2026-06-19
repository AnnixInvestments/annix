import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { NB_MM_TO_NPS } from "../lib/pipe-constants";
import {
  AssemblyValidateDto,
  AssemblyValidationResultDto,
  CompatibilityIssueDto,
  CompleteFlangeSpecificationDto,
  FlangeBoltingInfoDto,
  GasketInfoDto,
  MaterialSearchQueryDto,
  MaterialSearchResponseDto,
  MaterialSearchResultDto,
  PtRatingInfoDto,
} from "./dto/unified-api.dto";

type ReferenceRow = Record<string, unknown> & { _id: number };

const ISO_METRIC_THREAD_PITCHES: Record<number, number> = {
  12: 1.75,
  14: 2.0,
  16: 2.0,
  18: 2.5,
  20: 2.5,
  22: 2.5,
  24: 3.0,
  27: 3.0,
  30: 3.5,
  33: 3.5,
  36: 4.0,
  39: 4.0,
  42: 4.5,
  45: 4.5,
  48: 5.0,
  52: 5.0,
  56: 5.5,
  60: 5.5,
  64: 6.0,
};

const GALVANIC_COMPATIBILITY: Record<string, Record<string, boolean>> = {
  "Carbon Steel": {
    "Carbon Steel": true,
    "Stainless Steel": false,
    Duplex: false,
    Copper: false,
    Aluminum: false,
  },
  "Stainless Steel": {
    "Carbon Steel": false,
    "Stainless Steel": true,
    Duplex: true,
    Copper: true,
    Aluminum: false,
  },
  Duplex: {
    "Carbon Steel": false,
    "Stainless Steel": true,
    Duplex: true,
    Copper: true,
    Aluminum: false,
  },
};

@Injectable()
export class UnifiedApiService {
  private readonly logger = new Logger(UnifiedApiService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  private numericOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const num = parseFloat(String(value));
    return Number.isNaN(num) ? null : num;
  }

  async completeFlangeSpecification(
    id: number,
    materialGroup: string = "Carbon Steel A105 (Group 1.1)",
  ): Promise<CompleteFlangeSpecificationDto> {
    const flange = await this.connection
      .collection<ReferenceRow>("flange_dimensions")
      .findOne({ _id: id });

    if (!flange) {
      throw new NotFoundException(`Flange dimension ${id} not found`);
    }

    const [standard, pressureClass, flangeType, nominalOutsideDiameter, bolt] = await Promise.all([
      flange.standardId != null
        ? this.connection
            .collection<ReferenceRow>("flange_standards")
            .findOne({ _id: flange.standardId as number })
        : Promise.resolve(null),
      flange.pressureClassId != null
        ? this.connection
            .collection<ReferenceRow>("flange_pressure_classes")
            .findOne({ _id: flange.pressureClassId as number })
        : Promise.resolve(null),
      flange.flangeTypeId != null
        ? this.connection
            .collection<ReferenceRow>("flange_types")
            .findOne({ _id: flange.flangeTypeId as number })
        : Promise.resolve(null),
      flange.nominalOutsideDiameterId != null
        ? this.connection
            .collection<ReferenceRow>("nominal_outside_diameters")
            .findOne({ _id: flange.nominalOutsideDiameterId as number })
        : Promise.resolve(null),
      flange.boltId != null
        ? this.connection
            .collection<ReferenceRow>("bolts")
            .findOne({ _id: flange.boltId as number })
        : Promise.resolve(null),
    ]);

    const nominalBoreMm = this.numericOrNull(nominalOutsideDiameter?.nominal_diameter_mm) ?? 0;
    const standardCode = (standard?.code as string) ?? null;
    const pressureClassDesignation = (pressureClass?.designation as string) ?? null;
    const nps = (nominalOutsideDiameter?.nps_designation as string) ?? null;

    const result: CompleteFlangeSpecificationDto = {
      id: flange._id as number,
      standardCode,
      standardName: standardCode,
      pressureClass: pressureClassDesignation,
      flangeType: (flangeType?.name as string) ?? null,
      nominalBoreMm,
      nps,
      outerDiameterMm: this.numericOrNull(flange.D) ?? 0,
      thicknessMm: this.numericOrNull(flange.b) ?? 0,
      boreDiameterMm: this.numericOrNull(flange.d4) ?? 0,
      raisedFaceDiameterMm: this.numericOrNull(flange.f),
      hubDiameterMm: this.numericOrNull(flange.d1),
      pcdMm: this.numericOrNull(flange.pcd) ?? 0,
      numHoles: flange.num_holes as number,
      holeDiameterMm: null,
      massKg: this.numericOrNull(flange.mass_kg),
    };

    const [bolting, ptRatings, gasket] = await Promise.all([
      this.boltingInfoMongo(
        flange,
        standardCode,
        pressureClassDesignation,
        nps,
        bolt,
        materialGroup,
      ),
      flange.pressureClassId != null
        ? this.ptRatingsForClassMongo(flange.pressureClassId as number, materialGroup)
        : Promise.resolve([]),
      this.gasketInfoMongo(nominalBoreMm),
    ]);

    if (bolting) {
      result.bolting = bolting;
    }

    if (ptRatings.length > 0) {
      result.ptRatings = ptRatings;
    }

    if (gasket) {
      result.gasket = gasket;
    }

    return result;
  }

  private async boltingInfoMongo(
    flange: Record<string, unknown>,
    standardCode: string | null,
    pressureClassDesignation: string | null,
    nps: string | null,
    bolt: Record<string, unknown> | null,
    materialGroup: string,
  ): Promise<FlangeBoltingInfoDto | null> {
    const boltDesignation = bolt?.designation as string | undefined;
    if (!boltDesignation) {
      return null;
    }

    const diameterMatch = boltDesignation.match(/M(\d+)/i);
    const boltDiameterMm = diameterMatch ? parseInt(diameterMatch[1], 10) : 16;
    const threadPitchMm =
      (bolt?.threadPitchMm as number) || ISO_METRIC_THREAD_PITCHES[boltDiameterMm] || 2.0;

    const effectiveNps =
      nps || this.nominalBoreToNps(this.numericOrNull(flange.nominalBoreMm) ?? 0);

    const standardDoc = standardCode
      ? await this.connection
          .collection<ReferenceRow>("flange_standards")
          .findOne({ code: standardCode })
      : null;

    const boltingDoc =
      standardDoc && pressureClassDesignation
        ? await this.connection.collection<ReferenceRow>("flange_bolting").findOne({
            standardId: standardDoc._id,
            pressureClass: pressureClassDesignation,
            nps: effectiveNps,
          })
        : null;

    const materialPrefix = materialGroup.split(" ")[0];
    const materialDoc = await this.connection
      .collection<ReferenceRow>("flange_bolting_materials")
      .findOne({
        materialGroup: { $regex: materialPrefix, $options: "i" },
      });

    const boltLengthMm =
      (this.numericOrNull(flange.boltLengthMm) ||
        this.numericOrNull(boltingDoc?.boltLengthDefault)) ??
      70;

    let boltMassKg: number | undefined;
    if (flange.boltId != null) {
      const massDocs = await this.connection
        .collection<ReferenceRow>("bolt_masses")
        .find({ boltId: flange.boltId })
        .toArray();
      if (massDocs.length > 0) {
        const nearest = massDocs.reduce((best, candidate) => {
          const bestDiff = Math.abs((this.numericOrNull(best.length_mm) ?? 0) - boltLengthMm);
          const candidateDiff = Math.abs(
            (this.numericOrNull(candidate.length_mm) ?? 0) - boltLengthMm,
          );
          return candidateDiff < bestDiff ? candidate : best;
        });
        const mass = this.numericOrNull(nearest.mass_kg);
        if (mass !== null) {
          boltMassKg = mass;
        }
      }
    }

    const numHoles = flange.num_holes as number | undefined;

    return {
      boltDesignation,
      boltDiameterMm,
      threadPitchMm,
      defaultLengthMm: this.numericOrNull(boltingDoc?.boltLengthDefault),
      lengthSoSwThMm: this.numericOrNull(boltingDoc?.boltLengthSoSwTh),
      lengthLjMm: this.numericOrNull(boltingDoc?.boltLengthLj),
      studSpec: (materialDoc?.studSpec as string) || null,
      nutSpec: (materialDoc?.nutSpec as string) || null,
      boltMassKg,
      totalBoltSetMassKg: boltMassKg && numHoles ? boltMassKg * numHoles : undefined,
    };
  }

  private async ptRatingsForClassMongo(
    pressureClassId: number,
    materialGroup: string,
  ): Promise<PtRatingInfoDto[]> {
    const docs = await this.connection
      .collection<ReferenceRow>("flange_pt_ratings")
      .find({ pressureClassId, materialGroup })
      .toArray();

    return docs
      .sort(
        (a, b) =>
          (this.numericOrNull(a.temperatureCelsius) ?? 0) -
          (this.numericOrNull(b.temperatureCelsius) ?? 0),
      )
      .map((doc) => {
        const maxPressurePsi = this.numericOrNull(doc.maxPressurePsi);
        return {
          temperatureC: this.numericOrNull(doc.temperatureCelsius) ?? 0,
          maxPressureBar: this.numericOrNull(doc.maxPressureBar) ?? 0,
          maxPressurePsi: maxPressurePsi ?? undefined,
          materialGroup: doc.materialGroup as string,
        };
      });
  }

  private async gasketInfoMongo(nominalBoreMm: number): Promise<GasketInfoDto | null> {
    const docs = await this.connection
      .collection<ReferenceRow>("gasket_weights")
      .find({ nominal_bore_mm: nominalBoreMm })
      .toArray();

    if (docs.length === 0) {
      return null;
    }

    const gasket = docs.sort((a, b) =>
      String(a.gasket_type ?? "").localeCompare(String(b.gasket_type ?? "")),
    )[0];

    return {
      gasketType: gasket.gasket_type as string,
      weightKg: this.numericOrNull(gasket.weight_kg) ?? 0,
      innerDiameterMm: this.numericOrNull(gasket.inner_diameter_mm),
      outerDiameterMm: this.numericOrNull(gasket.outer_diameter_mm),
    };
  }

  private nominalBoreToNps(nominalBoreMm: number): string {
    return NB_MM_TO_NPS[nominalBoreMm] || String(nominalBoreMm);
  }

  async materialSearch(query: MaterialSearchQueryDto): Promise<MaterialSearchResponseDto> {
    const searchTerm = query.query.toLowerCase();
    const results: MaterialSearchResultDto[] = [];

    if (!query.type || query.type === "all" || query.type === "steel") {
      results.push(...(await this.searchSteelSpecificationsMongo(searchTerm)));
    }

    if (!query.type || query.type === "all" || query.type === "pipe") {
      results.push(...(await this.searchPipeMaterialsMongo(searchTerm)));
    }

    if (!query.type || query.type === "all" || query.type === "flange") {
      results.push(...(await this.searchFlangeMaterialsMongo(searchTerm)));
    }

    results.sort((a, b) => b.matchScore - a.matchScore);

    return {
      totalResults: results.length,
      query: query.query,
      results,
    };
  }

  private mongoRegex(searchTerm: string): RegExp {
    const pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(pattern, "i");
  }

  private steelMatchScore(name: string, searchTerm: string): number {
    if (name === searchTerm) {
      return 100;
    }
    if (name.startsWith(searchTerm)) {
      return 90;
    }
    if (name.includes(searchTerm)) {
      return 70;
    }
    return 50;
  }

  private async searchSteelSpecificationsMongo(
    searchTerm: string,
  ): Promise<MaterialSearchResultDto[]> {
    const docs = await this.connection
      .collection<ReferenceRow>("steel_specifications")
      .find({ steelSpecName: { $regex: this.mongoRegex(searchTerm) } })
      .limit(50)
      .toArray();

    return docs
      .sort((a, b) => String(a.steelSpecName ?? "").localeCompare(String(b.steelSpecName ?? "")))
      .map((doc) => {
        const specName = doc.steelSpecName as string;
        return {
          type: "steel_specification" as const,
          id: doc._id as number,
          name: specName,
          matchScore: this.steelMatchScore(specName.toLowerCase(), searchTerm),
        };
      });
  }

  private async searchPipeMaterialsMongo(searchTerm: string): Promise<MaterialSearchResultDto[]> {
    const steelDocs = await this.connection
      .collection<ReferenceRow>("steel_specifications")
      .find({ steelSpecName: { $regex: this.mongoRegex(searchTerm) } })
      .toArray();

    if (steelDocs.length === 0) {
      return [];
    }

    const steelIds = steelDocs.map((doc) => doc._id);
    const pipeDocs = await this.connection
      .collection<ReferenceRow>("pipe_dimensions")
      .find({ steelSpecificationId: { $in: steelIds } })
      .toArray();

    const usedSteelIds = new Set(pipeDocs.map((doc) => String(doc.steelSpecificationId)));

    return steelDocs
      .filter((doc) => usedSteelIds.has(String(doc._id)))
      .sort((a, b) => String(a.steelSpecName ?? "").localeCompare(String(b.steelSpecName ?? "")))
      .slice(0, 25)
      .map((doc) => {
        const specName = doc.steelSpecName as string;
        const name = specName.toLowerCase();
        let matchScore = 45;
        if (name === searchTerm) {
          matchScore = 95;
        } else if (name.startsWith(searchTerm)) {
          matchScore = 85;
        } else if (name.includes(searchTerm)) {
          matchScore = 65;
        }
        return {
          type: "pipe_material" as const,
          id: doc._id as number,
          name: specName,
          matchScore,
        };
      });
  }

  private async searchFlangeMaterialsMongo(searchTerm: string): Promise<MaterialSearchResultDto[]> {
    const docs = await this.connection
      .collection<ReferenceRow>("flange_pt_ratings")
      .find({ materialGroup: { $regex: this.mongoRegex(searchTerm) } })
      .toArray();

    const uniqueGroups = [...new Set(docs.map((doc) => doc.materialGroup as string))].sort((a, b) =>
      a.localeCompare(b),
    );

    return uniqueGroups.slice(0, 25).map((group, index) => {
      const name = group.toLowerCase();
      let matchScore = 40;
      if (name === searchTerm) {
        matchScore = 90;
      } else if (name.startsWith(searchTerm)) {
        matchScore = 80;
      } else if (name.includes(searchTerm)) {
        matchScore = 60;
      }
      return {
        type: "flange_material" as const,
        id: index + 1,
        name: group,
        matchScore,
      };
    });
  }

  async assemblyValidate(dto: AssemblyValidateDto): Promise<AssemblyValidationResultDto> {
    const issues: CompatibilityIssueDto[] = [];
    let score = 100;

    const flangeComponents = dto.components.filter((c) => c.componentType === "flange");
    const pipeComponents = dto.components.filter((c) => c.componentType === "pipe");
    const boltComponents = dto.components.filter((c) => c.componentType === "bolt");

    for (const flange of flangeComponents) {
      if (flange.pressureClassId) {
        const ptCheck = await this.checkPtRating(
          flange.pressureClassId,
          dto.designPressureBar,
          dto.designTemperatureC,
        );

        if (!ptCheck.isValid) {
          issues.push({
            severity: "error",
            code: "PT_RATING_EXCEEDED",
            message: ptCheck.message,
            affectedComponents: ["flange"],
            recommendation: ptCheck.recommendation,
          });
          score -= 30;
        }
      }
    }

    const materialCategories = dto.components
      .filter((c) => c.material)
      .map((c) => this.materialCategory(c.material!));

    const uniqueCategories = [...new Set(materialCategories)];

    if (uniqueCategories.length > 1) {
      const compatibility = this.checkGalvanicCompatibility(uniqueCategories);
      if (!compatibility.isCompatible) {
        issues.push({
          severity: "warning",
          code: "GALVANIC_INCOMPATIBILITY",
          message: `Potential galvanic corrosion between ${compatibility.incompatiblePairs.join(", ")}`,
          affectedComponents: dto.components.filter((c) => c.material).map((c) => c.componentType),
          recommendation: "Consider using isolation gaskets or selecting compatible materials",
        });
        score -= 15;
      }
    }

    for (const bolt of boltComponents) {
      if (bolt.threadPitchMm && bolt.boltDiameterMm) {
        const expectedPitch = ISO_METRIC_THREAD_PITCHES[bolt.boltDiameterMm];
        if (expectedPitch && Math.abs(bolt.threadPitchMm - expectedPitch) > 0.1) {
          issues.push({
            severity: "warning",
            code: "NON_STANDARD_THREAD_PITCH",
            message: `Bolt M${bolt.boltDiameterMm} has non-standard pitch ${bolt.threadPitchMm}mm (expected ${expectedPitch}mm)`,
            affectedComponents: ["bolt"],
            recommendation: "Verify thread pitch compatibility with nuts",
          });
          score -= 5;
        }
      }
    }

    const flangeStandards = flangeComponents
      .filter((c) => c.flangeStandardId)
      .map((c) => c.flangeStandardId);

    if (flangeStandards.length > 1) {
      const uniqueStandards = [...new Set(flangeStandards)];
      if (uniqueStandards.length > 1) {
        issues.push({
          severity: "error",
          code: "MIXED_FLANGE_STANDARDS",
          message: "Assembly contains flanges from different standards",
          affectedComponents: ["flange"],
          recommendation: "Use flanges from the same standard for proper mating",
        });
        score -= 25;
      }
    }

    const nominalBores = dto.components.filter((c) => c.nominalBoreMm).map((c) => c.nominalBoreMm!);

    if (nominalBores.length > 1) {
      const uniqueBores = [...new Set(nominalBores)];
      if (uniqueBores.length > 1) {
        const isReducer = dto.components.some(
          (c) => c.componentType === "fitting" && c.material?.toLowerCase().includes("reducer"),
        );

        if (!isReducer) {
          issues.push({
            severity: "warning",
            code: "MISMATCHED_BORE_SIZES",
            message: `Assembly has mixed nominal bores: ${uniqueBores.join("mm, ")}mm`,
            affectedComponents: dto.components
              .filter((c) => c.nominalBoreMm)
              .map((c) => c.componentType),
            recommendation: "Verify bore size compatibility or include appropriate reducers",
          });
          score -= 10;
        }
      }
    }

    if (dto.designTemperatureC > 400) {
      const carbonSteelComponents = dto.components.filter(
        (c) =>
          c.material &&
          (c.material.toLowerCase().includes("a105") ||
            c.material.toLowerCase().includes("a106") ||
            c.material.toLowerCase().includes("carbon")),
      );

      if (carbonSteelComponents.length > 0) {
        issues.push({
          severity: "warning",
          code: "HIGH_TEMP_CARBON_STEEL",
          message: `Carbon steel components may have reduced strength at ${dto.designTemperatureC}°C`,
          affectedComponents: carbonSteelComponents.map((c) => c.componentType),
          recommendation:
            "Consider using alloy steel or stainless steel for temperatures above 400°C",
        });
        score -= 10;
      }
    }

    if (dto.designTemperatureC < -29) {
      const nonImpactTestedMaterials = dto.components.filter(
        (c) =>
          c.material &&
          !c.material.toLowerCase().includes("lt") &&
          !c.material.toLowerCase().includes("low temp") &&
          !c.material.toLowerCase().includes("304") &&
          !c.material.toLowerCase().includes("316"),
      );

      if (nonImpactTestedMaterials.length > 0) {
        issues.push({
          severity: "warning",
          code: "LOW_TEMP_IMPACT_TESTING",
          message: `Materials may require impact testing for service at ${dto.designTemperatureC}°C`,
          affectedComponents: nonImpactTestedMaterials.map((c) => c.componentType),
          recommendation:
            "Verify impact testing requirements per ASME B31.3 or use low-temperature rated materials",
        });
        score -= 10;
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: !issues.some((i) => i.severity === "error"),
      score,
      issues,
      maxPressureAtTempBar: await this.maxPressureAtTemp(flangeComponents, dto.designTemperatureC),
      temperatureRangeC: this.temperatureRange(dto.components),
      materialCompatibility: this.buildCompatibilityMatrix(uniqueCategories),
    };
  }

  private async checkPtRating(
    pressureClassId: number,
    designPressureBar: number,
    designTempC: number,
  ): Promise<{ isValid: boolean; message: string; recommendation?: string }> {
    const ratings = await this.ptRatingDocsMongo(pressureClassId);

    if (ratings.length === 0) {
      return {
        isValid: true,
        message: "No P-T rating data available for validation",
      };
    }

    let maxPressureAtTemp: number | null = null;

    for (let i = 0; i < ratings.length; i++) {
      const current = ratings[i];
      const temp = current.temperature_celsius;

      if (temp === designTempC) {
        maxPressureAtTemp = current.max_pressure_bar;
        break;
      }

      if (temp > designTempC && i > 0) {
        const prev = ratings[i - 1];
        const prevTemp = prev.temperature_celsius;
        const prevPressure = prev.max_pressure_bar;
        const currPressure = current.max_pressure_bar;

        const ratio = (designTempC - prevTemp) / (temp - prevTemp);
        maxPressureAtTemp = prevPressure + ratio * (currPressure - prevPressure);
        break;
      }
    }

    if (maxPressureAtTemp === null) {
      const lastRating = ratings[ratings.length - 1];
      maxPressureAtTemp = lastRating.max_pressure_bar;
    }

    if (designPressureBar > maxPressureAtTemp) {
      return {
        isValid: false,
        message: `Design pressure ${designPressureBar} bar exceeds max rating ${maxPressureAtTemp.toFixed(1)} bar at ${designTempC}°C`,
        recommendation: "Select a higher pressure class or reduce design pressure",
      };
    }

    return {
      isValid: true,
      message: `P-T rating OK: ${maxPressureAtTemp.toFixed(1)} bar available at ${designTempC}°C`,
    };
  }

  private materialCategory(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("304") || m.includes("316") || m.includes("stainless")) {
      return "Stainless Steel";
    }
    if (m.includes("duplex") || m.includes("2205") || m.includes("2507")) {
      return "Duplex";
    }
    if (m.includes("copper") || m.includes("bronze") || m.includes("brass")) {
      return "Copper";
    }
    if (m.includes("aluminum") || m.includes("aluminium")) {
      return "Aluminum";
    }
    return "Carbon Steel";
  }

  private checkGalvanicCompatibility(categories: string[]): {
    isCompatible: boolean;
    incompatiblePairs: string[];
  } {
    const incompatiblePairs: string[] = [];

    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const cat1 = categories[i];
        const cat2 = categories[j];

        const compatibility =
          GALVANIC_COMPATIBILITY[cat1]?.[cat2] ?? GALVANIC_COMPATIBILITY[cat2]?.[cat1] ?? true;

        if (!compatibility) {
          incompatiblePairs.push(`${cat1} / ${cat2}`);
        }
      }
    }

    return {
      isCompatible: incompatiblePairs.length === 0,
      incompatiblePairs,
    };
  }

  private async ptRatingDocsMongo(
    pressureClassId: number,
  ): Promise<Array<{ max_pressure_bar: number; temperature_celsius: number }>> {
    const docs = await this.connection
      .collection<ReferenceRow>("flange_pt_ratings")
      .find({ pressureClassId, materialGroup: "Carbon Steel A105 (Group 1.1)" })
      .toArray();

    return docs
      .map((doc) => ({
        max_pressure_bar: this.numericOrNull(doc.maxPressureBar) ?? 0,
        temperature_celsius: this.numericOrNull(doc.temperatureCelsius) ?? 0,
      }))
      .sort((a, b) => a.temperature_celsius - b.temperature_celsius);
  }

  private async maxPressureAtTemp(
    flangeComponents: { pressureClassId?: number }[],
    tempC: number,
  ): Promise<number | undefined> {
    if (flangeComponents.length === 0 || !flangeComponents[0].pressureClassId) {
      return undefined;
    }

    const ratings = await this.ptRatingDocsMongo(flangeComponents[0].pressureClassId);
    if (ratings.length === 0) {
      return undefined;
    }
    const nearest = ratings.reduce((best, candidate) =>
      Math.abs(candidate.temperature_celsius - tempC) < Math.abs(best.temperature_celsius - tempC)
        ? candidate
        : best,
    );
    return nearest.max_pressure_bar;
  }

  private temperatureRange(
    components: { material?: string }[],
  ): { min: number; max: number } | undefined {
    let minTemp = -29;
    let maxTemp = 400;

    for (const c of components) {
      if (!c.material) continue;

      const m = c.material.toLowerCase();

      if (m.includes("304") || m.includes("316")) {
        minTemp = Math.min(minTemp, -196);
        maxTemp = Math.max(maxTemp, 450);
      } else if (m.includes("duplex")) {
        minTemp = Math.min(minTemp, -50);
        maxTemp = Math.max(maxTemp, 300);
      } else if (m.includes("a105") || m.includes("a106") || m.includes("carbon")) {
        minTemp = Math.max(minTemp, -29);
        maxTemp = Math.min(maxTemp, 400);
      }
    }

    return { min: minTemp, max: maxTemp };
  }

  private buildCompatibilityMatrix(categories: string[]): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const cat1 of categories) {
      matrix[cat1] = {};
      for (const cat2 of categories) {
        matrix[cat1][cat2] =
          GALVANIC_COMPATIBILITY[cat1]?.[cat2] ?? GALVANIC_COMPATIBILITY[cat2]?.[cat1] ?? true;
      }
    }

    return matrix;
  }
}
