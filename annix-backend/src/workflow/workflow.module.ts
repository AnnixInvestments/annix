import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewWorkflow } from './entities/review-workflow.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { DrawingsModule } from '../drawings/drawings.module';
import { BoqModule } from '../boq/boq.module';

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
