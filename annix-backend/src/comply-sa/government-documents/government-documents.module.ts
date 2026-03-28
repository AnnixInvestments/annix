import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaGovernmentDocument } from "./entities/government-document.entity";
import { ComplySaGovernmentDocumentsController } from "./government-documents.controller";
import { ComplySaGovernmentDocumentsService } from "./government-documents.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaGovernmentDocument])],
  controllers: [ComplySaGovernmentDocumentsController],
  providers: [ComplySaGovernmentDocumentsService],
  exports: [ComplySaGovernmentDocumentsService],
})
export class ComplySaGovernmentDocumentsModule {}
