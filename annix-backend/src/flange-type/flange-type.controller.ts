import { Controller, Get, Param } from '@nestjs/common';
import { FlangeTypeService } from './flange-type.service';

@Controller('flange-types')
export class FlangeTypeController {
  constructor(private readonly flangeTypeService: FlangeTypeService) {}

  @Get()
  findAll() {
    return this.flangeTypeService.findAll();
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.flangeTypeService.findByCode(code);
  }

  @Get('abbreviation/:abbreviation')
  findByAbbreviation(@Param('abbreviation') abbreviation: string) {
    return this.flangeTypeService.findByAbbreviation(abbreviation);
  }
}
