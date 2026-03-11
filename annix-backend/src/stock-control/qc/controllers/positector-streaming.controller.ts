import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { Observable } from "rxjs";
import { nowISO } from "../../../lib/datetime";
import { StockControlAuthGuard } from "../../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../../guards/stock-control-role.guard";
import { DftCoatType } from "../entities/qc-dft-reading.entity";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import type { StreamingSessionConfig } from "../services/positector-streaming.service";
import { PositectorStreamingService } from "../services/positector-streaming.service";

@ApiTags("Stock Control - PosiTector Streaming")
@Controller("stock-control/positector-streaming")
export class PositectorStreamingController {
  private readonly logger = new Logger(PositectorStreamingController.name);

  constructor(private readonly streamingService: PositectorStreamingService) {}

  @Post("sessions")
  @UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Start or resume a live streaming session for a device" })
  startSession(
    @Req() req: any,
    @Body()
    body: {
      deviceId: number;
      jobCardId: number;
      entityType: "dft" | "blast_profile" | "shore_hardness";
      coatType?: string;
      paintProduct?: string;
      batchNumber?: string | null;
      specMinMicrons?: number;
      specMaxMicrons?: number;
      specMicrons?: number;
      rubberSpec?: string;
      rubberBatchNumber?: string | null;
      requiredShore?: number;
    },
  ) {
    const config: StreamingSessionConfig = {
      jobCardId: body.jobCardId,
      entityType: body.entityType,
      coatType:
        body.coatType === "final"
          ? DftCoatType.FINAL
          : body.coatType === "primer"
            ? DftCoatType.PRIMER
            : undefined,
      paintProduct: body.paintProduct,
      batchNumber: body.batchNumber ?? null,
      specMinMicrons: body.specMinMicrons,
      specMaxMicrons: body.specMaxMicrons,
      specMicrons: body.specMicrons,
      rubberSpec: body.rubberSpec,
      rubberBatchNumber: body.rubberBatchNumber ?? null,
      requiredShore: body.requiredShore,
    };

    const session = this.streamingService.startSession(
      req.user.companyId,
      body.deviceId,
      config,
      req.user,
    );

    const specLimits = this.streamingService.specLimitsForSession(session);

    return {
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      config: session.config,
      readingCount: session.readings.length,
      readings: session.readings,
      specLimits,
      startedAt: session.startedAt,
    };
  }

  @Get("sessions")
  @UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
  @ApiOperation({ summary: "List active streaming sessions for company" })
  activeSessions(@Req() req: any) {
    const sessions = this.streamingService.activeSessionsForCompany(req.user.companyId);
    return sessions.map((s) => ({
      sessionId: s.sessionId,
      deviceId: s.deviceId,
      config: s.config,
      readingCount: s.readings.length,
      startedAt: s.startedAt,
      startedByName: s.startedByName,
    }));
  }

  @Get("sessions/:sessionId")
  @UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
  @ApiOperation({ summary: "Get streaming session details" })
  sessionDetails(@Param("sessionId") sessionId: string) {
    const session = this.streamingService.findSessionById(sessionId);
    if (!session) {
      return { error: "Session not found" };
    }

    const specLimits = this.streamingService.specLimitsForSession(session);

    return {
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      config: session.config,
      readings: session.readings,
      readingCount: session.readings.length,
      specLimits,
      startedAt: session.startedAt,
      startedByName: session.startedByName,
    };
  }

  @Sse("sessions/:sessionId/events")
  @UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
  @ApiOperation({ summary: "Subscribe to live streaming events via SSE" })
  subscribeToSession(
    @Req() req: any,
    @Res() res: Response,
    @Param("sessionId") sessionId: string,
  ): Observable<MessageEvent> {
    this.logger.log(`User ${req.user.name} subscribed to streaming session ${sessionId}`);

    res.on("close", () => {
      this.logger.log(`User ${req.user.name} unsubscribed from streaming session ${sessionId}`);
    });

    return this.streamingService.subscribe(req.user.companyId, sessionId);
  }

