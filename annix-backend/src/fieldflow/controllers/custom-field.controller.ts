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
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import { CreateCustomFieldDto, CustomFieldResponseDto, UpdateCustomFieldDto } from "../dto";
import { CustomFieldService } from "../services";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Custom Fields")
@Controller("annix-rep/custom-fields")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class CustomFieldController {
  constructor(private readonly customFieldService: CustomFieldService) {}

  @Post()
  @ApiOperation({ summary: "Create a new custom field definition" })
  @ApiResponse({ status: 201, description: "Custom field created", type: CustomFieldResponseDto })
  @ApiResponse({ status: 409, description: "Field key already exists" })
  create(@Req() req: AnnixRepRequest, @Body() dto: CreateCustomFieldDto) {
    return this.customFieldService.create(req.annixRepUser.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all custom field definitions" })
  @ApiQuery({ name: "includeInactive", required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: "List of custom fields",
    type: [CustomFieldResponseDto],
  })
  findAll(@Req() req: AnnixRepRequest, @Query("includeInactive") includeInactive?: string) {
    return this.customFieldService.findAll(req.annixRepUser.userId, includeInactive === "true");
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a custom field by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Custom field details", type: CustomFieldResponseDto })
  @ApiResponse({ status: 404, description: "Custom field not found" })
  findOne(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.customFieldService.findOne(req.annixRepUser.userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a custom field" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Custom field updated", type: CustomFieldResponseDto })
  @ApiResponse({ status: 404, description: "Custom field not found" })
  @ApiResponse({ status: 409, description: "Field key already exists" })
  update(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.customFieldService.update(req.annixRepUser.userId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a custom field" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Custom field deleted" })
  @ApiResponse({ status: 404, description: "Custom field not found" })
  remove(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.customFieldService.remove(req.annixRepUser.userId, id);
  }

  @Post("reorder")
  @ApiOperation({ summary: "Reorder custom fields" })
  @ApiResponse({
    status: 200,
    description: "Fields reordered",
    type: [CustomFieldResponseDto],
  })
  reorder(@Req() req: AnnixRepRequest, @Body() dto: { orderedIds: number[] }) {
    return this.customFieldService.reorder(req.annixRepUser.userId, dto.orderedIds);
  }
}
