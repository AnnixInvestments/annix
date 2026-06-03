import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { SeekerCalendarService } from "../services/seeker-calendar.service";

@Controller("public/annix-orbit/calendar")
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
