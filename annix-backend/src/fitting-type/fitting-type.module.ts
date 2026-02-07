import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FittingType } from "./entities/fitting-type.entity";
import { FittingTypeController } from "./fitting-type.controller";
import { FittingTypeService } from "./fitting-type.service";

@Module({
  // controllers: [FittingTypeController],
  // providers: [FittingTypeService],
  imports: [TypeOrmModule.forFeature([FittingType])],
  controllers: [FittingTypeController],
  providers: [FittingTypeService],
  exports: [FittingTypeService],
})
export class FittingTypeModule {}
