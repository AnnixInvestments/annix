import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { RubberLiningService } from './rubber-lining.service';
import {
  RubberTypeDto,
  RubberSpecificationDto,
  RubberApplicationRatingDto,
  RubberThicknessRecommendationDto,
  RubberAdhesionRequirementDto,
  RubberRecommendationRequestDto,
  RubberRecommendationDto,
  LineCalloutDto,
} from './dto/rubber-lining.dto';

@Controller('rubber-lining')
export class RubberLiningController {
  constructor(private readonly rubberLiningService: RubberLiningService) {}

  @Get('types')
  async rubberTypes(): Promise<RubberTypeDto[]> {
    return this.rubberLiningService.allRubberTypes();
  }

  @Get('types/:id')
  async rubberTypeById(@Param('id') id: string): Promise<RubberTypeDto | null> {
    return this.rubberLiningService.rubberTypeById(Number(id));
  }

  @Get('types/number/:typeNumber')
  async rubberTypeByNumber(
    @Param('typeNumber') typeNumber: string,
  ): Promise<RubberTypeDto | null> {
    return this.rubberLiningService.rubberTypeByNumber(Number(typeNumber));
  }

  @Get('specifications')
  async specifications(): Promise<RubberSpecificationDto[]> {
    return this.rubberLiningService.allSpecifications();
  }

  @Get('specifications/type/:typeNumber')
  async specificationsByType(
    @Param('typeNumber') typeNumber: string,
  ): Promise<RubberSpecificationDto[]> {
    return this.rubberLiningService.specificationsByType(Number(typeNumber));
  }

  @Get('specifications/callout/:typeNumber/:grade/:hardnessClass')
  async specificationByCallout(
    @Param('typeNumber') typeNumber: string,
    @Param('grade') grade: string,
    @Param('hardnessClass') hardnessClass: string,
  ): Promise<RubberSpecificationDto | null> {
    return this.rubberLiningService.specificationByLineCallout(
      Number(typeNumber),
      grade,
      Number(hardnessClass),
    );
  }

  @Get('application-ratings')
  async applicationRatings(
    @Query('typeNumber') typeNumber?: string,
    @Query('chemicalCategory') chemicalCategory?: string,
  ): Promise<RubberApplicationRatingDto[]> {
    return this.rubberLiningService.applicationRatings(
      typeNumber ? Number(typeNumber) : undefined,
      chemicalCategory,
    );
  }

  @Get('thickness-recommendations')
  async thicknessRecommendations(): Promise<RubberThicknessRecommendationDto[]> {
    return this.rubberLiningService.thicknessRecommendations();
  }

  @Get('adhesion-requirements')
  async adhesionRequirements(
    @Query('typeNumber') typeNumber?: string,
  ): Promise<RubberAdhesionRequirementDto[]> {
    return this.rubberLiningService.adhesionRequirements(
      typeNumber ? Number(typeNumber) : undefined,
    );
  }

  @Post('recommend')
  async recommend(
    @Body() request: RubberRecommendationRequestDto,
  ): Promise<RubberRecommendationDto> {
    return this.rubberLiningService.recommendRubberLining(request);
  }

  @Get('line-callout')
  async lineCallout(
    @Query('type') type: string,
    @Query('grade') grade: string,
    @Query('hardness') hardness: string,
    @Query('properties') properties?: string,
  ): Promise<LineCalloutDto> {
    const specialProps = properties
      ? properties.split(',').map((p) => Number(p.trim()))
      : [];
    return this.rubberLiningService.generateLineCallout(
      Number(type),
      grade,
      Number(hardness),
      specialProps,
    );
  }

