import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaAiModule } from "../ai/ai.module";
import { ComplySaComplianceModule } from "../compliance/compliance.module";
import { ComplySaDocumentsController } from "./documents.controller";
import { ComplySaDocumentsService } from "./documents.service";
import { ComplySaDocument } from "./entities/document.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplySaDocument]),
    ComplySaAiModule,
    ComplySaComplianceModule,
  ],
  controllers: [ComplySaDocumentsController],
  providers: [ComplySaDocumentsService],
  exports: [ComplySaDocumentsService],
})
export class ComplySaDocumentsModule {}
