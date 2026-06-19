import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BoqModule } from "../boq/boq.module";
import { DrawingsModule } from "../drawings/drawings.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { ReviewWorkflowSchema } from "./schemas/review-workflow.schema";
import { WorkflowController } from "./workflow.controller";
import { ReviewWorkflowRepository } from "./workflow.repository";
import { MongoReviewWorkflowRepository } from "./workflow.repository.mongo";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "ReviewWorkflow", schema: ReviewWorkflowSchema }]),
    forwardRef(() => DrawingsModule),
    forwardRef(() => BoqModule),
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    repositoryProvider(ReviewWorkflowRepository, MongoReviewWorkflowRepository),
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
