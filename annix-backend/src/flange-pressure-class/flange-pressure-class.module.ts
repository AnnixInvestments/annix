import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassController } from "./flange-pressure-class.controller";
import { FlangePressureClassService } from "./flange-pressure-class.service";

@Module({
  imports: [TypeOrmModule.forFeature([FlangePressureClass, FlangeStandard])],
  controllers: [FlangePressureClassController],
  providers: [FlangePressureClassService],
  exports: [FlangePressureClassService],
})
export class FlangePressureClassModule {}
