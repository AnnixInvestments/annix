import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FabricationComplexity } from "./entities/fabrication-complexity.entity";
import { FabricationOperation } from "./entities/fabrication-operation.entity";
import { ShopLaborRate } from "./entities/shop-labor-rate.entity";
import { StructuralSteelGrade } from "./entities/structural-steel-grade.entity";
import { StructuralSteelSection } from "./entities/structural-steel-section.entity";
import { StructuralSteelType } from "./entities/structural-steel-type.entity";
import { FabricationComplexitySchema } from "./schemas/fabrication-complexity.schema";
import { FabricationOperationSchema } from "./schemas/fabrication-operation.schema";
import { ShopLaborRateSchema } from "./schemas/shop-labor-rate.schema";
import { StructuralSteelGradeSchema } from "./schemas/structural-steel-grade.schema";
import { StructuralSteelSectionSchema } from "./schemas/structural-steel-section.schema";
import { StructuralSteelTypeSchema } from "./schemas/structural-steel-type.schema";
import { StructuralSteelController } from "./structural-steel.controller";
import { StructuralSteelRepository } from "./structural-steel.repository";
import { MongoStructuralSteelRepository } from "./structural-steel.repository.mongo";
import { PostgresStructuralSteelRepository } from "./structural-steel.repository.postgres";
import { StructuralSteelService } from "./structural-steel.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "StructuralSteelType", schema: StructuralSteelTypeSchema },
            { name: "StructuralSteelSection", schema: StructuralSteelSectionSchema },
            { name: "StructuralSteelGrade", schema: StructuralSteelGradeSchema },
            { name: "FabricationOperation", schema: FabricationOperationSchema },
            { name: "FabricationComplexity", schema: FabricationComplexitySchema },
            { name: "ShopLaborRate", schema: ShopLaborRateSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            StructuralSteelType,
            StructuralSteelSection,
            StructuralSteelGrade,
            FabricationOperation,
            FabricationComplexity,
            ShopLaborRate,
          ]),
        ]),
  ],
  controllers: [StructuralSteelController],
  providers: [
    StructuralSteelService,
    repositoryProvider(
      StructuralSteelRepository,
      PostgresStructuralSteelRepository,
      MongoStructuralSteelRepository,
    ),
  ],
  exports: [StructuralSteelService],
})
export class StructuralSteelModule {}
