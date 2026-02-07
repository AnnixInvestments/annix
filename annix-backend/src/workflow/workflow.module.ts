import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoqModule } from "../boq/boq.module";
import { DrawingsModule } from "../drawings/drawings.module";
import { ReviewWorkflow } from "./entities/review-workflow.entity";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewWorkflow]),
    forwardRef(() => DrawingsModule),
    forwardRef(() => BoqModule),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
