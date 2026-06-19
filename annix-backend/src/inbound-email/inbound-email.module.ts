import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { AdminInboundEmailController } from "./admin-inbound-email.controller";
import { AdminInboundEmailService } from "./admin-inbound-email.service";
import { InboundEmailController } from "./inbound-email.controller";
import { InboundEmailRepository } from "./inbound-email.repository";
import { MongoInboundEmailRepository } from "./inbound-email.repository.mongo";
import { InboundEmailService } from "./inbound-email.service";
import { InboundEmailAttachmentRepository } from "./inbound-email-attachment.repository";
import { MongoInboundEmailAttachmentRepository } from "./inbound-email-attachment.repository.mongo";
import { InboundEmailConfigRepository } from "./inbound-email-config.repository";
import { MongoInboundEmailConfigRepository } from "./inbound-email-config.repository.mongo";
import { InboundEmailMonitorService } from "./inbound-email-monitor.service";
import { InboundEmailProvisioningService } from "./inbound-email-provisioning.service";
import { InboundEmailRegistry } from "./inbound-email-registry.service";
import { InboundEmailSchema } from "./schemas/inbound-email.schema";
import { InboundEmailAttachmentSchema } from "./schemas/inbound-email-attachment.schema";
import { InboundEmailConfigSchema } from "./schemas/inbound-email-config.schema";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "InboundEmailConfig", schema: InboundEmailConfigSchema },
      { name: "InboundEmail", schema: InboundEmailSchema },
      { name: "InboundEmailAttachment", schema: InboundEmailAttachmentSchema },
    ]),
    StorageModule,
    AdminModule,
  ],
  controllers: [InboundEmailController, AdminInboundEmailController],
  providers: [
    InboundEmailService,
    InboundEmailMonitorService,
    InboundEmailProvisioningService,
    AdminInboundEmailService,
    InboundEmailRegistry,
    repositoryProvider(InboundEmailConfigRepository, MongoInboundEmailConfigRepository),
    repositoryProvider(InboundEmailRepository, MongoInboundEmailRepository),
    repositoryProvider(InboundEmailAttachmentRepository, MongoInboundEmailAttachmentRepository),
  ],
  exports: [
    InboundEmailService,
    InboundEmailMonitorService,
    InboundEmailProvisioningService,
    InboundEmailRegistry,
  ],
})
export class InboundEmailModule {}
