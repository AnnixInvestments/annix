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
import { CheckInDto, CheckOutDto, CreateVisitDto, UpdateVisitDto, VisitResponseDto } from "../dto";
import { VisitService } from "../services";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Visits")
@Controller("annix-rep/visits")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  @ApiOperation({ summary: "Create a new visit" })
  @ApiResponse({ status: 201, description: "Visit created", type: VisitResponseDto })
  create(@Req() req: AnnixRepRequest, @Body() dto: CreateVisitDto) {
    return this.visitService.create(req.annixRepUser.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all visits for current user" })
  @ApiResponse({ status: 200, description: "List of visits", type: [VisitResponseDto] })
  findAll(@Req() req: AnnixRepRequest) {
    return this.visitService.findAll(req.annixRepUser.userId);
  }

  @Get("today")
  @ApiOperation({ summary: "Get today's scheduled visits" })
  @ApiResponse({ status: 200, description: "Today's visits", type: [VisitResponseDto] })
  todaysSchedule(@Req() req: AnnixRepRequest) {
    return this.visitService.todaysSchedule(req.annixRepUser.userId);
  }

  @Get("active")
  @ApiOperation({ summary: "Get currently active visit" })
  @ApiResponse({ status: 200, description: "Active visit or null", type: VisitResponseDto })
  activeVisit(@Req() req: AnnixRepRequest) {
    return this.visitService.activeVisit(req.annixRepUser.userId);
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
    @Req() req: AnnixRepRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.visitService.findByDateRange(
      req.annixRepUser.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a visit by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Visit details", type: VisitResponseDto })
  @ApiResponse({ status: 404, description: "Visit not found" })
  findOne(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.visitService.findOne(req.annixRepUser.userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a visit" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Visit updated", type: VisitResponseDto })
  @ApiResponse({ status: 404, description: "Visit not found" })
  update(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateVisitDto,
  ) {
    return this.visitService.update(req.annixRepUser.userId, id, dto);
  }

  @Post(":id/check-in")
  @ApiOperation({ summary: "Check in to a visit" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Checked in", type: VisitResponseDto })
  @ApiResponse({ status: 400, description: "Already checked in" })
  checkIn(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CheckInDto,
  ) {
    return this.visitService.checkIn(req.annixRepUser.userId, id, dto);
  }

  @Post(":id/check-out")
  @ApiOperation({ summary: "Check out from a visit" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Checked out", type: VisitResponseDto })
  @ApiResponse({ status: 400, description: "Not checked in or already checked out" })
  checkOut(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CheckOutDto,
  ) {
    return this.visitService.checkOut(req.annixRepUser.userId, id, dto);
  }

  @Post("cold-call")
  @ApiOperation({ summary: "Start a cold call visit" })
  @ApiQuery({ name: "prospectId", type: Number, required: true })
  @ApiQuery({ name: "latitude", type: Number, required: true })
  @ApiQuery({ name: "longitude", type: Number, required: true })
  @ApiResponse({ status: 201, description: "Cold call visit started", type: VisitResponseDto })
  startColdCall(
    @Req() req: AnnixRepRequest,
    @Query("prospectId", ParseIntPipe) prospectId: number,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
  ) {
    return this.visitService.startColdCall(
      req.annixRepUser.userId,
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
  remove(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.visitService.remove(req.annixRepUser.userId, id);
  }
}
