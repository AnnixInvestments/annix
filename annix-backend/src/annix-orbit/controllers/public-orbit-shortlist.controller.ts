import { Controller, Get, Param, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Response } from "express";
import { AnnixOrbitShortlistDeliveryService } from "../services/annix-orbit-shortlist-delivery.service";

// Tokenised read-only client view of a shortlist (issue #337). The token is a
// uuid minted per shortlist and revocable by the agency; the page shows only
// consented candidates and no contact details.
@ApiExcludeController()
@Controller("public/orbit-shortlists")
export class PublicOrbitShortlistController {
  constructor(private readonly deliveryService: AnnixOrbitShortlistDeliveryService) {}

  @Get(":token")
  async view(@Param("token") token: string, @Res() res: Response) {
    const html = await this.deliveryService.publicHtmlByToken(token);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }
}
