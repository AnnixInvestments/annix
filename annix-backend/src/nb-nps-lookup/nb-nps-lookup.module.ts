import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookup } from "./entities/nb-nps-lookup.entity";
import { NbNpsLookupController } from "./nb-nps-lookup.controller";
import { NbNpsLookupRepository } from "./nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "./nb-nps-lookup.repository.mongo";
import { PostgresNbNpsLookupRepository } from "./nb-nps-lookup.repository.postgres";
import { NbNpsLookupService } from "./nb-nps-lookup.service";
import { NbNpsLookupSchema } from "./schemas/nb-nps-lookup.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "NbNpsLookup", schema: NbNpsLookupSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([NbNpsLookup])]),
  ],
  controllers: [NbNpsLookupController],
  providers: [
    NbNpsLookupService,
    repositoryProvider(
      NbNpsLookupRepository,
      PostgresNbNpsLookupRepository,
      MongoNbNpsLookupRepository,
    ),
  ],
  exports: [NbNpsLookupRepository, ...(isMongoDriver() ? [] : [TypeOrmModule])],
})
export class NbNpsLookupModule {}
