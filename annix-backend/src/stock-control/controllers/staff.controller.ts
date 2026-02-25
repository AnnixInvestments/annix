import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { StaffService } from "../services/staff.service";

@ApiTags("Stock Control - Staff")
@Controller("stock-control/staff")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: "List staff members with optional filters" })
  async list(@Req() req: any, @Query("search") search?: string, @Query("active") active?: string) {
    return this.staffService.findAll(req.user.companyId, { search, active });
  }

  @Get(":id")
  @ApiOperation({ summary: "Staff member by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.staffService.findById(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Post()
  @ApiOperation({ summary: "Create a staff member" })
  async create(@Req() req: any, @Body() body: any) {
    return this.staffService.create(req.user.companyId, body);
  }

  @StockControlRoles("manager", "admin")
  @Put(":id")
  @ApiOperation({ summary: "Update a staff member" })
  async update(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.staffService.update(req.user.companyId, id, body);
  }

  @StockControlRoles("manager", "admin")
  @Delete(":id")
  @ApiOperation({ summary: "Deactivate a staff member" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.staffService.softDelete(req.user.companyId, id);
  }

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a photo for a staff member" })
  async uploadPhoto(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.staffService.uploadPhoto(req.user.companyId, id, file);
  }
}
