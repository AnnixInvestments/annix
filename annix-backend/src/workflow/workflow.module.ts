import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoqModule } from "../boq/boq.module";
import { DrawingsModule } from "../drawings/drawings.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { ReviewWorkflow } from "./entities/review-workflow.entity";
import { ReviewWorkflowSchema } from "./schemas/review-workflow.schema";
import { WorkflowController } from "./workflow.controller";
import { ReviewWorkflowRepository } from "./workflow.repository";
import { MongoReviewWorkflowRepository } from "./workflow.repository.mongo";
import { PostgresReviewWorkflowRepository } from "./workflow.repository.postgres";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "ReviewWorkflow", schema: ReviewWorkflowSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([ReviewWorkflow])]),
    forwardRef(() => DrawingsModule),
    forwardRef(() => BoqModule),
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    repositoryProvider(
      ReviewWorkflowRepository,
      PostgresReviewWorkflowRepository,
      MongoReviewWorkflowRepository,
    ),
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
