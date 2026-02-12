import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NbNpsLookup } from 'src/nb-nps-lookup/entities/nb-nps-lookup.entity';
import { BendDimensionController } from './bend-dimension.controller';
import { BendDimensionService } from './bend-dimension.service';

@Module({
    imports: [TypeOrmModule.forFeature([NbNpsLookup])], 
    controllers: [BendDimensionController],
    providers: [BendDimensionService],
    exports: [BendDimensionService],
})
export class BendDimensionModule {}
