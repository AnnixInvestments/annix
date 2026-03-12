import { Module } from "@nestjs/common";
import { ComplySaI18nService } from "./i18n.service";

@Module({
  providers: [ComplySaI18nService],
  exports: [ComplySaI18nService],
})
export class ComplySaI18nModule {}
