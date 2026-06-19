import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { WasherSchema } from "./schemas/washer.schema";
import { WasherController } from "./washer.controller";
import { WasherRepository } from "./washer.repository";
import { MongoWasherRepository } from "./washer.repository.mongo";
import { WasherService } from "./washer.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Washer", schema: WasherSchema },
      { name: "Bolt", schema: BoltSchema },
    ]),
  ],
  controllers: [WasherController],
  providers: [WasherService, repositoryProvider(WasherRepository, MongoWasherRepository)],
  exports: [WasherService],
})
export class WasherModule {}
