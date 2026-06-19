import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbOdLookupController } from "./nb-od-lookup.controller";
import { NbOdLookupRepository } from "./nb-od-lookup.repository";
import { MongoNbOdLookupRepository } from "./nb-od-lookup.repository.mongo";
import { NbOdLookupService } from "./nb-od-lookup.service";
import { NbOdLookupSchema } from "./schemas/nb-od-lookup.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "NbOdLookup", schema: NbOdLookupSchema }])],
  controllers: [NbOdLookupController],
  providers: [
    NbOdLookupService,
    repositoryProvider(NbOdLookupRepository, MongoNbOdLookupRepository),
  ],
  exports: [NbOdLookupService],
})
export class NbOdLookupModule {}
