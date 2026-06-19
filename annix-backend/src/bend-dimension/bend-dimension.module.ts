import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.mongo";
import { NbNpsLookupSchema } from "../nb-nps-lookup/schemas/nb-nps-lookup.schema";
import { BendDimensionController } from "./bend-dimension.controller";
import { BendDimensionService } from "./bend-dimension.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: "NbNpsLookup", schema: NbNpsLookupSchema }])],
  controllers: [BendDimensionController],
  providers: [
    BendDimensionService,
    repositoryProvider(NbNpsLookupRepository, MongoNbNpsLookupRepository),
  ],
  exports: [BendDimensionService],
})
export class BendDimensionModule {}
