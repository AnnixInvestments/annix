import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../../stock-control/guards/stock-control-role.guard";
import { CreateLeaveDto } from "../dto/staff-leave.dto";
import { StaffLeaveEnabledGuard } from "../guards/staff-leave-enabled.guard";
import { StaffLeaveService } from "../services/staff-leave.service";

@ApiTags("Stock Control - Staff Leave")
@Controller("stock-control/leave")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard, StaffLeaveEnabledGuard)
export class StaffLeaveController {
  constructor(private readonly staffLeaveService: StaffLeaveService) {}

  @Get()
  @ApiOperation({ summary: "Leave records for a given month" })
  async recordsForMonth(
    @Req() req: any,
    @Query("year", ParseIntPipe) year: number,
    @Query("month", ParseIntPipe) month: number,
  ) {
    const records = await this.staffLeaveService.recordsForMonth(req.user.companyId, year, month);
    return records.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user?.name ?? null,
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      sickNoteUrl: r.sickNoteUrl,
      sickNoteOriginalFilename: r.sickNoteOriginalFilename,
      notes: r.notes,
      createdAt: r.createdAt,
    }));
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Leave records for a specific user" })
  async recordsForUser(@Req() req: any, @Param("userId", ParseIntPipe) userId: number) {
    return this.staffLeaveService.recordsForUser(req.user.companyId, userId);
  }

  @Get("on-leave-today")
  @ApiOperation({ summary: "User IDs currently on leave" })
  async onLeaveToday(@Req() req: any) {
    const userIds = await this.staffLeaveService.usersOnLeaveToday(req.user.companyId);
    return { userIds };
  }

  @Post()
  @ApiOperation({ summary: "Record new leave" })
  async createRecord(@Req() req: any, @Body() dto: CreateLeaveDto) {
    return this.staffLeaveService.createRecord(req.user.companyId, req.user.id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete own leave record" })
  async deleteRecord(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    await this.staffLeaveService.deleteRecord(req.user.companyId, id, req.user.id);
    return { message: "Leave record deleted" };
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("staff.manage")
  @Delete(":id/admin")
  @ApiOperation({ summary: "Admin delete any leave record" })
  async adminDeleteRecord(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    await this.staffLeaveService.adminDeleteRecord(req.user.companyId, id);
    return { message: "Leave record deleted" };
  }

  @Post(":id/sick-note")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload sick note for a leave record" })
  async uploadSickNote(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.staffLeaveService.uploadSickNote(req.user.companyId, id, req.user.id, file);
  }

  @Get(":id/sick-note")
  @ApiOperation({ summary: "Presigned URL for sick note download" })
  async sickNoteUrl(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const url = await this.staffLeaveService.sickNotePresignedUrl(req.user.companyId, id);
    return { url };
  }
}
