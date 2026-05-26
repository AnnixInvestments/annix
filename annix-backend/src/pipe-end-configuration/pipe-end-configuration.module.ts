import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PipeEndConfiguration } from "./entities/pipe-end-configuration.entity";
import { PipeEndConfigurationController } from "./pipe-end-configuration.controller";
import { PipeEndConfigurationRepository } from "./pipe-end-configuration.repository";
import { MongoPipeEndConfigurationRepository } from "./pipe-end-configuration.repository.mongo";
import { PostgresPipeEndConfigurationRepository } from "./pipe-end-configuration.repository.postgres";
import { PipeEndConfigurationService } from "./pipe-end-configuration.service";
import { PipeEndConfigurationSchema } from "./schemas/pipe-end-configuration.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "PipeEndConfiguration", schema: PipeEndConfigurationSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([PipeEndConfiguration])]),
  ],
  controllers: [PipeEndConfigurationController],
  providers: [
    PipeEndConfigurationService,
    repositoryProvider(
      PipeEndConfigurationRepository,
      PostgresPipeEndConfigurationRepository,
      MongoPipeEndConfigurationRepository,
    ),
  ],
  exports: [PipeEndConfigurationService],
})
export class PipeEndConfigurationModule {}
