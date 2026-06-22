import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Response } from "express";
import { SeekerCalendarService } from "../services/seeker-calendar.service";

@Controller("public/annix-orbit/calendar")
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class PublicSeekerCalendarController {
  constructor(private readonly seekerCalendarService: SeekerCalendarService) {}

  @Get(":token")
  async feed(
    @Param("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const raw = token.endsWith(".ics") ? token.slice(0, -4) : token;
    const ics = await this.seekerCalendarService.icsForToken(raw);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="annix-orbit-interviews.ics"');
    res.end(ics);
  }
}
