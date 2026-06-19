import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { NixModule } from "../../nix/nix.module";
import { AnnixSentinelRegulatoryController } from "./regulatory.controller";
import { AnnixSentinelRegulatoryService } from "./regulatory.service";
import { AnnixSentinelRegulatoryUpdateRepository } from "./regulatory-update.repository";
import { MongoAnnixSentinelRegulatoryUpdateRepository } from "./regulatory-update.repository.mongo";
import { AnnixSentinelRegulatoryUpdateSchema } from "./schemas/regulatory-update.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "AnnixSentinelRegulatoryUpdate",
        schema: AnnixSentinelRegulatoryUpdateSchema,
      },
    ]),
    NixModule,
  ],
  controllers: [AnnixSentinelRegulatoryController],
  providers: [
    AnnixSentinelRegulatoryService,
    repositoryProvider(
      AnnixSentinelRegulatoryUpdateRepository,
      MongoAnnixSentinelRegulatoryUpdateRepository,
    ),
  ],
})
export class AnnixSentinelRegulatoryModule {}
