import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeTypeWeightController } from "./flange-type-weight.controller";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";
import { MongoFlangeTypeWeightRepository } from "./flange-type-weight.repository.mongo";
import { FlangeTypeWeightService } from "./flange-type-weight.service";
import { FlangeTypeWeightSchema } from "./schemas/flange-type-weight.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FlangeTypeWeight", schema: FlangeTypeWeightSchema },
      { name: "FlangeStandard", schema: FlangeStandardSchema },
    ]),
  ],
  controllers: [FlangeTypeWeightController],
  providers: [
    FlangeTypeWeightService,
    repositoryProvider(FlangeTypeWeightRepository, MongoFlangeTypeWeightRepository),
  ],
  exports: [FlangeTypeWeightService],
})
export class FlangeTypeWeightModule {}
