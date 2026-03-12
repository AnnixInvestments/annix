import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaApiKeysController } from "./api-keys.controller";
import { ComplySaApiKeysService } from "./api-keys.service";
import { ComplySaApiKey } from "./entities/api-key.entity";
import { ComplySaApiKeyGuard } from "./guards/api-key.guard";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaApiKey])],
  controllers: [ComplySaApiKeysController],
  providers: [ComplySaApiKeysService, ComplySaApiKeyGuard],
  exports: [ComplySaApiKeysService, ComplySaApiKeyGuard],
})
export class ComplySaApiKeysModule {}
