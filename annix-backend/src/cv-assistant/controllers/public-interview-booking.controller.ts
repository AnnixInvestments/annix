import { Controller, Get, NotFoundException, Param, ParseIntPipe, Post } from "@nestjs/common";
import { InterviewBookingService } from "../services/interview-booking.service";

@Controller("public/cv-assistant/interview-booking")
export class PublicInterviewBookingController {
  constructor(private readonly bookings: InterviewBookingService) {}

  @Get(":token")
  async lookup(@Param("token") token: string) {
    if (!token) throw new NotFoundException("Token is required");
    const result = await this.bookings.lookupByToken(token);
    return {
      candidate: {
        name: result.candidate.name,
        email: result.candidate.email,
      },
      job: {
        id: result.job.id,
        title: result.job.title,
        location: result.job.location,
        province: result.job.province,
      },
      currentBooking: result.currentBooking
        ? {
            id: result.currentBooking.id,
            slotId: result.currentBooking.slotId,
            bookedAt: result.currentBooking.bookedAt,
          }
        : null,
      slots: result.slots.map((slot) => {
        const activeBookings = (slot.bookings ?? []).filter((b) => b.status === "booked");
        return {
          id: slot.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          locationLabel: slot.locationLabel,
          locationAddress: slot.locationAddress,
          locationLat: slot.locationLat,
          locationLng: slot.locationLng,
          capacity: slot.capacity,
          notes: slot.notes,
          available: activeBookings.length < slot.capacity,
        };
      }),
      expiresAt: result.invite.expiresAt,
    };
  }

  @Post(":token/book/:slotId")
  async book(@Param("token") token: string, @Param("slotId", ParseIntPipe) slotId: number) {
    const booking = await this.bookings.bookByToken(token, slotId);
    return { id: booking.id, slotId: booking.slotId, status: booking.status };
  }

  @Post(":token/cancel/:bookingId")
  async cancel(@Param("token") token: string, @Param("bookingId", ParseIntPipe) bookingId: number) {
    return this.bookings.cancelByToken(token, bookingId);
  }
}
