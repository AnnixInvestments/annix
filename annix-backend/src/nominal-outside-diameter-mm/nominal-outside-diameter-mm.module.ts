import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmController } from "./nominal-outside-diameter-mm.controller";
import { NominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository";
import { MongoNominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository.mongo";
import { NominalOutsideDiameterMmService } from "./nominal-outside-diameter-mm.service";
import { NominalOutsideDiameterMmSchema } from "./schemas/nominal-outside-diameter-mm.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
    ]),
  ],
  controllers: [NominalOutsideDiameterMmController],
  providers: [
    NominalOutsideDiameterMmService,
    repositoryProvider(NominalOutsideDiameterMmRepository, MongoNominalOutsideDiameterMmRepository),
  ],
})
export class NominalOutsideDiameterMmModule {}
