import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaDocumentsController } from "./documents.controller";
import { ComplySaDocumentsService } from "./documents.service";
import { ComplySaDocument } from "./entities/document.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaDocument])],
  controllers: [ComplySaDocumentsController],
  providers: [ComplySaDocumentsService],
  exports: [ComplySaDocumentsService],
})
export class ComplySaDocumentsModule {}
