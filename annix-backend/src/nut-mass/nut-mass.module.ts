import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NutMassController } from "./nut-mass.controller";
import { NutMassRepository } from "./nut-mass.repository";
import { MongoNutMassRepository } from "./nut-mass.repository.mongo";
import { NutMassService } from "./nut-mass.service";
import { NutMassSchema } from "./schemas/nut-mass.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "NutMass", schema: NutMassSchema },
      { name: "Bolt", schema: BoltSchema },
    ]),
  ],
  controllers: [NutMassController],
  providers: [NutMassService, repositoryProvider(NutMassRepository, MongoNutMassRepository)],
  exports: [NutMassService],
})
export class NutMassModule {}
