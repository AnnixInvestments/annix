import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoltMass } from "src/bolt-mass/entities/bolt-mass.entity";
import { NutMass } from "src/nut-mass/entities/nut-mass.entity";
import { Washer } from "src/washer/entities/washer.entity";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { MongoNutMassRepository } from "../nut-mass/nut-mass.repository.mongo";
import { PostgresNutMassRepository } from "../nut-mass/nut-mass.repository.postgres";
import { NutMassSchema } from "../nut-mass/schemas/nut-mass.schema";
import { WasherSchema } from "../washer/schemas/washer.schema";
import { WasherRepository } from "../washer/washer.repository";
import { MongoWasherRepository } from "../washer/washer.repository.mongo";
import { PostgresWasherRepository } from "../washer/washer.repository.postgres";
import { BoltController } from "./bolt.controller";
import { BoltRepository } from "./bolt.repository";
import { MongoBoltRepository } from "./bolt.repository.mongo";
import { PostgresBoltRepository } from "./bolt.repository.postgres";
import { BoltService } from "./bolt.service";
import { Bolt } from "./entities/bolt.entity";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";
import { ThreadedInsert } from "./entities/threaded-insert.entity";
import { UBoltEntity } from "./entities/u-bolt.entity";
import { PipeClampRepository } from "./pipe-clamp.repository";
import { MongoPipeClampRepository } from "./pipe-clamp.repository.mongo";
import { PostgresPipeClampRepository } from "./pipe-clamp.repository.postgres";
import { BoltSchema } from "./schemas/bolt.schema";
import { PipeClampEntitySchema } from "./schemas/pipe-clamp-entity.schema";
import { ThreadedInsertSchema } from "./schemas/threaded-insert.schema";
import { UBoltEntitySchema } from "./schemas/u-bolt-entity.schema";
import { ThreadedInsertRepository } from "./threaded-insert.repository";
import { MongoThreadedInsertRepository } from "./threaded-insert.repository.mongo";
import { PostgresThreadedInsertRepository } from "./threaded-insert.repository.postgres";
import { UBoltRepository } from "./u-bolt.repository";
import { MongoUBoltRepository } from "./u-bolt.repository.mongo";
import { PostgresUBoltRepository } from "./u-bolt.repository.postgres";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Bolt", schema: BoltSchema },
            { name: "UBoltEntity", schema: UBoltEntitySchema },
            { name: "PipeClampEntity", schema: PipeClampEntitySchema },
            { name: "ThreadedInsert", schema: ThreadedInsertSchema },
            { name: "NutMass", schema: NutMassSchema },
            { name: "Washer", schema: WasherSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            Bolt,
            BoltMass,
            NutMass,
            UBoltEntity,
            PipeClampEntity,
            ThreadedInsert,
            Washer,
          ]),
        ]),
  ],
  controllers: [BoltController],
  providers: [
    BoltService,
    repositoryProvider(BoltRepository, PostgresBoltRepository, MongoBoltRepository),
    repositoryProvider(UBoltRepository, PostgresUBoltRepository, MongoUBoltRepository),
    repositoryProvider(PipeClampRepository, PostgresPipeClampRepository, MongoPipeClampRepository),
    repositoryProvider(
      ThreadedInsertRepository,
      PostgresThreadedInsertRepository,
      MongoThreadedInsertRepository,
    ),
    repositoryProvider(NutMassRepository, PostgresNutMassRepository, MongoNutMassRepository),
    repositoryProvider(WasherRepository, PostgresWasherRepository, MongoWasherRepository),
  ],
  exports: [BoltService],
})
export class BoltModule {}
