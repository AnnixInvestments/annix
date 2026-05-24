import { Module } from "@nestjs/common";
import { AnnixSentinelI18nService } from "./i18n.service";

@Module({
  providers: [AnnixSentinelI18nService],
  exports: [AnnixSentinelI18nService],
})
export class AnnixSentinelI18nModule {}
