import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  AvailableSlotDto,
  BookingConfirmationDto,
  BookSlotDto,
  PublicBookingLinkDto,
} from "../dto/booking.dto";
import { BookingService } from "../services/booking.service";

@ApiTags("Public - Booking")
@Controller("public/booking")
export class PublicBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get(":slug")
  @ApiOperation({ summary: "Get public booking link details" })
  @ApiParam({ name: "slug", type: String, description: "Booking link slug (UUID)" })
  @ApiResponse({ status: 200, description: "Booking link details", type: PublicBookingLinkDto })
  @ApiResponse({ status: 404, description: "Booking link not found or inactive" })
  linkDetails(@Param("slug") slug: string): Promise<PublicBookingLinkDto> {
    return this.bookingService.publicLinkDetails(slug);
  }

  @Get(":slug/availability")
  @ApiOperation({ summary: "Get available time slots for a specific date" })
  @ApiParam({ name: "slug", type: String, description: "Booking link slug (UUID)" })
  @ApiQuery({ name: "date", type: String, description: "Date in YYYY-MM-DD format" })
  @ApiResponse({ status: 200, description: "Available slots", type: [AvailableSlotDto] })
  @ApiResponse({ status: 404, description: "Booking link not found or inactive" })
  availability(
    @Param("slug") slug: string,
    @Query("date") date: string,
  ): Promise<AvailableSlotDto[]> {
    return this.bookingService.availableSlots(slug, date);
  }

  @Post(":slug/book")
  @ApiOperation({ summary: "Book a time slot" })
  @ApiParam({ name: "slug", type: String, description: "Booking link slug (UUID)" })
  @ApiResponse({ status: 201, description: "Booking confirmed", type: BookingConfirmationDto })
  @ApiResponse({ status: 400, description: "Time slot no longer available" })
  @ApiResponse({ status: 404, description: "Booking link not found or inactive" })
  bookSlot(@Param("slug") slug: string, @Body() dto: BookSlotDto): Promise<BookingConfirmationDto> {
    return this.bookingService.bookSlot(slug, dto);
  }
}
