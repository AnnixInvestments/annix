import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NbNpsLookup } from "src/nb-nps-lookup/entities/nb-nps-lookup.entity";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.mongo";
import { PostgresNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.postgres";
import { NbNpsLookupSchema } from "../nb-nps-lookup/schemas/nb-nps-lookup.schema";
import { BendDimensionController } from "./bend-dimension.controller";
import { BendDimensionService } from "./bend-dimension.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "NbNpsLookup", schema: NbNpsLookupSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([NbNpsLookup])]),
  ],
  controllers: [BendDimensionController],
  providers: [
    BendDimensionService,
    repositoryProvider(
      NbNpsLookupRepository,
      PostgresNbNpsLookupRepository,
      MongoNbNpsLookupRepository,
    ),
  ],
  exports: [BendDimensionService],
})
export class BendDimensionModule {}
