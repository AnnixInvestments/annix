import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { FlangeBoltingService } from './flange-bolting.service';
import { CreateFlangeBoltingDto, CreateFlangeBoltingMaterialDto, BulkCreateFlangeBoltingDto } from './dto/create-flange-bolting.dto';

@Controller('flange-bolting')
export class FlangeBoltingController {
  constructor(private readonly boltingService: FlangeBoltingService) {}

  @Post('materials')
  createMaterial(@Body() dto: CreateFlangeBoltingMaterialDto) {
    return this.boltingService.createMaterial(dto);
  }

  @Post()
  createBolting(@Body() dto: CreateFlangeBoltingDto) {
    return this.boltingService.createBolting(dto);
  }

  @Post('bulk')
  bulkCreateBolting(@Body() dto: BulkCreateFlangeBoltingDto) {
    return this.boltingService.bulkCreateBolting(dto);
  }

  @Get('materials')
  findAllMaterials() {
    return this.boltingService.findAllMaterials();
  }

  @Get('materials/by-group')
  findMaterialByGroup(@Query('materialGroup') materialGroup: string) {
    return this.boltingService.findMaterialByGroup(materialGroup);
  }

  @Get()
  findAllBolting() {
    return this.boltingService.findAllBolting();
  }

  @Get('by-standard')
  findByStandard(@Query('standardId') standardId: string) {
    return this.boltingService.findBoltingByStandard(Number(standardId));
  }

  @Get('by-standard-and-class')
  findByStandardAndClass(
    @Query('standardId') standardId: string,
    @Query('pressureClass') pressureClass: string,
  ) {
    return this.boltingService.findBoltingByStandardAndClass(Number(standardId), pressureClass);
  }

  @Get('for-flange')
  getBoltingForFlange(
    @Query('standardId') standardId: string,
    @Query('pressureClass') pressureClass: string,
    @Query('nps') nps: string,
  ) {
    return this.boltingService.getBoltingForFlange(Number(standardId), pressureClass, nps);
  }

  @Get('complete')
  getCompleteBoltingInfo(
    @Query('standardId') standardId: string,
    @Query('pressureClass') pressureClass: string,
    @Query('nps') nps: string,
    @Query('materialGroup') materialGroup?: string,
  ) {
    return this.boltingService.getCompleteBoltingInfo(
      Number(standardId),
      pressureClass,
      nps,
      materialGroup || 'Carbon Steel A105 (Group 1.1)',
    );
  }
}
