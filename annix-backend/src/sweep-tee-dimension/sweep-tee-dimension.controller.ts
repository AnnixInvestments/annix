import { Controller, Get, Query } from "@nestjs/common";
import { SweepTeeDimension } from "./entities/sweep-tee-dimension.entity";
import { SweepTeeDimensionService } from "./sweep-tee-dimension.service";

@Controller("sweep-tee-dimension")
export class SweepTeeDimensionController {
  constructor(private readonly sweepTeeDimensionService: SweepTeeDimensionService) {}

  @Get()
  async findAll(): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionService.findAll();
  }

  @Get("by-nominal-bore")
  async findByNominalBore(
    @Query("nominalBoreMm") nominalBoreMm: string,
  ): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionService.findByNominalBore(parseInt(nominalBoreMm, 10));
  }

  @Get("by-radius-type")
  async findByRadiusType(@Query("radiusType") radiusType: string): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionService.findByRadiusType(radiusType);
  }

  @Get("lookup")
  async lookup(
    @Query("nominalBoreMm") nominalBoreMm: string,
    @Query("radiusType") radiusType: string,
  ): Promise<SweepTeeDimension | null> {
    return this.sweepTeeDimensionService.findByCriteria(parseInt(nominalBoreMm, 10), radiusType);
  }

  @Get("available-nominal-bores")
  async availableNominalBores(): Promise<number[]> {
    return this.sweepTeeDimensionService.availableNominalBores();
  }

  @Get("available-radius-types")
  async availableRadiusTypes(): Promise<string[]> {
    return this.sweepTeeDimensionService.availableRadiusTypes();
  }
}
