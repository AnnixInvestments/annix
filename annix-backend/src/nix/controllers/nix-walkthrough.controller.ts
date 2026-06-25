import { Body, Controller, Param, ParseIntPipe, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { AnyUserAuthGuard, AuthenticatedUser } from "../../auth/guards/any-user-auth.guard";
import { WalkthroughEngine, type WalkthroughStepView } from "../capabilities";
import type {
  NixSessionOwner,
  WalkthroughEndReason,
  WalkthroughState,
} from "../entities/nix-chat-session.entity";

class StartWalkthroughDto {
  @IsString()
  @MinLength(1)
  capabilityKey!: string;
}

class StopWalkthroughDto {
  @IsString()
  @MinLength(1)
  reason?: WalkthroughEndReason;
}

@ApiTags("nix")
@ApiBearerAuth()
@UseGuards(AnyUserAuthGuard)
@Controller("nix/walkthrough")
export class NixWalkthroughController {
  constructor(private readonly engine: WalkthroughEngine) {}

  private owner(req: { authUser: AuthenticatedUser }): NixSessionOwner {
    return { userId: req.authUser.userId, appScope: req.authUser.type };
  }

  @Post(":sessionId/start")
  @ApiOperation({ summary: "Start a walkthrough on a chat session for a registered capability" })
  @ApiResponse({ status: 201, description: "Returns the first step view" })
  start(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() dto: StartWalkthroughDto,
    @Request() req,
  ): Promise<WalkthroughStepView> {
    return this.engine.start(sessionId, this.owner(req), dto.capabilityKey);
  }

  @Post(":sessionId/advance")
  @ApiOperation({
    summary: "Advance to the next step. Returns null when the walkthrough completes.",
  })
  advance(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Request() req,
  ): Promise<WalkthroughStepView | null> {
    return this.engine.advance(sessionId, this.owner(req));
  }

  @Post(":sessionId/back")
  @ApiOperation({ summary: "Move to the previous step. Clamps at step 1." })
  back(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Request() req,
  ): Promise<WalkthroughStepView | null> {
    return this.engine.back(sessionId, this.owner(req));
  }

  @Post(":sessionId/skip")
  @ApiOperation({ summary: "Skip the current step (advance with 'skipped' history action)." })
  skip(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Request() req,
  ): Promise<WalkthroughStepView | null> {
    return this.engine.skip(sessionId, this.owner(req));
  }

  @Post(":sessionId/stop")
  @ApiOperation({ summary: "Stop the walkthrough. Reasons: stopped (default) | abandoned." })
  async stop(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() dto: StopWalkthroughDto,
    @Request() req,
  ): Promise<{ ok: true }> {
    await this.engine.stop(sessionId, this.owner(req), dto.reason ?? "stopped");
    return { ok: true };
  }

  @Post(":sessionId/state")
  @ApiOperation({ summary: "Return the current walkthrough state on a session." })
  state(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Request() req,
  ): Promise<WalkthroughState | null> {
    return this.engine.state(sessionId, this.owner(req));
  }

  @Post(":sessionId/current-step")
  @ApiOperation({ summary: "Return the current step view." })
  currentStep(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Request() req,
  ): Promise<WalkthroughStepView | null> {
    return this.engine.currentStepView(sessionId, this.owner(req));
  }
}
