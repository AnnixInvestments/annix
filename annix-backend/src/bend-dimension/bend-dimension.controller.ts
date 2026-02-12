import { Controller, Get, Query } from '@nestjs/common';
import { BendDimensionService } from './bend-dimension.service';

@Controller('bend-dimension')
export class BendDimensionController {
    constructor(private readonly service: BendDimensionService) {}

    @Get('calculate')
    async calculate(
        @Query('nbMm') nbMm: number,
        @Query('degree') degree: number,
        @Query('multiplier') multiplier: number,
    ) {
        const value = await this.service.calculate(nbMm, degree, multiplier);
        return { nbMm, degree, multiplier, value };
    }
}
