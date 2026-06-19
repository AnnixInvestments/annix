import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { MongoNutMassRepository } from "../nut-mass/nut-mass.repository.mongo";
import { NutMassSchema } from "../nut-mass/schemas/nut-mass.schema";
import { WasherSchema } from "../washer/schemas/washer.schema";
import { WasherRepository } from "../washer/washer.repository";
import { MongoWasherRepository } from "../washer/washer.repository.mongo";
import { BoltController } from "./bolt.controller";
import { BoltRepository } from "./bolt.repository";
import { MongoBoltRepository } from "./bolt.repository.mongo";
import { BoltService } from "./bolt.service";
import { PipeClampRepository } from "./pipe-clamp.repository";
import { MongoPipeClampRepository } from "./pipe-clamp.repository.mongo";
import { BoltSchema } from "./schemas/bolt.schema";
import { PipeClampEntitySchema } from "./schemas/pipe-clamp-entity.schema";
import { ThreadedInsertSchema } from "./schemas/threaded-insert.schema";
import { UBoltEntitySchema } from "./schemas/u-bolt-entity.schema";
import { ThreadedInsertRepository } from "./threaded-insert.repository";
import { MongoThreadedInsertRepository } from "./threaded-insert.repository.mongo";
import { UBoltRepository } from "./u-bolt.repository";
import { MongoUBoltRepository } from "./u-bolt.repository.mongo";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Bolt", schema: BoltSchema },
      { name: "UBoltEntity", schema: UBoltEntitySchema },
      { name: "PipeClampEntity", schema: PipeClampEntitySchema },
      { name: "ThreadedInsert", schema: ThreadedInsertSchema },
      { name: "NutMass", schema: NutMassSchema },
      { name: "Washer", schema: WasherSchema },
    ]),
  ],
  controllers: [BoltController],
  providers: [
    BoltService,
    repositoryProvider(BoltRepository, MongoBoltRepository),
    repositoryProvider(UBoltRepository, MongoUBoltRepository),
    repositoryProvider(PipeClampRepository, MongoPipeClampRepository),
    repositoryProvider(ThreadedInsertRepository, MongoThreadedInsertRepository),
    repositoryProvider(NutMassRepository, MongoNutMassRepository),
    repositoryProvider(WasherRepository, MongoWasherRepository),
  ],
  exports: [BoltService],
})
export class BoltModule {}
