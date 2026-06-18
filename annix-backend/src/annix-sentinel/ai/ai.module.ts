import { forwardRef, Module } from "@nestjs/common";
import { NixModule } from "../../nix/nix.module";
import { StorageModule } from "../../storage/storage.module";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelAiController } from "./ai.controller";
import { AnnixSentinelAiService } from "./ai.service";

@Module({
  imports: [
    AnnixSentinelCompaniesModule,
    forwardRef(() => AnnixSentinelComplianceModule),
    NixModule,
    StorageModule,
  ],
  controllers: [AnnixSentinelAiController],
  providers: [AnnixSentinelAiService],
  exports: [AnnixSentinelAiService],
})
export class AnnixSentinelAiModule {}
