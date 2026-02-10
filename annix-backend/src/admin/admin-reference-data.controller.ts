import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminReferenceDataService } from "./admin-reference-data.service";
import {
  EntitySchemaResponse,
  PaginatedReferenceDataResponse,
  ReferenceDataModuleInfo,
  ReferenceDataQueryDto,
} from "./dto/admin-reference-data.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin Reference Data")
@Controller("admin/reference-data")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth()
export class AdminReferenceDataController {
  constructor(private readonly referenceDataService: AdminReferenceDataService) {}

  @Get("modules")
  @ApiOperation({ summary: "List all reference data modules with metadata" })
  @ApiResponse({ status: 200, type: [ReferenceDataModuleInfo] })
  async modules(): Promise<ReferenceDataModuleInfo[]> {
    return this.referenceDataService.registeredModules();
  }

  @Get("modules/:entityName/schema")
  @ApiOperation({ summary: "Get column and relation schema for an entity" })
  @ApiResponse({ status: 200, type: EntitySchemaResponse })
  async schema(@Param("entityName") entityName: string): Promise<EntitySchemaResponse> {
    return this.referenceDataService.entitySchema(entityName);
  }

  @Get("modules/:entityName")
  @ApiOperation({ summary: "Get paginated records for a reference data entity" })
  @ApiResponse({ status: 200, type: PaginatedReferenceDataResponse })
  async records(
    @Param("entityName") entityName: string,
    @Query() query: ReferenceDataQueryDto,
  ): Promise<PaginatedReferenceDataResponse> {
    return this.referenceDataService.records(entityName, query);
  }

  @Get("modules/:entityName/:id")
  @ApiOperation({ summary: "Get a single reference data record" })
  async record(
    @Param("entityName") entityName: string,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<Record<string, any>> {
    return this.referenceDataService.record(entityName, id);
  }

  @Post("modules/:entityName")
  @ApiOperation({ summary: "Create a new reference data record" })
  async createRecord(
    @Param("entityName") entityName: string,
    @Body() data: Record<string, any>,
  ): Promise<Record<string, any>> {
    return this.referenceDataService.createRecord(entityName, data);
  }

  @Patch("modules/:entityName/:id")
  @ApiOperation({ summary: "Update a reference data record" })
  async updateRecord(
    @Param("entityName") entityName: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() data: Record<string, any>,
  ): Promise<Record<string, any>> {
    return this.referenceDataService.updateRecord(entityName, id, data);
  }

  @Delete("modules/:entityName/:id")
  @ApiOperation({ summary: "Delete a reference data record" })
  async deleteRecord(
    @Param("entityName") entityName: string,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ success: boolean; message: string }> {
    return this.referenceDataService.deleteRecord(entityName, id);
  }
}
