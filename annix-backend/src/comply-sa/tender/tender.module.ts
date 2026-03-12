import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaDocument } from "../comply-documents/entities/document.entity";
import { ComplySaTenderController } from "./tender.controller";
import { ComplySaTenderService } from "./tender.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaCompany, ComplySaDocument])],
  controllers: [ComplySaTenderController],
  providers: [ComplySaTenderService],
})
export class ComplySaTenderModule {}
