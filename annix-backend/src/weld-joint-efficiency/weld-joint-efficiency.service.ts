import { Injectable } from '@nestjs/common';
import {
  B31_1_TABLE_102_4_3,
  B31_1_TABLE_102_4_3_NOTES,
  B31_3_TABLE_A_1B,
  B31_3_TABLE_A_1B_NOTES,
  B31_1_WELD_RULES,
  MATERIAL_CATEGORIES,
  B31_1_JointEfficiencyRow,
  B31_3_QualityFactorRow,
  WeldRuleSection,
  MaterialCategory,
} from './weld-joint-efficiency.data';

export interface JointEfficiencyLookupResult {
  found: boolean;
  factorE: number | null;
  row?: B31_1_JointEfficiencyRow;
  notes?: string[];
}

export interface QualityFactorLookupResult {
  found: boolean;
  ej: number | null;
  row?: B31_3_QualityFactorRow;
  materialCategory?: string;
  notes?: string[];
}

export interface WeldRuleLookupResult {
  found: boolean;
  section?: string;
  summary?: string;
}

@Injectable()
export class WeldJointEfficiencyService {
  /**
   * Get all B31.1 Table 102.4.3 data (Longitudinal Weld Joint Efficiency Factors)
   */
  getB31_1_Table(): {
    data: B31_1_JointEfficiencyRow[];
    notes: string[];
  } {
    return {
      data: B31_1_TABLE_102_4_3,
      notes: B31_1_TABLE_102_4_3_NOTES,
    };
  }

  /**
   * Get all B31.3 Table A-1B data (Basic Quality Factors for Longitudinal Weld Joints)
   */
  getB31_3_Table(): {
    data: Record<string, B31_3_QualityFactorRow[]>;
    notes: string[];
    materialCategories: readonly string[];
  } {
    return {
      data: B31_3_TABLE_A_1B,
      notes: B31_3_TABLE_A_1B_NOTES,
      materialCategories: MATERIAL_CATEGORIES,
    };
  }

  /**
   * Get all B31.1 weld rules
   */
  getWeldRules(): WeldRuleSection[] {
    return B31_1_WELD_RULES;
  }

  /**
   * Get all material categories
   */
  getMaterialCategories(): readonly string[] {
    return MATERIAL_CATEGORIES;
  }

  /**
   * Lookup E factor from B31.1 Table 102.4.3
   * @param typeOfJoint - The type of joint (e.g., 'Electric resistance weld')
   * @param examination - The examination type (optional, for more specific lookup)
   * @returns JointEfficiencyLookupResult
   */
  getJointEfficiencyB31_1(
    typeOfJoint: string,
    examination?: string,
  ): JointEfficiencyLookupResult {
    const normalizedJoint = typeOfJoint.toLowerCase().trim();
    const normalizedExam = examination?.toLowerCase().trim();

    for (const row of B31_1_TABLE_102_4_3) {
      if (row.isSubheader) continue;

      const rowJointNormalized = row.typeOfJoint.toLowerCase();

      // Check if the joint type matches
      if (
        rowJointNormalized.includes(normalizedJoint) ||
        normalizedJoint.includes(rowJointNormalized)
      ) {
        // If examination is provided, also check that
        if (normalizedExam) {
          const rowExamNormalized = row.examination.toLowerCase();
          if (
            rowExamNormalized.includes(normalizedExam) ||
            normalizedExam.includes(rowExamNormalized)
          ) {
            return {
              found: true,
              factorE: row.factorE,
              row,
              notes: B31_1_TABLE_102_4_3_NOTES,
            };
          }
        } else {
          // Return first match if no examination specified
          return {
            found: true,
            factorE: row.factorE,
            row,
            notes: B31_1_TABLE_102_4_3_NOTES,
          };
        }
      }
    }

    return { found: false, factorE: null };
  }

  /**
   * Lookup Ej (quality factor) from B31.3 Table A-1B
   * @param materialCategory - The material category (e.g., 'Carbon Steel')
   * @param specNo - The specification number (e.g., 'A 106')
   * @param description - The description (optional, for more specific lookup)
   * @returns QualityFactorLookupResult
   */
  getQualityFactorB31_3(
    materialCategory: string,
    specNo: string,
    description?: string,
  ): QualityFactorLookupResult {
    // Find the material category (case-insensitive)
    const categoryKey = Object.keys(B31_3_TABLE_A_1B).find(
      (key) => key.toLowerCase() === materialCategory.toLowerCase(),
    );

    if (!categoryKey) {
      return { found: false, ej: null };
    }

    const rows = B31_3_TABLE_A_1B[categoryKey];
    const normalizedSpec = specNo.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedDesc = description?.toLowerCase().trim();

    for (const row of rows) {
      const rowSpecNormalized = row.specNo.toLowerCase().replace(/\s+/g, ' ');

      if (rowSpecNormalized === normalizedSpec) {
        // If description is provided, also check that
        if (normalizedDesc) {
          const rowDescNormalized = row.description.toLowerCase();
          if (
            rowDescNormalized.includes(normalizedDesc) ||
            normalizedDesc.includes(rowDescNormalized)
          ) {
            return {
              found: true,
              ej: row.ej,
              row,
              materialCategory: categoryKey,
              notes: B31_3_TABLE_A_1B_NOTES,
            };
          }
        } else {
          // Return first match if no description specified
          return {
            found: true,
            ej: row.ej,
            row,
            materialCategory: categoryKey,
            notes: B31_3_TABLE_A_1B_NOTES,
          };
        }
      }
    }

    return { found: false, ej: null };
  }

