import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CompleteFlangeSpecificationDto,
  FlangeBoltingInfoDto,
  PtRatingInfoDto,
  GasketInfoDto,
  MaterialSearchQueryDto,
  MaterialSearchResponseDto,
  MaterialSearchResultDto,
  AssemblyValidateDto,
  AssemblyValidationResultDto,
  CompatibilityIssueDto,
} from './dto/unified-api.dto';

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
  'Carbon Steel': {
    'Carbon Steel': true,
    'Stainless Steel': false,
    Duplex: false,
    Copper: false,
    Aluminum: false,
  },
  'Stainless Steel': {
    'Carbon Steel': false,
    'Stainless Steel': true,
    Duplex: true,
    Copper: true,
    Aluminum: false,
  },
  Duplex: {
    'Carbon Steel': false,
    'Stainless Steel': true,
    Duplex: true,
    Copper: true,
    Aluminum: false,
  },
};

@Injectable()
export class UnifiedApiService {
  private readonly logger = new Logger(UnifiedApiService.name);

  constructor(private readonly dataSource: DataSource) {}

  async completeFlangeSpecification(
    id: number,
    materialGroup: string = 'Carbon Steel A105 (Group 1.1)',
  ): Promise<CompleteFlangeSpecificationDto> {
    const flangeQuery = `
      SELECT
        fd.id,
        fd."D" as outer_diameter_mm,
        fd.b as thickness_mm,
        fd.d4 as bore_diameter_mm,
        fd.f as raised_face_diameter_mm,
        fd.d1 as hub_diameter_mm,
        fd.pcd as pcd_mm,
        fd.num_holes,
        fd.mass_kg,
        fd."boltLengthMm" as bolt_length_mm,
        fs.code as standard_code,
        fs.name as standard_name,
        fpc.designation as pressure_class,
        fpc.id as pressure_class_id,
        ft.name as flange_type,
        nod.nominal_diameter_mm as nominal_bore_mm,
        nod.nps_designation as nps,
        b.id as bolt_id,
        b.designation as bolt_designation,
        b."threadPitchMm" as thread_pitch_mm
      FROM flange_dimensions fd
      LEFT JOIN flange_standards fs ON fd."standardId" = fs.id
      LEFT JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
      LEFT JOIN flange_types ft ON fd."flangeTypeId" = ft.id
      LEFT JOIN nominal_outside_diameter_mm nod ON fd."nominalOutsideDiameterId" = nod.id
      LEFT JOIN bolts b ON fd."boltId" = b.id
      WHERE fd.id = $1
    `;

    const flangeResults = await this.dataSource.query(flangeQuery, [id]);

    if (flangeResults.length === 0) {
      throw new NotFoundException(`Flange dimension ${id} not found`);
    }

    const flange = flangeResults[0];

    const result: CompleteFlangeSpecificationDto = {
      id: flange.id,
      standardCode: flange.standard_code,
      standardName: flange.standard_name,
      pressureClass: flange.pressure_class,
      flangeType: flange.flange_type,
      nominalBoreMm: parseFloat(flange.nominal_bore_mm),
      nps: flange.nps,
      outerDiameterMm: parseFloat(flange.outer_diameter_mm),
      thicknessMm: parseFloat(flange.thickness_mm),
      boreDiameterMm: parseFloat(flange.bore_diameter_mm),
      raisedFaceDiameterMm: flange.raised_face_diameter_mm
        ? parseFloat(flange.raised_face_diameter_mm)
        : null,
      hubDiameterMm: flange.hub_diameter_mm
        ? parseFloat(flange.hub_diameter_mm)
        : null,
      pcdMm: parseFloat(flange.pcd_mm),
      numHoles: flange.num_holes,
      holeDiameterMm: null,
      massKg: flange.mass_kg ? parseFloat(flange.mass_kg) : null,
    };

    const [bolting, ptRatings, gasket] = await Promise.all([
      this.boltingInfo(flange, materialGroup),
      this.ptRatingsForClass(flange.pressure_class_id, materialGroup),
      this.gasketInfo(parseFloat(flange.nominal_bore_mm)),
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

  private async boltingInfo(
    flange: Record<string, unknown>,
    materialGroup: string,
  ): Promise<FlangeBoltingInfoDto | null> {
    if (!flange.bolt_designation) {
      return null;
    }

    const diameterMatch = (flange.bolt_designation as string).match(/M(\d+)/i);
    const boltDiameterMm = diameterMatch ? parseInt(diameterMatch[1], 10) : 16;
    const threadPitchMm =
      (flange.thread_pitch_mm as number) ||
      ISO_METRIC_THREAD_PITCHES[boltDiameterMm] ||
      2.0;

    const boltingQuery = `
      SELECT
        fb.bolt_length_default,
        fb.bolt_length_so_sw_th,
        fb.bolt_length_lj
      FROM flange_bolting fb
      WHERE fb.standard_id = (
        SELECT fs.id FROM flange_standards fs WHERE fs.code = $1
      )
      AND fb.pressure_class = $2
      AND fb.nps = $3
      LIMIT 1
    `;

    const nps =
      flange.nps || this.nominalBoreToNps(flange.nominal_bore_mm as number);
    const boltingResults = await this.dataSource.query(boltingQuery, [
      flange.standard_code,
      flange.pressure_class,
      nps,
    ]);

    const materialQuery = `
      SELECT stud_spec, nut_spec
      FROM flange_bolting_materials
      WHERE material_group ILIKE $1
      LIMIT 1
    `;

    const materialResults = await this.dataSource.query(materialQuery, [
      `%${materialGroup.split(' ')[0]}%`,
    ]);

    const boltLengthMm =
      (flange.bolt_length_mm as number) ||
      (boltingResults[0]?.bolt_length_default as number) ||
      70;

    const massQuery = `
      SELECT mass_kg
      FROM bolt_masses
      WHERE "boltId" = $1
      ORDER BY ABS(length_mm - $2)
      LIMIT 1
    `;

    let boltMassKg: number | undefined;
    if (flange.bolt_id) {
      const massResults = await this.dataSource.query(massQuery, [
        flange.bolt_id,
        boltLengthMm,
      ]);
      if (massResults.length > 0) {
        boltMassKg = parseFloat(massResults[0].mass_kg);
      }
    }

    return {
      boltDesignation: flange.bolt_designation as string,
      boltDiameterMm,
      threadPitchMm,
      defaultLengthMm: boltingResults[0]?.bolt_length_default
        ? parseFloat(boltingResults[0].bolt_length_default)
        : null,
      lengthSoSwThMm: boltingResults[0]?.bolt_length_so_sw_th
        ? parseFloat(boltingResults[0].bolt_length_so_sw_th)
        : null,
      lengthLjMm: boltingResults[0]?.bolt_length_lj
        ? parseFloat(boltingResults[0].bolt_length_lj)
        : null,
      studSpec: materialResults[0]?.stud_spec || null,
      nutSpec: materialResults[0]?.nut_spec || null,
      boltMassKg,
      totalBoltSetMassKg:
        boltMassKg && flange.num_holes
          ? boltMassKg * (flange.num_holes as number)
          : undefined,
    };
  }

  private async ptRatingsForClass(
    pressureClassId: number,
    materialGroup: string,
  ): Promise<PtRatingInfoDto[]> {
    const query = `
      SELECT
        temperature_celsius as temperature_c,
        max_pressure_bar,
        max_pressure_psi,
        material_group
      FROM flange_pt_ratings
      WHERE pressure_class_id = $1
      AND material_group = $2
      ORDER BY temperature_celsius
    `;

    const results = await this.dataSource.query(query, [
      pressureClassId,
      materialGroup,
    ]);

    return results.map((r: Record<string, unknown>) => ({
      temperatureC: parseFloat(r.temperature_c as string),
      maxPressureBar: parseFloat(r.max_pressure_bar as string),
      maxPressurePsi: r.max_pressure_psi
        ? parseFloat(r.max_pressure_psi as string)
        : undefined,
      materialGroup: r.material_group as string,
    }));
  }

  private async gasketInfo(
    nominalBoreMm: number,
  ): Promise<GasketInfoDto | null> {
    const query = `
      SELECT gasket_type, weight_kg, inner_diameter_mm, outer_diameter_mm
      FROM gasket_weights
      WHERE nominal_bore_mm = $1
      ORDER BY gasket_type
      LIMIT 1
    `;

    const results = await this.dataSource.query(query, [nominalBoreMm]);

    if (results.length === 0) {
      return null;
    }

    const gasket = results[0];
    return {
      gasketType: gasket.gasket_type,
      weightKg: parseFloat(gasket.weight_kg),
      innerDiameterMm: gasket.inner_diameter_mm
        ? parseFloat(gasket.inner_diameter_mm)
        : null,
      outerDiameterMm: gasket.outer_diameter_mm
        ? parseFloat(gasket.outer_diameter_mm)
        : null,
    };
  }

  private nominalBoreToNps(nominalBoreMm: number): string {
    const nbToNpsMap: Record<number, string> = {
      15: '1/2',
      20: '3/4',
      25: '1',
      32: '1-1/4',
      40: '1-1/2',
      50: '2',
      65: '2-1/2',
      80: '3',
      100: '4',
      125: '5',
      150: '6',
      200: '8',
      250: '10',
      300: '12',
      350: '14',
      400: '16',
      450: '18',
      500: '20',
      600: '24',
    };
    return nbToNpsMap[nominalBoreMm] || String(nominalBoreMm);
  }

  async materialSearch(
    query: MaterialSearchQueryDto,
  ): Promise<MaterialSearchResponseDto> {
    const searchTerm = query.query.toLowerCase();
    const results: MaterialSearchResultDto[] = [];

    if (!query.type || query.type === 'all' || query.type === 'steel') {
      const steelResults = await this.searchSteelSpecifications(
        searchTerm,
        query.minTempC,
        query.maxTempC,
      );
      results.push(...steelResults);
    }

    if (!query.type || query.type === 'all' || query.type === 'pipe') {
      const pipeResults = await this.searchPipeMaterials(
        searchTerm,
        query.minTempC,
        query.maxTempC,
      );
      results.push(...pipeResults);
    }

    if (!query.type || query.type === 'all' || query.type === 'flange') {
      const flangeResults = await this.searchFlangeMaterials(searchTerm);
      results.push(...flangeResults);
    }

    results.sort((a, b) => b.matchScore - a.matchScore);

    return {
      totalResults: results.length,
      query: query.query,
      results,
    };
  }

  private async searchSteelSpecifications(
    searchTerm: string,
    minTempC?: number,
    maxTempC?: number,
  ): Promise<MaterialSearchResultDto[]> {
    let whereClause = `
      WHERE (
        LOWER(steel_spec_name) LIKE $1
        OR LOWER(COALESCE(normalized_name, '')) LIKE $1
        OR LOWER(COALESCE(uns_number, '')) LIKE $1
        OR LOWER(COALESCE(astm_equivalent, '')) LIKE $1
      )
    `;

    const params: (string | number)[] = [`%${searchTerm}%`];

    if (minTempC !== undefined) {
      params.push(minTempC);
      whereClause += ` AND COALESCE(min_temp_c, -200) <= $${params.length}`;
    }

    if (maxTempC !== undefined) {
      params.push(maxTempC);
      whereClause += ` AND COALESCE(max_temp_c, 500) >= $${params.length}`;
    }

    const query = `
      SELECT
        id, steel_spec_name, normalized_name, uns_number, astm_equivalent,
        material_category, density_kg_m3, min_temp_c, max_temp_c,
        yield_strength_mpa, tensile_strength_mpa, is_deprecated
      FROM steel_specifications
      ${whereClause}
      ORDER BY
        CASE WHEN LOWER(steel_spec_name) = $1 THEN 0 ELSE 1 END,
        steel_spec_name
      LIMIT 50
    `;

    const results = await this.dataSource.query(query, params);

    return results.map((r: Record<string, unknown>) => {
      const name = (r.steel_spec_name as string).toLowerCase();
      const normalized = ((r.normalized_name as string) || '').toLowerCase();
      const uns = ((r.uns_number as string) || '').toLowerCase();

      let matchScore = 50;
      if (name === searchTerm) matchScore = 100;
      else if (name.startsWith(searchTerm)) matchScore = 90;
      else if (normalized === searchTerm) matchScore = 95;
      else if (uns === searchTerm) matchScore = 85;
      else if (name.includes(searchTerm)) matchScore = 70;

      return {
        type: 'steel_specification' as const,
        id: r.id as number,
        name: r.steel_spec_name as string,
        normalizedName: r.normalized_name as string,
        unsNumber: r.uns_number as string,
        astmEquivalent: r.astm_equivalent as string,
        category: r.material_category as string,
        densityKgM3: r.density_kg_m3
          ? parseFloat(r.density_kg_m3 as string)
          : undefined,
        minTempC: r.min_temp_c ? parseFloat(r.min_temp_c as string) : undefined,
        maxTempC: r.max_temp_c ? parseFloat(r.max_temp_c as string) : undefined,
        yieldStrengthMPa: r.yield_strength_mpa
          ? parseFloat(r.yield_strength_mpa as string)
          : undefined,
        tensileStrengthMPa: r.tensile_strength_mpa
          ? parseFloat(r.tensile_strength_mpa as string)
          : undefined,
        isDeprecated: r.is_deprecated as boolean,
        matchScore,
      };
    });
  }

  private async searchPipeMaterials(
    searchTerm: string,
    minTempC?: number,
    maxTempC?: number,
  ): Promise<MaterialSearchResultDto[]> {
    const query = `
      SELECT DISTINCT
        ss.id, ss.steel_spec_name, ss.normalized_name, ss.uns_number,
        ss.astm_equivalent, ss.material_category, ss.density_kg_m3,
        ss.min_temp_c, ss.max_temp_c
      FROM steel_specifications ss
      INNER JOIN pipe_dimensions pd ON pd."steelSpecificationId" = ss.id
      WHERE (
        LOWER(ss.steel_spec_name) LIKE $1
        OR LOWER(COALESCE(ss.normalized_name, '')) LIKE $1
      )
      ORDER BY ss.steel_spec_name
      LIMIT 25
    `;

    const results = await this.dataSource.query(query, [`%${searchTerm}%`]);

    return results.map((r: Record<string, unknown>) => {
      const name = (r.steel_spec_name as string).toLowerCase();
      let matchScore = 45;
      if (name === searchTerm) matchScore = 95;
      else if (name.startsWith(searchTerm)) matchScore = 85;
      else if (name.includes(searchTerm)) matchScore = 65;

      return {
        type: 'pipe_material' as const,
        id: r.id as number,
        name: r.steel_spec_name as string,
        normalizedName: r.normalized_name as string,
        unsNumber: r.uns_number as string,
        astmEquivalent: r.astm_equivalent as string,
        category: r.material_category as string,
        densityKgM3: r.density_kg_m3
          ? parseFloat(r.density_kg_m3 as string)
          : undefined,
        minTempC: r.min_temp_c ? parseFloat(r.min_temp_c as string) : undefined,
        maxTempC: r.max_temp_c ? parseFloat(r.max_temp_c as string) : undefined,
        matchScore,
      };
    });
  }

  private async searchFlangeMaterials(
    searchTerm: string,
  ): Promise<MaterialSearchResultDto[]> {
    const query = `
      SELECT DISTINCT material_group as name
      FROM flange_pt_ratings
      WHERE LOWER(material_group) LIKE $1
      ORDER BY material_group
      LIMIT 25
    `;

    const results = await this.dataSource.query(query, [`%${searchTerm}%`]);

    return results.map((r: Record<string, unknown>, index: number) => {
      const name = (r.name as string).toLowerCase();
      let matchScore = 40;
      if (name === searchTerm) matchScore = 90;
      else if (name.startsWith(searchTerm)) matchScore = 80;
      else if (name.includes(searchTerm)) matchScore = 60;

      return {
        type: 'flange_material' as const,
        id: index + 1,
        name: r.name as string,
        matchScore,
      };
    });
  }

  async assemblyValidate(
    dto: AssemblyValidateDto,
  ): Promise<AssemblyValidationResultDto> {
    const issues: CompatibilityIssueDto[] = [];
    let score = 100;

    const flangeComponents = dto.components.filter(
      (c) => c.componentType === 'flange',
    );
    const pipeComponents = dto.components.filter(
      (c) => c.componentType === 'pipe',
    );
    const boltComponents = dto.components.filter(
      (c) => c.componentType === 'bolt',
    );

    for (const flange of flangeComponents) {
      if (flange.pressureClassId) {
        const ptCheck = await this.checkPtRating(
          flange.pressureClassId,
          dto.designPressureBar,
          dto.designTemperatureC,
        );

        if (!ptCheck.isValid) {
          issues.push({
            severity: 'error',
            code: 'PT_RATING_EXCEEDED',
            message: ptCheck.message,
            affectedComponents: ['flange'],
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
          severity: 'warning',
          code: 'GALVANIC_INCOMPATIBILITY',
          message: `Potential galvanic corrosion between ${compatibility.incompatiblePairs.join(', ')}`,
          affectedComponents: dto.components
            .filter((c) => c.material)
            .map((c) => c.componentType),
          recommendation:
            'Consider using isolation gaskets or selecting compatible materials',
        });
        score -= 15;
      }
    }

    for (const bolt of boltComponents) {
      if (bolt.threadPitchMm && bolt.boltDiameterMm) {
        const expectedPitch = ISO_METRIC_THREAD_PITCHES[bolt.boltDiameterMm];
        if (
          expectedPitch &&
          Math.abs(bolt.threadPitchMm - expectedPitch) > 0.1
        ) {
          issues.push({
            severity: 'warning',
            code: 'NON_STANDARD_THREAD_PITCH',
            message: `Bolt M${bolt.boltDiameterMm} has non-standard pitch ${bolt.threadPitchMm}mm (expected ${expectedPitch}mm)`,
            affectedComponents: ['bolt'],
            recommendation: 'Verify thread pitch compatibility with nuts',
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
          severity: 'error',
          code: 'MIXED_FLANGE_STANDARDS',
          message: 'Assembly contains flanges from different standards',
          affectedComponents: ['flange'],
          recommendation:
            'Use flanges from the same standard for proper mating',
        });
        score -= 25;
      }
    }

    const nominalBores = dto.components
      .filter((c) => c.nominalBoreMm)
      .map((c) => c.nominalBoreMm!);

    if (nominalBores.length > 1) {
      const uniqueBores = [...new Set(nominalBores)];
      if (uniqueBores.length > 1) {
        const isReducer = dto.components.some(
          (c) =>
            c.componentType === 'fitting' &&
            c.material?.toLowerCase().includes('reducer'),
        );

        if (!isReducer) {
          issues.push({
            severity: 'warning',
            code: 'MISMATCHED_BORE_SIZES',
            message: `Assembly has mixed nominal bores: ${uniqueBores.join('mm, ')}mm`,
            affectedComponents: dto.components
              .filter((c) => c.nominalBoreMm)
              .map((c) => c.componentType),
            recommendation:
              'Verify bore size compatibility or include appropriate reducers',
          });
          score -= 10;
        }
      }
    }

    if (dto.designTemperatureC > 400) {
      const carbonSteelComponents = dto.components.filter(
        (c) =>
          c.material &&
          (c.material.toLowerCase().includes('a105') ||
            c.material.toLowerCase().includes('a106') ||
            c.material.toLowerCase().includes('carbon')),
      );

      if (carbonSteelComponents.length > 0) {
        issues.push({
          severity: 'warning',
          code: 'HIGH_TEMP_CARBON_STEEL',
          message: `Carbon steel components may have reduced strength at ${dto.designTemperatureC}°C`,
          affectedComponents: carbonSteelComponents.map((c) => c.componentType),
          recommendation:
            'Consider using alloy steel or stainless steel for temperatures above 400°C',
        });
        score -= 10;
      }
    }

    if (dto.designTemperatureC < -29) {
      const nonImpactTestedMaterials = dto.components.filter(
        (c) =>
          c.material &&
          !c.material.toLowerCase().includes('lt') &&
          !c.material.toLowerCase().includes('low temp') &&
          !c.material.toLowerCase().includes('304') &&
          !c.material.toLowerCase().includes('316'),
      );

      if (nonImpactTestedMaterials.length > 0) {
        issues.push({
          severity: 'warning',
          code: 'LOW_TEMP_IMPACT_TESTING',
          message: `Materials may require impact testing for service at ${dto.designTemperatureC}°C`,
          affectedComponents: nonImpactTestedMaterials.map(
            (c) => c.componentType,
          ),
          recommendation:
            'Verify impact testing requirements per ASME B31.3 or use low-temperature rated materials',
        });
        score -= 10;
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: !issues.some((i) => i.severity === 'error'),
      score,
      issues,
      maxPressureAtTempBar: await this.maxPressureAtTemp(
        flangeComponents,
        dto.designTemperatureC,
      ),
      temperatureRangeC: this.temperatureRange(dto.components),
      materialCompatibility: this.buildCompatibilityMatrix(uniqueCategories),
    };
  }

  private async checkPtRating(
    pressureClassId: number,
    designPressureBar: number,
    designTempC: number,
  ): Promise<{ isValid: boolean; message: string; recommendation?: string }> {
    const query = `
      SELECT max_pressure_bar, temperature_celsius
      FROM flange_pt_ratings
      WHERE pressure_class_id = $1
      AND material_group = 'Carbon Steel A105 (Group 1.1)'
      ORDER BY temperature_celsius
    `;

    const ratings = await this.dataSource.query(query, [pressureClassId]);

    if (ratings.length === 0) {
      return {
        isValid: true,
        message: 'No P-T rating data available for validation',
      };
    }

    let maxPressureAtTemp: number | null = null;

    for (let i = 0; i < ratings.length; i++) {
      const current = ratings[i];
      const temp = parseFloat(current.temperature_celsius);

      if (temp === designTempC) {
        maxPressureAtTemp = parseFloat(current.max_pressure_bar);
        break;
      }

      if (temp > designTempC && i > 0) {
        const prev = ratings[i - 1];
        const prevTemp = parseFloat(prev.temperature_celsius);
        const prevPressure = parseFloat(prev.max_pressure_bar);
        const currPressure = parseFloat(current.max_pressure_bar);

        const ratio = (designTempC - prevTemp) / (temp - prevTemp);
        maxPressureAtTemp =
          prevPressure + ratio * (currPressure - prevPressure);
        break;
      }
    }

    if (maxPressureAtTemp === null) {
      const lastRating = ratings[ratings.length - 1];
      maxPressureAtTemp = parseFloat(lastRating.max_pressure_bar);
    }

    if (designPressureBar > maxPressureAtTemp) {
      return {
        isValid: false,
        message: `Design pressure ${designPressureBar} bar exceeds max rating ${maxPressureAtTemp.toFixed(1)} bar at ${designTempC}°C`,
        recommendation:
          'Select a higher pressure class or reduce design pressure',
      };
    }

    return {
      isValid: true,
      message: `P-T rating OK: ${maxPressureAtTemp.toFixed(1)} bar available at ${designTempC}°C`,
    };
  }

  private materialCategory(material: string): string {
    const m = material.toLowerCase();
    if (m.includes('304') || m.includes('316') || m.includes('stainless')) {
      return 'Stainless Steel';
    }
    if (m.includes('duplex') || m.includes('2205') || m.includes('2507')) {
      return 'Duplex';
    }
    if (m.includes('copper') || m.includes('bronze') || m.includes('brass')) {
      return 'Copper';
    }
    if (m.includes('aluminum') || m.includes('aluminium')) {
      return 'Aluminum';
    }
    return 'Carbon Steel';
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
          GALVANIC_COMPATIBILITY[cat1]?.[cat2] ??
          GALVANIC_COMPATIBILITY[cat2]?.[cat1] ??
          true;

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

  private async maxPressureAtTemp(
    flangeComponents: { pressureClassId?: number }[],
    tempC: number,
  ): Promise<number | undefined> {
    if (flangeComponents.length === 0 || !flangeComponents[0].pressureClassId) {
      return undefined;
    }

    const query = `
      SELECT max_pressure_bar, temperature_celsius
      FROM flange_pt_ratings
      WHERE pressure_class_id = $1
      AND material_group = 'Carbon Steel A105 (Group 1.1)'
      ORDER BY ABS(temperature_celsius - $2)
      LIMIT 1
    `;

    const result = await this.dataSource.query(query, [
      flangeComponents[0].pressureClassId,
      tempC,
    ]);

    if (result.length > 0) {
      return parseFloat(result[0].max_pressure_bar);
    }

    return undefined;
  }

  private temperatureRange(
    components: { material?: string }[],
  ): { min: number; max: number } | undefined {
    let minTemp = -29;
    let maxTemp = 400;

    for (const c of components) {
      if (!c.material) continue;

      const m = c.material.toLowerCase();

      if (m.includes('304') || m.includes('316')) {
        minTemp = Math.min(minTemp, -196);
        maxTemp = Math.max(maxTemp, 450);
      } else if (m.includes('duplex')) {
        minTemp = Math.min(minTemp, -50);
        maxTemp = Math.max(maxTemp, 300);
      } else if (
        m.includes('a105') ||
        m.includes('a106') ||
        m.includes('carbon')
      ) {
        minTemp = Math.max(minTemp, -29);
        maxTemp = Math.min(maxTemp, 400);
      }
    }

    return { min: minTemp, max: maxTemp };
  }

  private buildCompatibilityMatrix(
    categories: string[],
  ): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const cat1 of categories) {
      matrix[cat1] = {};
      for (const cat2 of categories) {
        matrix[cat1][cat2] =
          GALVANIC_COMPATIBILITY[cat1]?.[cat2] ??
          GALVANIC_COMPATIBILITY[cat2]?.[cat1] ??
          true;
      }
    }

    return matrix;
  }
}
