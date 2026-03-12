import { Module } from "@nestjs/common";
import { ComplySaTaxController } from "./tax.controller";
import { ComplySaTaxService } from "./tax.service";

@Module({
  controllers: [ComplySaTaxController],
  providers: [ComplySaTaxService],
  exports: [ComplySaTaxService],
})
export class ComplySaTaxModule {}
