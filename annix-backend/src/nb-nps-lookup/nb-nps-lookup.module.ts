import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookupController } from "./nb-nps-lookup.controller";
import { NbNpsLookupRepository } from "./nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "./nb-nps-lookup.repository.mongo";
import { NbNpsLookupService } from "./nb-nps-lookup.service";
import { NbNpsLookupSchema } from "./schemas/nb-nps-lookup.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "NbNpsLookup", schema: NbNpsLookupSchema }])],
  controllers: [NbNpsLookupController],
  providers: [
    NbNpsLookupService,
    repositoryProvider(NbNpsLookupRepository, MongoNbNpsLookupRepository),
  ],
  exports: [NbNpsLookupRepository],
})
export class NbNpsLookupModule {}
