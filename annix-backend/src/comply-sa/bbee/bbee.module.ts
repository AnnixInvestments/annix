import { Module } from "@nestjs/common";
import { ComplySaBbeeController } from "./bbee.controller";
import { ComplySaBbeeService } from "./bbee.service";

@Module({
  controllers: [ComplySaBbeeController],
  providers: [ComplySaBbeeService],
  exports: [ComplySaBbeeService],
})
export class ComplySaBbeeModule {}
