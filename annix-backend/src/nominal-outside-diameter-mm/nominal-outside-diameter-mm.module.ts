import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmController } from "./nominal-outside-diameter-mm.controller";
import { NominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository";
import { MongoNominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository.mongo";
import { PostgresNominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository.postgres";
import { NominalOutsideDiameterMmService } from "./nominal-outside-diameter-mm.service";
import { NominalOutsideDiameterMmSchema } from "./schemas/nominal-outside-diameter-mm.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([NominalOutsideDiameterMm])]),
  ],
  controllers: [NominalOutsideDiameterMmController],
  providers: [
    NominalOutsideDiameterMmService,
    repositoryProvider(
      NominalOutsideDiameterMmRepository,
      PostgresNominalOutsideDiameterMmRepository,
      MongoNominalOutsideDiameterMmRepository,
    ),
  ],
})
export class NominalOutsideDiameterMmModule {}
