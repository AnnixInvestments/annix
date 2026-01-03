import { Controller, Get, Query } from '@nestjs/common';
import { WeldThicknessService } from './weld-thickness.service';

@Controller('weld-thickness')
export class WeldThicknessController {
  constructor(private readonly weldThicknessService: WeldThicknessService) {}

  /**
   * Get weld thickness for a specific DN and schedule
   * GET /weld-thickness/lookup?dn=100&schedule=STD&temperature=20
   */
  @Get('lookup')
  getWeldThickness(
    @Query('dn') dn: string,
    @Query('schedule') schedule: string,
    @Query('temperature') temperature?: string,
  ) {
    if (!dn) {
      return { error: 'dn query parameter is required' };
    }

    const dnNum = parseInt(dn, 10);
    const tempC = temperature ? parseFloat(temperature) : 20;

    return this.weldThicknessService.getWeldThickness(
      dnNum,
      schedule || 'STD',
      tempC,
    );
  }

  /**
   * Get recommended weld thickness based on design pressure
   * GET /weld-thickness/recommend?dn=100&pressure=150&temperature=200
   */
  @Get('recommend')
  getRecommendedWeldThickness(
    @Query('dn') dn: string,
    @Query('pressure') pressure: string,
    @Query('temperature') temperature?: string,
  ) {
    if (!dn || !pressure) {
      return { error: 'dn and pressure query parameters are required' };
    }

    const dnNum = parseInt(dn, 10);
    const pressureBar = parseFloat(pressure);
    const tempC = temperature ? parseFloat(temperature) : 20;

    const result = this.weldThicknessService.getRecommendedWeldThickness(
      dnNum,
      pressureBar,
      tempC,
    );

    if (!result) {
      return {
        found: false,
        error: `No fitting data available for DN ${dnNum}`,
      };
    }

    return result;
  }

  /**
   * Get all weld thicknesses available for a DN
   * GET /weld-thickness/all-for-dn?dn=100&temperature=20
   */
  @Get('all-for-dn')
  getAllWeldThicknessesForDn(
    @Query('dn') dn: string,
    @Query('temperature') temperature?: string,
  ) {
    if (!dn) {
      return { error: 'dn query parameter is required' };
    }

    const dnNum = parseInt(dn, 10);
    const tempC = temperature ? parseFloat(temperature) : 20;

    return this.weldThicknessService.getAllWeldThicknessesForDn(dnNum, tempC);
  }

  /**
   * Get pipe wall thickness (not weld thickness)
   * GET /weld-thickness/pipe-wall?dn=100&schedule=STD&temperature=20
   */
  @Get('pipe-wall')
  getPipeWallThickness(
    @Query('dn') dn: string,
    @Query('schedule') schedule: string,
    @Query('temperature') temperature?: string,
  ) {
    if (!dn || !schedule) {
      return { error: 'dn and schedule query parameters are required' };
    }

    const dnNum = parseInt(dn, 10);
    const tempC = temperature ? parseFloat(temperature) : 20;

    return this.weldThicknessService.getPipeWallThickness(
      dnNum,
      schedule,
      tempC,
    );
  }

  /**
   * Get all fittings data
   * GET /weld-thickness/fittings
   */
  @Get('fittings')
  getAllFittingsData() {
    return this.weldThicknessService.getAllFittingsData();
  }

  /**
   * Get all carbon steel pipes data
   * GET /weld-thickness/carbon-steel-pipes
   */
  @Get('carbon-steel-pipes')
  getAllCarbonSteelPipes() {
    return this.weldThicknessService.getAllCarbonSteelPipes();
  }

  /**
   * Get all stainless steel pipes data
   * GET /weld-thickness/stainless-steel-pipes
   */
  @Get('stainless-steel-pipes')
  getAllStainlessSteelPipes() {
    return this.weldThicknessService.getAllStainlessSteelPipes();
  }

  /**
   * Get available DNs for fittings
   * GET /weld-thickness/available-dns
   */
  @Get('available-dns')
  getAvailableFittingDns() {
    return this.weldThicknessService.getAvailableFittingDns();
  }

  /**
   * Get temperature breakpoints
   * GET /weld-thickness/temperature-breakpoints
   */
  @Get('temperature-breakpoints')
  getTemperatureBreakpoints() {
    return this.weldThicknessService.getTemperatureBreakpoints();
  }
}
