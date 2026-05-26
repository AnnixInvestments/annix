import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AnsiFittingController } from "./ansi-fitting.controller";
import {
  AnsiFittingDimensionRepository,
  AnsiFittingTypeRepository,
} from "./ansi-fitting.repository";
import {
  MongoAnsiFittingDimensionRepository,
  MongoAnsiFittingTypeRepository,
} from "./ansi-fitting.repository.mongo";
import {
  PostgresAnsiFittingDimensionRepository,
  PostgresAnsiFittingTypeRepository,
} from "./ansi-fitting.repository.postgres";
import { AnsiFittingService } from "./ansi-fitting.service";
import { AnsiB169FittingDimension } from "./entities/ansi-b16-9-fitting-dimension.entity";
import { AnsiB169FittingType } from "./entities/ansi-b16-9-fitting-type.entity";
import { AnsiB169FittingDimensionSchema } from "./schemas/ansi-b169-fitting-dimension.schema";
import { AnsiB169FittingTypeSchema } from "./schemas/ansi-b169-fitting-type.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AnsiB169FittingDimension", schema: AnsiB169FittingDimensionSchema },
            { name: "AnsiB169FittingType", schema: AnsiB169FittingTypeSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([AnsiB169FittingDimension, AnsiB169FittingType])]),
  ],
  controllers: [AnsiFittingController],
  providers: [
    AnsiFittingService,
    repositoryProvider(
      AnsiFittingDimensionRepository,
      PostgresAnsiFittingDimensionRepository,
      MongoAnsiFittingDimensionRepository,
    ),
    repositoryProvider(
      AnsiFittingTypeRepository,
      PostgresAnsiFittingTypeRepository,
      MongoAnsiFittingTypeRepository,
    ),
  ],
  exports: [AnsiFittingService],
})
export class AnsiFittingModule {}
