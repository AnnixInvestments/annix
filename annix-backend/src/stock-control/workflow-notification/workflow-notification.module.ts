import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EmailModule } from "../../email/email.module";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { StaffLeaveModule } from "../../staff-leave/staff-leave.module";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { WorkflowNotificationRecipientRepository } from "../repositories/workflow-notification-recipient.repository";
import { MongoWorkflowNotificationRecipientRepository } from "../repositories/workflow-notification-recipient.repository.mongo";
import { WorkflowNotificationRecipientSchema } from "../schemas/workflow-notification-recipient.schema";
import { CompanyEmailService } from "../services/company-email.service";
import { WebPushService } from "../services/web-push.service";
import { WorkflowAssignmentService } from "../services/workflow-assignment.service";
import { WorkflowNotificationService } from "../services/workflow-notification.service";

@Module({
  imports: [
    StockControlCoreModule,
    EmailModule,
    StaffLeaveModule,
    MongooseModule.forFeature([
      {
        name: "WorkflowNotificationRecipient",
        schema: WorkflowNotificationRecipientSchema,
      },
    ]),
  ],
  providers: [
    WorkflowNotificationService,
    WorkflowAssignmentService,
    WebPushService,
    CompanyEmailService,
    repositoryProvider(
      WorkflowNotificationRecipientRepository,
      MongoWorkflowNotificationRecipientRepository,
    ),
  ],
  exports: [
    WorkflowNotificationService,
    WorkflowAssignmentService,
    WebPushService,
    CompanyEmailService,
  ],
})
export class WorkflowNotificationModule {}
