import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { FlangePtRatingService } from './flange-pt-rating.service';
import { CreateFlangePtRatingDto, BulkCreateFlangePtRatingDto } from './dto/create-flange-pt-rating.dto';

@Controller('flange-pt-ratings')
export class FlangePtRatingController {
  constructor(private readonly ptRatingService: FlangePtRatingService) {}

  @Post()
  create(@Body() dto: CreateFlangePtRatingDto) {
    return this.ptRatingService.create(dto);
  }

  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateFlangePtRatingDto) {
    return this.ptRatingService.bulkCreate(dto);
  }

  @Get()
  findAll() {
    return this.ptRatingService.findAll();
  }

  @Get('material-groups')
  getMaterialGroups() {
    return this.ptRatingService.getAvailableMaterialGroups();
  }

  @Get('by-pressure-class')
  findByPressureClass(@Query('pressureClassId') pressureClassId: string) {
    return this.ptRatingService.findByPressureClass(Number(pressureClassId));
  }

  @Get('max-pressure')
  getMaxPressure(
    @Query('pressureClassId') pressureClassId: string,
    @Query('temperatureCelsius') temperatureCelsius: string,
    @Query('materialGroup') materialGroup?: string,
  ) {
    return this.ptRatingService.getMaxPressureAtTemperature(
      Number(pressureClassId),
      Number(temperatureCelsius),
      materialGroup || 'Carbon Steel A105 (Group 1.1)',
    );
  }

  @Get('recommended-class')
  getRecommendedClass(
    @Query('standardId') standardId: string,
    @Query('workingPressureBar') workingPressureBar: string,
    @Query('temperatureCelsius') temperatureCelsius: string,
    @Query('materialGroup') materialGroup?: string,
  ) {
    return this.ptRatingService.getRecommendedPressureClass(
      Number(standardId),
      Number(workingPressureBar),
      Number(temperatureCelsius),
      materialGroup || 'Carbon Steel A105 (Group 1.1)',
    );
  }
}