  @Get('chemical-categories')
  async chemicalCategories(): Promise<{ value: string; label: string }[]> {
    return [
      { value: 'acids_inorganic', label: 'Inorganic Acids (H2SO4, HCl, HNO3)' },
      { value: 'acids_organic', label: 'Organic Acids (Acetic, Citric)' },
      { value: 'alkalis', label: 'Alkalis (NaOH, KOH, Ammonia)' },
      { value: 'alcohols', label: 'Alcohols (Methanol, Ethanol)' },
      { value: 'hydrocarbons', label: 'Hydrocarbons (Benzene, Toluene)' },
      { value: 'oils_mineral', label: 'Mineral Oils (Petroleum, Lubricants)' },
      { value: 'oils_vegetable', label: 'Vegetable Oils' },
      { value: 'chlorine_compounds', label: 'Chlorine Compounds (Cl2, NaOCl)' },
      { value: 'oxidizing_agents', label: 'Oxidizing Agents (H2O2, KMnO4)' },
      { value: 'solvents', label: 'Solvents (Acetone, MEK, Xylene)' },
      { value: 'water', label: 'Water (Fresh, Salt, Treated)' },
      { value: 'slurry_abrasive', label: 'Abrasive Slurries' },
    ];
  }

  @Get('hardness-classes')
  async hardnessClasses(): Promise<{ value: number; label: string }[]> {
    return [
      { value: 40, label: '40 IRHD - Soft (High flexibility, impact absorption)' },
      { value: 50, label: '50 IRHD - Medium-Soft (General purpose)' },
      { value: 60, label: '60 IRHD - Medium-Hard (Abrasion resistant)' },
      { value: 70, label: '70 IRHD - Hard (High abrasion, lower flexibility)' },
    ];
  }

  @Get('grades')
  async grades(): Promise<{ value: string; label: string; tensileMin: number }[]> {
    return [
      { value: 'A', label: 'Grade A - High Strength (≥18 MPa)', tensileMin: 18 },
      { value: 'B', label: 'Grade B - Standard Strength (≥14 MPa)', tensileMin: 14 },
      { value: 'C', label: 'Grade C - Economy (≥7 MPa)', tensileMin: 7 },
      { value: 'D', label: 'Grade D - Ebonite (Hard rubber)', tensileMin: 0 },
    ];
  }

  @Get('special-properties')
  async specialProperties(): Promise<{ value: number; label: string; code: string }[]> {
    return [
      { value: 1, label: 'Heat Resistance', code: 'I' },
      { value: 2, label: 'Ozone Resistance', code: 'II' },
      { value: 3, label: 'Chemical Resistance', code: 'III' },
      { value: 4, label: 'Abrasion Resistance', code: 'IV' },
      { value: 5, label: 'Contaminant Release Resistance', code: 'V' },
      { value: 6, label: 'Water Resistance', code: 'VI' },
      { value: 7, label: 'Oil Resistance', code: 'VII' },
    ];
  }

  @Get('vulcanization-methods')
  async vulcanizationMethods(): Promise<{ value: string; label: string; description: string }[]> {
    return [
      {
        value: 'autoclave',
        label: 'Autoclave Vulcanization',
        description: 'Carried out under pressure in an autoclave. Preferred method when pipe/vessel size permits.',
      },
      {
        value: 'open',
        label: 'Open Vulcanization',
        description: 'Covering with canvas and injecting steam or hot gas. Hardness tolerance +5/-10 IRHD.',
      },
      {
        value: 'hot_water',
        label: 'Hot-Water Vulcanization',
        description: 'Filling with water heated to required temperature.',
      },
      {
        value: 'chemical',
        label: 'Chemical Vulcanization',
        description: 'Self-vulcanizing at room temperature. Wider hardness tolerance ±10 IRHD.',
      },
    ];
  }

  @Get('application-environments')
  async applicationEnvironments(): Promise<{ value: string; label: string }[]> {
    return [
      { value: 'mining_slurry', label: 'Mining Slurry Pipelines' },
      { value: 'chemical_processing', label: 'Chemical Processing' },
      { value: 'water_treatment', label: 'Water Treatment' },
      { value: 'oil_and_gas', label: 'Oil and Gas' },
      { value: 'food_processing', label: 'Food Processing' },
      { value: 'general_industrial', label: 'General Industrial' },
    ];
  }
}
