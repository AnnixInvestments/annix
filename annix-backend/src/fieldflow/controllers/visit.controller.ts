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
import { FieldFlowAuthGuard } from "../auth";
import { CheckInDto, CheckOutDto, CreateVisitDto, UpdateVisitDto, VisitResponseDto } from "../dto";
import { VisitService } from "../services";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Visits")
@Controller("fieldflow/visits")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  @ApiOperation({ summary: "Create a new visit" })
  @ApiResponse({ status: 201, description: "Visit created", type: VisitResponseDto })
  create(@Req() req: FieldFlowRequest, @Body() dto: CreateVisitDto) {
    return this.visitService.create(req.fieldflowUser.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all visits for current user" })
  @ApiResponse({ status: 200, description: "List of visits", type: [VisitResponseDto] })
  findAll(@Req() req: FieldFlowRequest) {
    return this.visitService.findAll(req.fieldflowUser.userId);
  }

  @Get("today")
  @ApiOperation({ summary: "Get today's scheduled visits" })
  @ApiResponse({ status: 200, description: "Today's visits", type: [VisitResponseDto] })
  todaysSchedule(@Req() req: FieldFlowRequest) {
    return this.visitService.todaysSchedule(req.fieldflowUser.userId);
  }

  @Get("active")
  @ApiOperation({ summary: "Get currently active visit" })
  @ApiResponse({ status: 200, description: "Active visit or null", type: VisitResponseDto })
  activeVisit(@Req() req: FieldFlowRequest) {
    return this.visitService.activeVisit(req.fieldflowUser.userId);
  }

  @Get("prospect/:prospectId")
  @ApiOperation({ summary: "Get visits for a specific prospect" })
  @ApiParam({ name: "prospectId", type: Number })
  @ApiResponse({ status: 200, description: "List of visits", type: [VisitResponseDto] })
  findByProspect(@Param("prospectId", ParseIntPipe) prospectId: number) {
    return this.visitService.findByProspect(prospectId);
  }

  @Get("range")
  @ApiOperation({ summary: "Get visits in date range" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiResponse({ status: 200, description: "List of visits", type: [VisitResponseDto] })
  findByDateRange(
    @Req() req: FieldFlowRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.visitService.findByDateRange(
      req.fieldflowUser.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a visit by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Visit details", type: VisitResponseDto })
  @ApiResponse({ status: 404, description: "Visit not found" })
  findOne(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.visitService.findOne(req.fieldflowUser.userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a visit" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Visit updated", type: VisitResponseDto })
  @ApiResponse({ status: 404, description: "Visit not found" })
  update(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateVisitDto,
  ) {
    return this.visitService.update(req.fieldflowUser.userId, id, dto);
  }

  @Post(":id/check-in")
  @ApiOperation({ summary: "Check in to a visit" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Checked in", type: VisitResponseDto })
  @ApiResponse({ status: 400, description: "Already checked in" })
  checkIn(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CheckInDto,
  ) {
    return this.visitService.checkIn(req.fieldflowUser.userId, id, dto);
  }

  @Post(":id/check-out")
  @ApiOperation({ summary: "Check out from a visit" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Checked out", type: VisitResponseDto })
  @ApiResponse({ status: 400, description: "Not checked in or already checked out" })
  checkOut(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CheckOutDto,
  ) {
    return this.visitService.checkOut(req.fieldflowUser.userId, id, dto);
  }

  @Post("cold-call")
  @ApiOperation({ summary: "Start a cold call visit" })
  @ApiQuery({ name: "prospectId", type: Number, required: true })
  @ApiQuery({ name: "latitude", type: Number, required: true })
  @ApiQuery({ name: "longitude", type: Number, required: true })
  @ApiResponse({ status: 201, description: "Cold call visit started", type: VisitResponseDto })
  startColdCall(
    @Req() req: FieldFlowRequest,
    @Query("prospectId", ParseIntPipe) prospectId: number,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
  ) {
    return this.visitService.startColdCall(
      req.fieldflowUser.userId,
      prospectId,
      parseFloat(latitude),
      parseFloat(longitude),
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a visit" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Visit deleted" })
  @ApiResponse({ status: 404, description: "Visit not found" })
  remove(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.visitService.remove(req.fieldflowUser.userId, id);
  }
}
