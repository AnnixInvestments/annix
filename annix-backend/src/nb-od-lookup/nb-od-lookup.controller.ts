import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { NbOdLookupService } from './nb-od-lookup.service';

@ApiTags('nb-od-lookup')
@Controller('nb-od-lookup')
export class NbOdLookupController {
  constructor(private readonly nbOdLookupService: NbOdLookupService) {}

  @Get()
  @ApiOperation({ summary: 'Get all NB to OD mappings' })
  findAll() {
    return this.nbOdLookupService.findAll();
  }

  @Get('bores')
  @ApiOperation({ summary: 'Get available nominal bores' })
  availableNominalBores() {
    return this.nbOdLookupService.availableNominalBores();
  }

  @Get(':nominalBoreMm')
  @ApiOperation({ summary: 'Get OD for specific NB' })
  @ApiParam({ name: 'nominalBoreMm', description: 'Nominal bore in mm' })
  nbToOd(@Param('nominalBoreMm') nominalBoreMm: string) {
    const nbNum = parseInt(nominalBoreMm, 10);
    return this.nbOdLookupService.nbToOd(nbNum);
  }
}
