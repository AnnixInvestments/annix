import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { RequisitionsController } from "../controllers/requisitions.controller";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { RequisitionRepository } from "../repositories/requisition.repository";
import { MongoRequisitionRepository } from "../repositories/requisition.repository.mongo";
import { RequisitionItemRepository } from "../repositories/requisition-item.repository";
import { MongoRequisitionItemRepository } from "../repositories/requisition-item.repository.mongo";
import { RequisitionSchema } from "../schemas/requisition.schema";
import { RequisitionItemSchema } from "../schemas/requisition-item.schema";
import { RequisitionService } from "../services/requisition.service";

@Module({
  imports: [
    StockControlCoreModule,
    MongooseModule.forFeature([
      { name: "Requisition", schema: RequisitionSchema },
      { name: "RequisitionItem", schema: RequisitionItemSchema },
    ]),
  ],
  controllers: [RequisitionsController],
  providers: [
    RequisitionService,
    repositoryProvider(RequisitionRepository, MongoRequisitionRepository),
    repositoryProvider(RequisitionItemRepository, MongoRequisitionItemRepository),
  ],
  exports: [RequisitionService, RequisitionRepository, RequisitionItemRepository],
})
export class RequisitionModule {}
