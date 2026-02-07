import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WeldType } from "./entities/weld-type.entity";
import { WeldTypeController } from "./weld-type.controller";
import { WeldTypeService } from "./weld-type.service";

@Module({
  imports: [TypeOrmModule.forFeature([WeldType])],
  controllers: [WeldTypeController],
  providers: [WeldTypeService],
  exports: [WeldTypeService],
})
export class WeldTypeModule {}