  @Post("sessions/:sessionId/end")
  @UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "End a streaming session and save readings to QC entity" })
  async endSession(@Param("sessionId") sessionId: string) {
    const result = await this.streamingService.endSession(sessionId);
    if (!result) {
      return { error: "Session not found or already ended" };
    }
    return result;
  }

  @Delete("sessions/:sessionId")
  @UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Discard a streaming session without saving" })
  discardSession(@Param("sessionId") sessionId: string) {
    const discarded = this.streamingService.discardSession(sessionId);
    return { discarded };
  }

  @Get("webhook")
  @ApiOperation({
    summary: "Receive a streamed reading from PosiTector WiFi streaming (GET)",
    description:
      "PosiTector devices send HTTP GET requests with reading data as query parameters. " +
      "Configure the streaming URL on the device as: " +
      "http://<host>/stock-control/positector-streaming/webhook" +
      "?company=<id>&device=<id>&value=[thickness]&units=[units]" +
      "&probe=[probetype]&serial=[gagesn]",
  })
  receiveWebhookGet(
    @Query("company") companyId: string,
    @Query("device") deviceId: string,
    @Query("value") value: string,
    @Query("units") units: string | null,
    @Query("probe") probeType: string | null,
    @Query("serial") serialNumber: string | null,
  ) {
    return this.processWebhookReading(companyId, deviceId, value, units, probeType, serialNumber);
  }

  @Post("webhook")
  @ApiOperation({
    summary: "Receive a streamed reading from PosiTector WiFi streaming (POST)",
    description:
      "Fallback POST endpoint for devices or proxies that send POST requests. " +
      "Accepts the same query parameters as the GET endpoint, plus optional JSON body.",
  })
  receiveWebhookPost(
    @Query("company") companyId: string,
    @Query("device") deviceId: string,
    @Query("value") value: string,
    @Query("units") units: string | null,
    @Query("probe") probeType: string | null,
    @Query("serial") serialNumber: string | null,
    @Body() body: any,
  ) {
    return this.processWebhookReading(
      companyId,
      deviceId,
      value ?? body?.value,
      units ?? body?.units,
      probeType ?? body?.probeType,
      serialNumber ?? body?.serialNumber,
    );
  }

  private processWebhookReading(
    companyId: string,
    deviceId: string,
    value: string,
    units: string | null,
    probeType: string | null,
    serialNumber: string | null,
  ) {
    const parsedCompanyId = parseInt(companyId, 10);
    const parsedDeviceId = parseInt(deviceId, 10);

    if (Number.isNaN(parsedCompanyId) || Number.isNaN(parsedDeviceId)) {
      this.logger.warn(
        `Webhook received with invalid IDs: company=${companyId}, device=${deviceId}`,
      );
      return { received: false, error: "Invalid company or device ID" };
    }

    const parsedValue = parseFloat(value ?? "0");
    const readingValue = Number.isNaN(parsedValue) ? 0 : parsedValue;

    this.logger.log(
      `Webhook reading: company=${parsedCompanyId}, device=${parsedDeviceId}, ` +
        `value=${readingValue}, units=${units}, probe=${probeType}, serial=${serialNumber}`,
    );

    const received = this.streamingService.receiveWebhookReading(
      parsedCompanyId,
      parsedDeviceId,
      readingValue,
      units ?? null,
      probeType ?? null,
      serialNumber ?? null,
    );

    return { received };
  }

  @Post("webhook/generic")
  @ApiOperation({
    summary: "Receive readings via generic JSON POST body",
    description:
      "Alternative webhook that accepts JSON body with companyId, deviceId, value, etc. " +
      "Useful when query parameter configuration is not available on the device.",
  })
  receiveGenericWebhook(
    @Body()
    body: {
      companyId: number;
      deviceId: number;
      value: number;
      units?: string | null;
      probeType?: string | null;
      serialNumber?: string | null;
    },
  ) {
    const received = this.streamingService.receiveWebhookReading(
      body.companyId,
      body.deviceId,
      body.value,
      body.units ?? null,
      body.probeType ?? null,
      body.serialNumber ?? null,
    );

    return { received };
  }

  @Post("sessions/:sessionId/readings")
  @UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
  @ApiOperation({ summary: "Manually add a reading to an active streaming session" })
  addReading(
    @Param("sessionId") sessionId: string,
    @Body() body: { value: number; units?: string | null },
  ) {
    const session = this.streamingService.findSessionById(sessionId);
    if (!session) {
      return { error: "Session not found" };
    }

    const received = this.streamingService.receiveReading(sessionId, {
      value: body.value,
      units: body.units ?? null,
      probeType: null,
      serialNumber: null,
      timestamp: nowISO(),
    });

    return { received, readingCount: session.readings.length };
  }
}
