import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "../bolt/entities/bolt.entity";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { Washer } from "./entities/washer.entity";
import { WasherSchema } from "./schemas/washer.schema";
import { WasherController } from "./washer.controller";
import { WasherRepository } from "./washer.repository";
import { MongoWasherRepository } from "./washer.repository.mongo";
import { PostgresWasherRepository } from "./washer.repository.postgres";
import { WasherService } from "./washer.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Washer", schema: WasherSchema },
            { name: "Bolt", schema: BoltSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([Washer, Bolt])]),
  ],
  controllers: [WasherController],
  providers: [
    WasherService,
    repositoryProvider(WasherRepository, PostgresWasherRepository, MongoWasherRepository),
  ],
  exports: [WasherService],
})
export class WasherModule {}
