import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StructuralSteelType } from './entities/structural-steel-type.entity';
import { StructuralSteelSection } from './entities/structural-steel-section.entity';
import { StructuralSteelGrade } from './entities/structural-steel-grade.entity';
import { FabricationOperation } from './entities/fabrication-operation.entity';
import { FabricationComplexity } from './entities/fabrication-complexity.entity';
import { ShopLaborRate } from './entities/shop-labor-rate.entity';
import { StructuralSteelService } from './structural-steel.service';
import { StructuralSteelController } from './structural-steel.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StructuralSteelType,
      StructuralSteelSection,
      StructuralSteelGrade,
      FabricationOperation,
      FabricationComplexity,
      ShopLaborRate,
    ]),
  ],
  controllers: [StructuralSteelController],
  providers: [StructuralSteelService],
  exports: [StructuralSteelService],
})
export class StructuralSteelModule {}