  /**
   * Get all quality factors for a specific specification
   * @param specNo - The specification number (e.g., 'A 106', 'API 5L')
   * @returns Array of all matching rows across all material categories
   */
  getQualityFactorsBySpec(specNo: string): {
    specNo: string;
    results: Array<B31_3_QualityFactorRow & { materialCategory: string }>;
  } {
    const normalizedSpec = specNo.toLowerCase().trim().replace(/\s+/g, ' ');
    const results: Array<B31_3_QualityFactorRow & { materialCategory: string }> = [];

    for (const [category, rows] of Object.entries(B31_3_TABLE_A_1B)) {
      for (const row of rows) {
        const rowSpecNormalized = row.specNo.toLowerCase().replace(/\s+/g, ' ');
        if (rowSpecNormalized === normalizedSpec) {
          results.push({ ...row, materialCategory: category });
        }
      }
    }

    return { specNo, results };
  }

  /**
   * Get all quality factors for a material category
   * @param materialCategory - The material category (e.g., 'Carbon Steel')
   * @returns All rows for the specified material category
   */
  getQualityFactorsByMaterial(materialCategory: string): {
    materialCategory: string;
    rows: B31_3_QualityFactorRow[];
  } | null {
    const categoryKey = Object.keys(B31_3_TABLE_A_1B).find(
      (key) => key.toLowerCase() === materialCategory.toLowerCase(),
    );

    if (!categoryKey) {
      return null;
    }

    return {
      materialCategory: categoryKey,
      rows: B31_3_TABLE_A_1B[categoryKey],
    };
  }

  /**
   * Get weld rule summary for a specific section
   * @param section - The section name or keyword
   * @returns WeldRuleLookupResult
   */
  getWeldRule(section: string): WeldRuleLookupResult {
    const normalizedSection = section.toLowerCase().trim();

    const rule = B31_1_WELD_RULES.find(
      (r) =>
        r.section.toLowerCase().includes(normalizedSection) ||
        normalizedSection.includes(r.section.toLowerCase()),
    );

    if (rule) {
      return {
        found: true,
        section: rule.section,
        summary: rule.summary,
      };
    }

    return { found: false };
  }

  /**
   * Get the default joint efficiency factor for common pipe types
   * This is a helper function for quick lookups based on common specifications
   * @param specNo - The specification number (e.g., 'A 106', 'A 53')
   * @param pipeType - The pipe type: 'seamless', 'erw', 'efw', 'furnace'
   * @param radiographed - Whether 100% radiographed (for EFW pipes)
   * @returns The efficiency factor or null if not found
   */
  getDefaultJointEfficiency(
    specNo: string,
    pipeType: 'seamless' | 'erw' | 'efw' | 'furnace',
    radiographed: boolean = false,
  ): number | null {
    // Quick lookup for common cases
    switch (pipeType) {
      case 'seamless':
        return 1.0;
      case 'erw':
        return 0.85;
      case 'furnace':
        return 0.6;
      case 'efw':
        return radiographed ? 1.0 : 0.85;
      default:
        return null;
    }
  }

  /**
   * Search across all tables for a specification
   * @param searchTerm - The search term (spec number, joint type, or material)
   * @returns Combined search results
   */
  search(searchTerm: string): {
    b31_1_matches: B31_1_JointEfficiencyRow[];
    b31_3_matches: Array<B31_3_QualityFactorRow & { materialCategory: string }>;
    weldRuleMatches: WeldRuleSection[];
  } {
    const normalizedTerm = searchTerm.toLowerCase().trim();

    // Search B31.1 table
    const b31_1_matches = B31_1_TABLE_102_4_3.filter(
      (row) =>
        !row.isSubheader &&
        (row.typeOfJoint.toLowerCase().includes(normalizedTerm) ||
          row.typeOfSeam.toLowerCase().includes(normalizedTerm) ||
          row.examination.toLowerCase().includes(normalizedTerm)),
    );

    // Search B31.3 table
    const b31_3_matches: Array<B31_3_QualityFactorRow & { materialCategory: string }> = [];
    for (const [category, rows] of Object.entries(B31_3_TABLE_A_1B)) {
      for (const row of rows) {
        if (
          row.specNo.toLowerCase().includes(normalizedTerm) ||
          row.description.toLowerCase().includes(normalizedTerm) ||
          row.classOrType.toLowerCase().includes(normalizedTerm) ||
          category.toLowerCase().includes(normalizedTerm)
        ) {
          b31_3_matches.push({ ...row, materialCategory: category });
        }
      }
    }

    // Search weld rules
    const weldRuleMatches = B31_1_WELD_RULES.filter(
      (rule) =>
        rule.section.toLowerCase().includes(normalizedTerm) ||
        rule.summary.toLowerCase().includes(normalizedTerm),
    );

    return {
      b31_1_matches,
      b31_3_matches,
      weldRuleMatches,
    };
  }
}
