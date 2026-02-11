import { Module } from "@nestjs/common";
import { ReducerCalculatorController } from "./reducer-calculator.controller";
import { ReducerCalculatorService } from "./reducer-calculator.service";

@Module({
  controllers: [ReducerCalculatorController],
  providers: [ReducerCalculatorService],
  exports: [ReducerCalculatorService],
})
export class ReducerCalculatorModule {}
