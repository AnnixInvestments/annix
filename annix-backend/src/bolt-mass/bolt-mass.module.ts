import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BoltRepository } from "../bolt/bolt.repository";
import { MongoBoltRepository } from "../bolt/bolt.repository.mongo";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BoltMassController } from "./bolt-mass.controller";
import { BoltMassRepository } from "./bolt-mass.repository";
import { MongoBoltMassRepository } from "./bolt-mass.repository.mongo";
import { BoltMassService } from "./bolt-mass.service";
import { BoltMassSchema } from "./schemas/bolt-mass.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "BoltMass", schema: BoltMassSchema },
      { name: "Bolt", schema: BoltSchema },
    ]),
  ],
  controllers: [BoltMassController],
  providers: [
    BoltMassService,
    repositoryProvider(BoltMassRepository, MongoBoltMassRepository),
    repositoryProvider(BoltRepository, MongoBoltRepository),
  ],
  exports: [BoltMassService],
})
export class BoltMassModule {}
