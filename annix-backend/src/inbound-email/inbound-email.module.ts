import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../storage/storage.module";
import { InboundEmail } from "./entities/inbound-email.entity";
import { InboundEmailAttachment } from "./entities/inbound-email-attachment.entity";
import { InboundEmailConfig } from "./entities/inbound-email-config.entity";
import { InboundEmailController } from "./inbound-email.controller";
import { InboundEmailService } from "./inbound-email.service";
import { InboundEmailMonitorService } from "./inbound-email-monitor.service";
import { InboundEmailRegistry } from "./inbound-email-registry.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([InboundEmailConfig, InboundEmail, InboundEmailAttachment]),
    StorageModule,
  ],
  controllers: [InboundEmailController],
  providers: [InboundEmailService, InboundEmailMonitorService, InboundEmailRegistry],
  exports: [InboundEmailService, InboundEmailMonitorService, InboundEmailRegistry],
})
export class InboundEmailModule {}
