import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PipeDimension } from "src/pipe-dimension/entities/pipe-dimension.entity";
import { PipePressure } from "./entities/pipe-pressure.entity";
import { PipePressureController } from "./pipe-pressure.controller";
import { PipePressureService } from "./pipe-pressure.service";

@Module({
  imports: [TypeOrmModule.forFeature([PipePressure, PipeDimension])],
  providers: [PipePressureService],
  controllers: [PipePressureController],
  exports: [PipePressureService],
})
export class PipePressureModule {}
