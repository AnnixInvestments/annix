import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { MongoFlangeStandardRepository } from "../flange-standard/flange-standard.repository.mongo";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangePressureClassController } from "./flange-pressure-class.controller";
import { FlangePressureClassRepository } from "./flange-pressure-class.repository";
import { MongoFlangePressureClassRepository } from "./flange-pressure-class.repository.mongo";
import { FlangePressureClassService } from "./flange-pressure-class.service";
import { FlangePressureClassSchema } from "./schemas/flange-pressure-class.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FlangePressureClass", schema: FlangePressureClassSchema },
      { name: "FlangeStandard", schema: FlangeStandardSchema },
    ]),
  ],
  controllers: [FlangePressureClassController],
  providers: [
    FlangePressureClassService,
    repositoryProvider(FlangePressureClassRepository, MongoFlangePressureClassRepository),
    repositoryProvider(FlangeStandardRepository, MongoFlangeStandardRepository),
  ],
  exports: [FlangePressureClassService],
})
export class FlangePressureClassModule {}
