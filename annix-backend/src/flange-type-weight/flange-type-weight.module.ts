import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightController } from "./flange-type-weight.controller";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";
import { MongoFlangeTypeWeightRepository } from "./flange-type-weight.repository.mongo";
import { PostgresFlangeTypeWeightRepository } from "./flange-type-weight.repository.postgres";
import { FlangeTypeWeightService } from "./flange-type-weight.service";
import { FlangeTypeWeightSchema } from "./schemas/flange-type-weight.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FlangeTypeWeight", schema: FlangeTypeWeightSchema },
            { name: "FlangeStandard", schema: FlangeStandardSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FlangeTypeWeight])]),
  ],
  controllers: [FlangeTypeWeightController],
  providers: [
    FlangeTypeWeightService,
    repositoryProvider(
      FlangeTypeWeightRepository,
      PostgresFlangeTypeWeightRepository,
      MongoFlangeTypeWeightRepository,
    ),
  ],
  exports: [FlangeTypeWeightService],
})
export class FlangeTypeWeightModule {}
