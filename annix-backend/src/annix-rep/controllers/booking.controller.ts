import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import {
  BookingLinkResponseDto,
  CreateBookingLinkDto,
  UpdateBookingLinkDto,
} from "../dto/booking.dto";
import { BookingService } from "../services/booking.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Booking Links")
@Controller("annix-rep/booking-links")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: "Create a new booking link" })
  @ApiResponse({ status: 201, description: "Booking link created", type: BookingLinkResponseDto })
  async create(
    @Req() req: AnnixRepRequest,
    @Body() dto: CreateBookingLinkDto,
  ): Promise<BookingLinkResponseDto> {
    const link = await this.bookingService.createLink(req.annixRepUser.userId, dto);
    return this.toResponseDto(link);
  }

  @Get()
  @ApiOperation({ summary: "Get all booking links for current user" })
  @ApiResponse({
    status: 200,
    description: "List of booking links",
    type: [BookingLinkResponseDto],
  })
  async list(@Req() req: AnnixRepRequest): Promise<BookingLinkResponseDto[]> {
    const links = await this.bookingService.userLinks(req.annixRepUser.userId);
    return links.map((link) => this.toResponseDto(link));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a booking link by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Booking link details", type: BookingLinkResponseDto })
  @ApiResponse({ status: 404, description: "Booking link not found" })
  async detail(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<BookingLinkResponseDto> {
    const link = await this.bookingService.linkById(req.annixRepUser.userId, id);
    return this.toResponseDto(link);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a booking link" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Booking link updated", type: BookingLinkResponseDto })
  @ApiResponse({ status: 404, description: "Booking link not found" })
  async update(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateBookingLinkDto,
  ): Promise<BookingLinkResponseDto> {
    const link = await this.bookingService.updateLink(req.annixRepUser.userId, id, dto);
    return this.toResponseDto(link);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a booking link" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Booking link deleted" })
  @ApiResponse({ status: 404, description: "Booking link not found" })
  async delete(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.bookingService.deleteLink(req.annixRepUser.userId, id);
  }

  private toResponseDto(link: any): BookingLinkResponseDto {
    return {
      id: link.id,
      userId: link.userId,
      slug: link.slug,
      name: link.name,
      meetingDurationMinutes: link.meetingDurationMinutes,
      bufferBeforeMinutes: link.bufferBeforeMinutes,
      bufferAfterMinutes: link.bufferAfterMinutes,
      availableDays: link.availableDays,
      availableStartHour: link.availableStartHour,
      availableEndHour: link.availableEndHour,
      maxDaysAhead: link.maxDaysAhead,
      isActive: link.isActive,
      customQuestions: link.customQuestions,
      meetingType: link.meetingType,
      location: link.location,
      description: link.description,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      bookingUrl: `/book/${link.slug}`,
    };
  }
}
