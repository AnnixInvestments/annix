import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { CompanyRepository } from "../../platform/company.repository";
import { Company, CompanyType } from "../../platform/entities/company.entity";
import { CreateCustomerDto, UpdateCustomerDto } from "../dto/customer.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";

/**
 * Lightweight DTO returned by the customer picker — only the fields the
 * QuoteSpecsEditor / customer card needs to render and to copy into the
 * quote's customer_snapshot. The full Company entity carries a lot of
 * tenant-only fields (branding, smtp, BEE) that aren't relevant when a
 * row is acting as a quote customer.
 */
export interface QuoteCustomerDto {
  id: number;
  name: string;
  customerCode: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
}

/**
 * Stock Control quote customers — backed by the platform-wide `companies`
 * table filtered to `companyType = CUSTOMER`. The quoter's "+ New customer"
 * inline form on the promoted-quote page posts here when they tick "Save
 * for future use"; the autocomplete dropdown reads from the GET.
 *
 * Tenant scoping: rows created through this controller are stamped with
 * `ownerCompanyId = req.user.companyId`, and every read/write is scoped to
 * the caller's tenant OR to legacy un-attributed rows (`ownerCompanyId`
 * null/absent) so the pre-existing shared pool stays visible to its
 * legitimate owners. New writes are tenant-private from creation.
 */
@ApiTags("Stock Control - Customers")
@UseGuards(StockControlAuthGuard, StockControlOnboardingGuard, StockControlRoleGuard)
@Controller("stock-control/customers")
export class StockControlCustomersController {
  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @StockControlRoles("viewer")
  @ApiOperation({
    summary:
      "List customer companies for the picker. Optional ?q= filters by name prefix (case-insensitive). Capped at 50 rows. Scoped to the caller's tenant plus legacy un-attributed rows.",
  })
  async list(@Req() req: any, @Query("q") q?: string): Promise<QuoteCustomerDto[]> {
    const trimmed = (q ?? "").trim();
    const namePattern = trimmed.length > 0 ? `%${trimmed}%` : null;
    const rows = await this.companyRepo.findByTypeAndNameLike(
      CompanyType.CUSTOMER,
      namePattern,
      50,
      req.user.companyId,
    );
    return rows.map(toDto);
  }

  @Get(":id")
  @StockControlRoles("viewer")
  @ApiOperation({
    summary:
      "Fetch a single customer company by id. Used by the CustomerCard to live-render the LATEST master details — so when the quoter enriches the master row later, every working quote that references this customer reflects the new fields without a re-pick.",
  })
  async findOne(@Req() req: any, @Param("id", ParseIntPipe) id: number): Promise<QuoteCustomerDto> {
    const row = await this.companyRepo.findOneByIdAndType(
      id,
      CompanyType.CUSTOMER,
      req.user.companyId,
    );
    if (!row) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return toDto(row);
  }

  @Patch(":id")
  @StockControlRoles("accounts", "manager", "admin")
  @ApiOperation({
    summary:
      "Update a customer company. Used by the CustomerCard's 'Edit details' affordance to enrich a row that was originally saved with only a name. Every working quote that references this companyId will re-render with the new details on next load (live-render).",
  })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateCustomerDto,
  ): Promise<QuoteCustomerDto> {
    const row = await this.companyRepo.findOneByIdAndType(
      id,
      CompanyType.CUSTOMER,
      req.user.companyId,
    );
    if (!row) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException("Customer name cannot be empty");
      }
      row.name = trimmed;
    }
    if (body.customerCode !== undefined) row.customerCode = body.customerCode;
    if (body.contactPerson !== undefined) row.contactPerson = body.contactPerson;
    if (body.email !== undefined) row.email = body.email;
    if (body.phone !== undefined) row.phone = body.phone;
    if (body.vatNumber !== undefined) row.vatNumber = body.vatNumber;
    if (body.registrationNumber !== undefined) row.registrationNumber = body.registrationNumber;
    if (body.streetAddress !== undefined) row.streetAddress = body.streetAddress;
    if (body.city !== undefined) row.city = body.city;
    if (body.province !== undefined) row.province = body.province;
    if (body.postalCode !== undefined) row.postalCode = body.postalCode;
    if (body.country !== undefined && body.country !== null && body.country.length > 0) {
      row.country = body.country;
    }
    const saved = await this.companyRepo.save(row);

    this.auditService
      .log({
        entityType: "stock_control_customer",
        entityId: saved.id,
        action: AuditAction.UPDATE,
        newValues: {
          companyId: req.user.companyId,
          userId: req.user.id ?? null,
          name: saved.name,
          customerCode: saved.customerCode,
        },
      })
      .catch(() => null);

    return toDto(saved);
  }

  @Post()
  @StockControlRoles("accounts", "manager", "admin")
  @ApiOperation({
    summary:
      "Create a customer company. Inserted with companyType = CUSTOMER and ownerCompanyId = caller's tenant, so it shows up in the picker for that tenant's future quotes. Used by the 'Save for future use' tick on the inline new-customer form.",
  })
  async create(@Req() req: any, @Body() body: CreateCustomerDto): Promise<QuoteCustomerDto> {
    const name = body.name ? body.name.trim() : "";
    if (name.length === 0) {
      throw new BadRequestException("Customer name is required");
    }
    const row = this.companyRepo.build({
      name,
      companyType: CompanyType.CUSTOMER,
      ownerCompanyId: req.user.companyId,
      customerCode: body.customerCode ?? null,
      contactPerson: body.contactPerson ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      vatNumber: body.vatNumber ?? null,
      registrationNumber: body.registrationNumber ?? null,
      streetAddress: body.streetAddress ?? null,
      city: body.city ?? null,
      province: body.province ?? null,
      postalCode: body.postalCode ?? null,
      country: body.country && body.country.length > 0 ? body.country : "South Africa",
    });
    const saved = await this.companyRepo.save(row);

    this.auditService
      .log({
        entityType: "stock_control_customer",
        entityId: saved.id,
        action: AuditAction.CREATE,
        newValues: {
          companyId: req.user.companyId,
          userId: req.user.id ?? null,
          name: saved.name,
          customerCode: saved.customerCode,
        },
      })
      .catch(() => null);

    return toDto(saved);
  }
}

function toDto(row: Company): QuoteCustomerDto {
  return {
    id: row.id,
    name: row.name,
    customerCode: row.customerCode,
    contactPerson: row.contactPerson,
    email: row.email,
    phone: row.phone,
    vatNumber: row.vatNumber,
    registrationNumber: row.registrationNumber,
    streetAddress: row.streetAddress,
    city: row.city,
    province: row.province,
    postalCode: row.postalCode,
    country: row.country,
  };
}
