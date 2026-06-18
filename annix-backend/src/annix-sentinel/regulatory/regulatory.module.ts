import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { NixModule } from "../../nix/nix.module";
import { AnnixSentinelRegulatoryUpdate } from "./entities/regulatory-update.entity";
import { AnnixSentinelRegulatoryController } from "./regulatory.controller";
import { AnnixSentinelRegulatoryService } from "./regulatory.service";
import { AnnixSentinelRegulatoryUpdateRepository } from "./regulatory-update.repository";
import { MongoAnnixSentinelRegulatoryUpdateRepository } from "./regulatory-update.repository.mongo";
import { PostgresAnnixSentinelRegulatoryUpdateRepository } from "./regulatory-update.repository.postgres";
import { AnnixSentinelRegulatoryUpdateSchema } from "./schemas/regulatory-update.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            {
              name: "AnnixSentinelRegulatoryUpdate",
              schema: AnnixSentinelRegulatoryUpdateSchema,
            },
          ]),
        ]
      : [TypeOrmModule.forFeature([AnnixSentinelRegulatoryUpdate])]),
    NixModule,
  ],
  controllers: [AnnixSentinelRegulatoryController],
  providers: [
    AnnixSentinelRegulatoryService,
    repositoryProvider(
      AnnixSentinelRegulatoryUpdateRepository,
      PostgresAnnixSentinelRegulatoryUpdateRepository,
      MongoAnnixSentinelRegulatoryUpdateRepository,
    ),
  ],
})
export class AnnixSentinelRegulatoryModule {}
