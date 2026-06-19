import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PipeEndConfigurationController } from "./pipe-end-configuration.controller";
import { PipeEndConfigurationRepository } from "./pipe-end-configuration.repository";
import { MongoPipeEndConfigurationRepository } from "./pipe-end-configuration.repository.mongo";
import { PipeEndConfigurationService } from "./pipe-end-configuration.service";
import { PipeEndConfigurationSchema } from "./schemas/pipe-end-configuration.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PipeEndConfiguration", schema: PipeEndConfigurationSchema },
    ]),
  ],
  controllers: [PipeEndConfigurationController],
  providers: [
    PipeEndConfigurationService,
    repositoryProvider(PipeEndConfigurationRepository, MongoPipeEndConfigurationRepository),
  ],
  exports: [PipeEndConfigurationService],
})
export class PipeEndConfigurationModule {}
