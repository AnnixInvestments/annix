import { Controller, Get, Query } from '@nestjs/common';
import { WeldJointEfficiencyService } from './weld-joint-efficiency.service';

@Controller('weld-joint-efficiency')
export class WeldJointEfficiencyController {
  constructor(
    private readonly weldJointEfficiencyService: WeldJointEfficiencyService,
  ) {}

  /**
   * Get the complete B31.1 Table 102.4.3 (Longitudinal Weld Joint Efficiency Factors)
   * GET /weld-joint-efficiency/b31-1/table
   */
  @Get('b31-1/table')
  getB31_1_Table() {
    return this.weldJointEfficiencyService.getB31_1_Table();
  }

  /**
   * Get the complete B31.3 Table A-1B (Basic Quality Factors for Longitudinal Weld Joints)
   * GET /weld-joint-efficiency/b31-3/table
   */
  @Get('b31-3/table')
  getB31_3_Table() {
    return this.weldJointEfficiencyService.getB31_3_Table();
  }

  /**
   * Get all B31.1 weld rules
   * GET /weld-joint-efficiency/b31-1/rules
   */
  @Get('b31-1/rules')
  getWeldRules() {
    return this.weldJointEfficiencyService.getWeldRules();
  }

  /**
   * Get all material categories
   * GET /weld-joint-efficiency/material-categories
   */
  @Get('material-categories')
  getMaterialCategories() {
    return this.weldJointEfficiencyService.getMaterialCategories();
  }

  /**
   * Lookup joint efficiency factor from B31.1 Table 102.4.3
   * GET /weld-joint-efficiency/b31-1/lookup?typeOfJoint=...&examination=...
   */
  @Get('b31-1/lookup')
  lookupJointEfficiency(
    @Query('typeOfJoint') typeOfJoint: string,
    @Query('examination') examination?: string,
  ) {
    if (!typeOfJoint) {
      return { error: 'typeOfJoint query parameter is required' };
    }
    return this.weldJointEfficiencyService.getJointEfficiencyB31_1(
      typeOfJoint,
      examination,
    );
  }

  /**
   * Lookup quality factor from B31.3 Table A-1B
   * GET /weld-joint-efficiency/b31-3/lookup?materialCategory=...&specNo=...&description=...
   */
  @Get('b31-3/lookup')
  lookupQualityFactor(
    @Query('materialCategory') materialCategory: string,
    @Query('specNo') specNo: string,
    @Query('description') description?: string,
  ) {
    if (!materialCategory || !specNo) {
      return {
        error: 'materialCategory and specNo query parameters are required',
      };
    }
    return this.weldJointEfficiencyService.getQualityFactorB31_3(
      materialCategory,
      specNo,
      description,
    );
  }

  /**
   * Get all quality factors for a specific specification number
   * GET /weld-joint-efficiency/b31-3/by-spec?specNo=...
   */
  @Get('b31-3/by-spec')
  getQualityFactorsBySpec(@Query('specNo') specNo: string) {
    if (!specNo) {
      return { error: 'specNo query parameter is required' };
    }
    return this.weldJointEfficiencyService.getQualityFactorsBySpec(specNo);
  }

  /**
   * Get all quality factors for a material category
   * GET /weld-joint-efficiency/b31-3/by-material?materialCategory=...
   */
  @Get('b31-3/by-material')
  getQualityFactorsByMaterial(
    @Query('materialCategory') materialCategory: string,
  ) {
    if (!materialCategory) {
      return { error: 'materialCategory query parameter is required' };
    }
    const result =
      this.weldJointEfficiencyService.getQualityFactorsByMaterial(
        materialCategory,
      );
    if (!result) {
      return { error: 'Material category not found' };
    }
    return result;
  }

  /**
   * Get a specific weld rule summary
   * GET /weld-joint-efficiency/b31-1/rule?section=...
   */
  @Get('b31-1/rule')
  getWeldRule(@Query('section') section: string) {
    if (!section) {
      return { error: 'section query parameter is required' };
    }
    return this.weldJointEfficiencyService.getWeldRule(section);
  }

  /**
   * Get default joint efficiency for common pipe specifications
   * GET /weld-joint-efficiency/default?specNo=...&pipeType=...&radiographed=...
   */
  @Get('default')
  getDefaultJointEfficiency(
    @Query('specNo') specNo: string,
    @Query('pipeType') pipeType: 'seamless' | 'erw' | 'efw' | 'furnace',
    @Query('radiographed') radiographed?: string,
  ) {
    if (!specNo || !pipeType) {
      return { error: 'specNo and pipeType query parameters are required' };
    }

    const isRadiographed = radiographed === 'true';
    const efficiency = this.weldJointEfficiencyService.getDefaultJointEfficiency(
      specNo,
      pipeType,
      isRadiographed,
    );

    return {
      specNo,
      pipeType,
      radiographed: isRadiographed,
      efficiency,
      description: this.getPipeTypeDescription(pipeType, isRadiographed),
    };
  }

  /**
   * Search across all tables
   * GET /weld-joint-efficiency/search?q=...
   */
  @Get('search')
  search(@Query('q') searchTerm: string) {
    if (!searchTerm) {
      return { error: 'q (search term) query parameter is required' };
    }
    return this.weldJointEfficiencyService.search(searchTerm);
  }

  private getPipeTypeDescription(
    pipeType: string,
    radiographed: boolean,
  ): string {
    switch (pipeType) {
      case 'seamless':
        return 'Seamless pipe (E = 1.0)';
      case 'erw':
        return 'Electric Resistance Welded pipe (E = 0.85)';
      case 'efw':
        return radiographed
          ? 'Electric Fusion Welded pipe, 100% radiographed (E = 1.0)'
          : 'Electric Fusion Welded pipe, double butt seam (E = 0.85)';
      case 'furnace':
        return 'Furnace butt welded / continuous weld pipe (E = 0.60)';
      default:
        return 'Unknown pipe type';
    }
  }
}
