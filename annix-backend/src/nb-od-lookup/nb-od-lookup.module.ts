import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbOdLookup } from "./entities/nb-od-lookup.entity";
import { NbOdLookupController } from "./nb-od-lookup.controller";
import { NbOdLookupRepository } from "./nb-od-lookup.repository";
import { MongoNbOdLookupRepository } from "./nb-od-lookup.repository.mongo";
import { PostgresNbOdLookupRepository } from "./nb-od-lookup.repository.postgres";
import { NbOdLookupService } from "./nb-od-lookup.service";
import { NbOdLookupSchema } from "./schemas/nb-od-lookup.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "NbOdLookup", schema: NbOdLookupSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([NbOdLookup])]),
  ],
  controllers: [NbOdLookupController],
  providers: [
    NbOdLookupService,
    repositoryProvider(
      NbOdLookupRepository,
      PostgresNbOdLookupRepository,
      MongoNbOdLookupRepository,
    ),
  ],
  exports: [NbOdLookupService],
})
export class NbOdLookupModule {}
