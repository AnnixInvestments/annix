import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CertificateService } from "./certificate.service";
import { CertificateFilterDto } from "./dto/certificate.dto";
import { PlatformCompanyAuthGuard } from "./platform-company-auth.guard";

@ApiTags("Certificates (Unified)")
@UseGuards(PlatformCompanyAuthGuard)
@ApiBearerAuth()
@Controller("platform/companies/:companyId/certificates")
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get()
  @ApiOperation({ summary: "Search certificates with filters and pagination" })
  @ApiParam({ name: "companyId", type: Number })
  search(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query() filters: CertificateFilterDto,
  ) {
    return this.certificateService.search(companyId, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get certificate by ID" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  findOne(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.certificateService.findById(companyId, id);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve certificate" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  approve(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.certificateService.approve(companyId, id, "system");
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete certificate" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  remove(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.certificateService.remove(companyId, id);
  }
}
