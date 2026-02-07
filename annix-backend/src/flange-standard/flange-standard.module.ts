import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeStandard } from "./entities/flange-standard.entity";
import { FlangeStandardController } from "./flange-standard.controller";
import { FlangeStandardService } from "./flange-standard.service";

@Module({
  imports: [TypeOrmModule.forFeature([FlangeStandard])],
  controllers: [FlangeStandardController],
  providers: [FlangeStandardService],
  exports: [FlangeStandardService],
})
export class FlangeStandardModule {}
