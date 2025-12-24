import { Controller, Get, Query } from '@nestjs/common';
import { CoatingSpecificationService } from './coating-specification.service';

@Controller('coating-specifications')
export class CoatingSpecificationController {
  constructor(private readonly coatingService: CoatingSpecificationService) {}

  @Get('standards')
  findAllStandards() {
    return this.coatingService.findAllStandards();
  }

  @Get('standards/by-code')
  findStandardByCode(@Query('code') code: string) {
    return this.coatingService.findStandardByCode(code);
  }

  @Get('environments')
  findAllEnvironments() {
    return this.coatingService.findAllEnvironments();
  }

  @Get('environments/by-standard')
  findEnvironmentsByStandard(@Query('standardCode') standardCode: string) {
    return this.coatingService.findEnvironmentsByStandard(standardCode);
  }

  @Get('environments/by-category')
  findEnvironmentByCategory(
    @Query('standardCode') standardCode: string,
    @Query('category') category: string,
  ) {
    return this.coatingService.findEnvironmentByCategory(standardCode, category);
  }

  @Get('specifications/by-environment')
  findSpecificationsByEnvironment(@Query('environmentId') environmentId: string) {
    return this.coatingService.findSpecificationsByEnvironment(Number(environmentId));
  }

  @Get('recommended')
  getRecommendedCoatings(
    @Query('standardCode') standardCode: string,
    @Query('category') category: string,
    @Query('coatingType') coatingType: 'external' | 'internal',
    @Query('lifespan') lifespan?: string,
  ) {
    return this.coatingService.getRecommendedCoatings(standardCode, category, coatingType, lifespan);
  }

  @Get('complete')
  getCompleteCoatingInfo(
    @Query('standardCode') standardCode: string,
    @Query('category') category: string,
  ) {
    return this.coatingService.getCompleteCoatingInfo(standardCode, category);
  }

  @Get('lifespan-options')
  getLifespanOptions() {
    return this.coatingService.getLifespanOptions();
  }

  @Get('corrosivity-categories')
  getCorrosivityCategories() {
    return this.coatingService.getCorrosivityCategories();
  }
}
