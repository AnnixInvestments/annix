import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/public.decorator";
import { InspectionBookingService } from "../services/inspection-booking.service";

interface ProposeBody {
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  note?: string | null;
}

@ApiTags("Stock Control - Public Inspection Response")
@Controller("stock-control/public/inspection-bookings")
export class InspectionPublicController {
  constructor(private readonly inspectionBookingService: InspectionBookingService) {}

  @Public()
  @Get(":token")
  @ApiOperation({ summary: "Booking details via public response token (no auth)" })
  async details(@Param("token") token: string) {
    return this.inspectionBookingService.bookingByToken(token);
  }

  @Public()
  @Post(":token/accept")
  @ApiOperation({ summary: "Inspector accepts the booked slot" })
  async accept(@Param("token") token: string) {
    return this.inspectionBookingService.respondAccept(token);
  }

  @Public()
  @Post(":token/propose")
  @ApiOperation({ summary: "Inspector proposes an alternative slot" })
  async propose(@Param("token") token: string, @Body() body: ProposeBody) {
    return this.inspectionBookingService.respondPropose(token, {
      proposedDate: body.proposedDate,
      proposedStartTime: body.proposedStartTime,
      proposedEndTime: body.proposedEndTime,
      note: body.note || null,
    });
  }
}
