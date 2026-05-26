import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltRepository } from "../bolt/bolt.repository";
import { MongoBoltRepository } from "../bolt/bolt.repository.mongo";
import { PostgresBoltRepository } from "../bolt/bolt.repository.postgres";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BoltMassController } from "./bolt-mass.controller";
import { BoltMassRepository } from "./bolt-mass.repository";
import { MongoBoltMassRepository } from "./bolt-mass.repository.mongo";
import { PostgresBoltMassRepository } from "./bolt-mass.repository.postgres";
import { BoltMassService } from "./bolt-mass.service";
import { BoltMass } from "./entities/bolt-mass.entity";
import { BoltMassSchema } from "./schemas/bolt-mass.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "BoltMass", schema: BoltMassSchema },
            { name: "Bolt", schema: BoltSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([BoltMass, Bolt])]),
  ],
  controllers: [BoltMassController],
  providers: [
    BoltMassService,
    repositoryProvider(BoltMassRepository, PostgresBoltMassRepository, MongoBoltMassRepository),
    repositoryProvider(BoltRepository, PostgresBoltRepository, MongoBoltRepository),
  ],
  exports: [BoltMassService],
})
export class BoltMassModule {}
