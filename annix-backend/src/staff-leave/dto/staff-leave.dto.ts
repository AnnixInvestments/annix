import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { LeaveType } from "../entities/staff-leave-record.entity";

export class CreateLeaveDto {
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
