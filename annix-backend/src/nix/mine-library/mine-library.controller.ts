import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AnyUserAuthGuard } from "../../auth/guards/any-user-auth.guard";
import {
  CreateMineDto,
  type CreateMineResponseDto,
  type DocNumberSearchRowDto,
  type MineExtractionRowDto,
  type MineSummaryDto,
  RetagExtractionDto,
} from "./dto/mine-library.dto";
import { MineLibraryService } from "./mine-library.service";

@ApiTags("Nix Mine Library")
@Controller("nix/mine-library")
@UseGuards(AnyUserAuthGuard)
@ApiBearerAuth()
export class MineLibraryController {
  constructor(private readonly mineLibraryService: MineLibraryService) {}

  @Get("mines")
  @ApiOperation({
    summary:
      "List mines that have at least one Nix extraction tagged to them, or fuzzy-search the SaMine reference table when ?q is provided.",
  })
  async listMines(@Query("q") q?: string): Promise<MineSummaryDto[]> {
    const trimmed = (q ?? "").trim();
    if (trimmed.length === 0) {
      return this.mineLibraryService.listMinesWithExtractions();
    }
    return this.mineLibraryService.listMines(trimmed);
  }

  @Get("mines/:id/extractions")
  @ApiOperation({ summary: "List every Nix extraction currently tagged to a mine." })
  @ApiResponse({ status: 200, type: Array })
  async listExtractionsForMine(
    @Param("id", ParseIntPipe) mineId: number,
  ): Promise<MineExtractionRowDto[]> {
    return this.mineLibraryService.listExtractionsForMine(mineId);
  }

  @Get("extractions/by-doc-number")
  @ApiOperation({
    summary: "Doc-number prefix search across all extractions, optionally restricted to a mine.",
  })
  async searchByDocNumber(
    @Query("q") q: string,
    @Query("mineId") mineIdRaw?: string,
    @Query("limit") limitRaw?: string,
  ): Promise<DocNumberSearchRowDto[]> {
    const trimmed = (q ?? "").trim();
    if (trimmed.length < 2) {
      throw new BadRequestException("Query string must be at least 2 characters");
    }
    const mineId = mineIdRaw ? Number.parseInt(mineIdRaw, 10) : null;
    if (mineIdRaw && Number.isNaN(mineId)) {
      throw new BadRequestException("mineId must be a number");
    }
    const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
    const limit = Number.isNaN(limitParsed) ? 10 : Math.min(50, Math.max(1, limitParsed));
    return this.mineLibraryService.searchByDocNumber(
      trimmed,
      mineId !== null && !Number.isNaN(mineId) ? mineId : null,
      limit,
    );
  }

  @Post("mines")
  @ApiOperation({
    summary:
      "Create a new mine in the SaMine reference table when MineInferenceService can't match an extraction's metadata. Optionally retag a specific extraction against the new mine in the same call.",
  })
  async createMine(@Body() dto: CreateMineDto): Promise<CreateMineResponseDto> {
    return this.mineLibraryService.createMine(dto);
  }

  @Patch("extractions/:id/mine")
  @ApiOperation({ summary: "Manually retag an extraction against a different mine." })
  async retagExtraction(
    @Param("id", ParseIntPipe) extractionId: number,
    @Body() dto: RetagExtractionDto,
  ): Promise<MineExtractionRowDto> {
    return this.mineLibraryService.retagExtraction(extractionId, dto.mineId);
  }

  @Delete("extractions/:id/mine")
  @ApiOperation({ summary: "Clear an extraction's mine tag (manual override → null)." })
  async clearMine(@Param("id", ParseIntPipe) extractionId: number): Promise<{ ok: true }> {
    await this.mineLibraryService.clearMine(extractionId);
    return { ok: true };
  }
}
