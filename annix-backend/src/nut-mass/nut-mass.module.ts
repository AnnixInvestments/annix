import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NutMass } from "./entities/nut-mass.entity";
import { NutMassController } from "./nut-mass.controller";
import { NutMassRepository } from "./nut-mass.repository";
import { MongoNutMassRepository } from "./nut-mass.repository.mongo";
import { PostgresNutMassRepository } from "./nut-mass.repository.postgres";
import { NutMassService } from "./nut-mass.service";
import { NutMassSchema } from "./schemas/nut-mass.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "NutMass", schema: NutMassSchema },
            { name: "Bolt", schema: BoltSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([NutMass, Bolt])]),
  ],
  controllers: [NutMassController],
  providers: [
    NutMassService,
    repositoryProvider(NutMassRepository, PostgresNutMassRepository, MongoNutMassRepository),
  ],
  exports: [NutMassService],
})
export class NutMassModule {}
