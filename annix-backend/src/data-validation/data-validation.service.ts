import { Injectable } from '@nestjs/common';
import { InjectRepository, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  RunValidationDto,
  ValidationResultDto,
  ValidationIssueDto,
  ValidationRuleDto,
  PtCurveVerificationDto,
  CoverageReportDto,
  CoverageSummaryDto,
  SpecificationNormalizationDto,
  ValidationSeverity,
} from './dto/data-validation.dto';

interface ValidationRule {
  rule_code: string;
  rule_name: string;
  rule_description: string;
  rule_sql: string;
  severity: string;
  category: string;
  is_active: boolean;
}

@Injectable()
export class DataValidationService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async rules(): Promise<ValidationRuleDto[]> {
    const rules = await this.dataSource.query(`
      SELECT rule_code, rule_name, rule_description, severity, category, is_active
      FROM flange_data_validation_rules
      ORDER BY category, severity, rule_code
    `);

    return rules.map((r: ValidationRule) => ({
      ruleCode: r.rule_code,
      ruleName: r.rule_name,
      ruleDescription: r.rule_description,
      severity: r.severity as ValidationSeverity,
      category: r.category,
      isActive: r.is_active,
    }));
  }

  async runValidation(dto: RunValidationDto): Promise<ValidationResultDto> {
    const runId = uuidv4();
    const issues: ValidationIssueDto[] = [];

    let rulesQuery = `
      SELECT rule_code, rule_name, rule_sql, severity, category
      FROM flange_data_validation_rules
      WHERE is_active = true
    `;

    const params: (string | string[])[] = [];

    if (dto.ruleCodes && dto.ruleCodes.length > 0) {
      params.push(dto.ruleCodes);
      rulesQuery += ` AND rule_code = ANY($${params.length})`;
    }

    if (dto.category) {
      params.push(dto.category);
      rulesQuery += ` AND category = $${params.length}`;
    }

    const rules = await this.dataSource.query(rulesQuery, params);

    for (const rule of rules) {
      const ruleResults = await this.dataSource.query(rule.rule_sql);

      for (const result of ruleResults) {
        const issue: ValidationIssueDto = {
          ruleCode: rule.rule_code,
          ruleName: rule.rule_name,
          entityType: 'flange_dimension',
          entityId: result.id,
          issueDescription: this.buildIssueDescription(rule.rule_code, result),
          expectedValue: this.expectedValue(rule.rule_code, result),
          actualValue: this.actualValue(rule.rule_code, result),
          severity: rule.severity as ValidationSeverity,
        };

        issues.push(issue);

        await this.dataSource.query(`
          INSERT INTO flange_data_validation_results
          (validation_run_id, rule_code, entity_type, entity_id, issue_description, expected_value, actual_value, severity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [runId, issue.ruleCode, issue.entityType, issue.entityId, issue.issueDescription, issue.expectedValue, issue.actualValue, issue.severity]);
      }
    }

    const errorCount = issues.filter((i) => i.severity === ValidationSeverity.ERROR).length;
    const warningCount = issues.filter((i) => i.severity === ValidationSeverity.WARNING).length;
    const infoCount = issues.filter((i) => i.severity === ValidationSeverity.INFO).length;

    return {
      runId,
      runDate: new Date(),
      totalRulesRun: rules.length,
      totalIssues: issues.length,
      errorCount,
      warningCount,
      infoCount,
      issues,
    };
  }

  async ptCurveVerification(
    standardCode?: string,
    materialGroup?: string,
  ): Promise<PtCurveVerificationDto[]> {
    let query = `
      SELECT
        standard_code, material_group, pressure_class, temperature_c,
        expected_pressure_bar, actual_pressure_bar, variance_percent,
        verification_status, source_reference
      FROM pt_curve_verification
      WHERE 1=1
    `;

    const params: string[] = [];

    if (standardCode) {
      params.push(standardCode);
      query += ` AND standard_code = $${params.length}`;
    }

    if (materialGroup) {
      params.push(materialGroup);
      query += ` AND material_group = $${params.length}`;
    }

    query += ` ORDER BY standard_code, material_group, pressure_class, temperature_c`;

    const results = await this.dataSource.query(query, params);

    return results.map((r: Record<string, unknown>) => ({
      standardCode: r.standard_code as string,
      materialGroup: r.material_group as string,
      pressureClass: r.pressure_class as string,
      temperatureC: parseFloat(r.temperature_c as string),
      expectedPressureBar: parseFloat(r.expected_pressure_bar as string),
      actualPressureBar: r.actual_pressure_bar ? parseFloat(r.actual_pressure_bar as string) : undefined,
      variancePercent: r.variance_percent ? parseFloat(r.variance_percent as string) : undefined,
      verificationStatus: r.verification_status as string,
      sourceReference: r.source_reference as string,
    }));
  }

  async coverageReport(): Promise<CoverageSummaryDto> {
    const byCategory = await this.dataSource.query(`
      SELECT
        entity_type, category, subcategory,
        total_expected, total_present, coverage_percent,
        missing_items
      FROM data_coverage_report
      WHERE report_date = CURRENT_DATE
      ORDER BY entity_type, category, subcategory
    `);

    const summary = await this.dataSource.query(`
      SELECT
        COUNT(DISTINCT fs.id) as total_standards,
        COUNT(DISTINCT fd.id) as total_flange_dimensions,
        COUNT(DISTINCT fpr.id) as total_pt_ratings,
        COUNT(DISTINCT CASE WHEN fd.verified_date IS NOT NULL THEN fd.id END) as verified_records,
        COUNT(DISTINCT CASE WHEN fd.source_standard IS NOT NULL THEN fd.id END) as documented_records
      FROM flange_standards fs
      LEFT JOIN flange_dimensions fd ON fd."standardId" = fs.id
      LEFT JOIN flange_pt_ratings fpr ON 1=1
    `);

    const overallCoverage = await this.dataSource.query(`
      SELECT ROUND(AVG(coverage_percent), 1) as avg_coverage
      FROM data_coverage_report
      WHERE report_date = CURRENT_DATE
    `);

    const categoryReports: CoverageReportDto[] = byCategory.map((r: Record<string, unknown>) => ({
      entityType: r.entity_type as string,
      category: r.category as string,
      subcategory: r.subcategory as string,
      totalExpected: parseInt(r.total_expected as string, 10),
      totalPresent: parseInt(r.total_present as string, 10),
      coveragePercent: parseFloat(r.coverage_percent as string),
      missingItems: r.missing_items as string[],
    }));

    return {
      reportDate: new Date(),
      overallCoveragePercent: parseFloat(overallCoverage[0]?.avg_coverage || '0'),
      byCategory: categoryReports,
      totalStandards: parseInt(summary[0]?.total_standards || '0', 10),
      totalFlangeDimensions: parseInt(summary[0]?.total_flange_dimensions || '0', 10),
      totalPtRatings: parseInt(summary[0]?.total_pt_ratings || '0', 10),
      verifiedRecords: parseInt(summary[0]?.verified_records || '0', 10),
      documentedRecords: parseInt(summary[0]?.documented_records || '0', 10),
    };
  }

  async specificationNormalizations(): Promise<SpecificationNormalizationDto[]> {
    const specs = await this.dataSource.query(`
      SELECT
        id, steel_spec_name as original_name, normalized_name, display_name,
        uns_number, astm_equivalent, material_category, is_deprecated
      FROM steel_specifications
      ORDER BY normalized_name, steel_spec_name
    `);

    return specs.map((s: Record<string, unknown>) => ({
      id: s.id as number,
      originalName: s.original_name as string,
      normalizedName: s.normalized_name as string,
      displayName: s.display_name as string,
      unsNumber: s.uns_number as string,
      astmEquivalent: s.astm_equivalent as string,
      materialCategory: s.material_category as string,
      isDeprecated: s.is_deprecated as boolean,
    }));
  }

  async dimensionValidationView(): Promise<Record<string, unknown>[]> {
    return this.dataSource.query(`
      SELECT * FROM v_flange_dimension_validation
      ORDER BY standard, pressure_class, nb_mm
    `);
  }

  async standardCoverageSummary(): Promise<Record<string, unknown>[]> {
    return this.dataSource.query(`
      SELECT * FROM v_standard_coverage_summary
      ORDER BY standard
    `);
  }

  async flangeDataCompleteness(): Promise<Record<string, unknown>[]> {
    return this.dataSource.query(`
      SELECT * FROM v_flange_data_completeness
      ORDER BY standard, pressure_class, flange_type
    `);
  }

  async ptRatingCoverage(): Promise<Record<string, unknown>[]> {
    return this.dataSource.query(`
      SELECT * FROM v_pt_rating_coverage
      ORDER BY pressure_class, material_group
    `);
  }

  private buildIssueDescription(ruleCode: string, result: Record<string, unknown>): string {
    const descriptions: Record<string, (r: Record<string, unknown>) => string> = {
      FD_OD_CONSISTENCY: (r) => `Flange OD (${r.flange_od}mm) is not greater than pipe OD (${r.pipe_od}mm)`,
      FD_ID_VS_OD: (r) => `Flange bore (${r.bore}mm) is >= flange OD (${r.od}mm)`,
      FD_PCD_POSITION: (r) => `PCD (${r.pcd}mm) is outside valid range (bore: ${r.bore}mm, OD: ${r.od}mm)`,
      FD_BOLT_HOLE_FIT: (r) => `Bolt holes may not fit within flange annulus (hole: ${r.hole_dia}mm, PCD: ${r.pcd}mm)`,
      FD_HOLE_SPACING: (r) => `Bolt hole spacing (${(r.hole_spacing as number)?.toFixed(1)}mm) may be too tight for hole diameter (${r.hole_dia}mm)`,
      FD_MASS_REASONABLE: (r) => `Flange mass (${r.mass_kg}kg) differs significantly from estimate (${(r.est_mass as number)?.toFixed(1)}kg)`,
      PT_MONOTONIC_DECREASE: (r) => `Pressure rating increases from ${r.max_pressure_bar} bar at ${r.temperature_celsius}°C to ${r.next_pressure} bar at ${r.next_temp}°C`,
      PT_POSITIVE_VALUES: (r) => `Non-positive pressure rating (${r.max_pressure_bar} bar) at ${r.temperature_celsius}°C`,
      FB_BOLT_SIZE_MATCH: (r) => `Bolt size (${r.size_designation}) may not fit hole diameter (${r.hole_dia}mm)`,
    };

    const descFn = descriptions[ruleCode];
    return descFn ? descFn(result) : `Validation issue for record ID ${result.id}`;
  }

  private expectedValue(ruleCode: string, result: Record<string, unknown>): string | undefined {
    const expected: Record<string, (r: Record<string, unknown>) => string | undefined> = {
      FD_OD_CONSISTENCY: (r) => `> ${r.pipe_od}mm`,
      FD_ID_VS_OD: (r) => `< ${r.od}mm`,
      FD_PCD_POSITION: (r) => `Between ${r.bore}mm and ${r.od}mm`,
      FD_MASS_REASONABLE: (r) => `~${(r.est_mass as number)?.toFixed(1)}kg`,
      PT_MONOTONIC_DECREASE: (r) => `<= ${r.max_pressure_bar} bar`,
      PT_POSITIVE_VALUES: () => `> 0 bar`,
    };

    const fn = expected[ruleCode];
    return fn ? fn(result) : undefined;
  }

  private actualValue(ruleCode: string, result: Record<string, unknown>): string | undefined {
    const actual: Record<string, (r: Record<string, unknown>) => string | undefined> = {
      FD_OD_CONSISTENCY: (r) => `${r.flange_od}mm`,
      FD_ID_VS_OD: (r) => `${r.bore}mm`,
      FD_PCD_POSITION: (r) => `${r.pcd}mm`,
      FD_MASS_REASONABLE: (r) => `${r.mass_kg}kg`,
      PT_MONOTONIC_DECREASE: (r) => `${r.next_pressure} bar`,
      PT_POSITIVE_VALUES: (r) => `${r.max_pressure_bar} bar`,
    };

    const fn = actual[ruleCode];
    return fn ? fn(result) : undefined;
  }
}
