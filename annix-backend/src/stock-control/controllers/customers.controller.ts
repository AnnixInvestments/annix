import {
  BadRequestException,
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { Company, CompanyType } from "../../platform/entities/company.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";

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
 */
@ApiTags("Stock Control - Customers")
@UseGuards(StockControlAuthGuard)
@Controller("stock-control/customers")
export class StockControlCustomersController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "List customer companies for the picker. Optional ?q= filters by name prefix (case-insensitive). Capped at 50 rows.",
  })
  async list(@Query("q") q?: string): Promise<QuoteCustomerDto[]> {
    const trimmed = (q ?? "").trim();
    const where =
      trimmed.length > 0
        ? { companyType: CompanyType.CUSTOMER, name: ILike(`%${trimmed}%`) }
        : { companyType: CompanyType.CUSTOMER };
    const rows = await this.companyRepo.find({
      where,
      order: { name: "ASC" },
      take: 50,
    });
    return rows.map(toDto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Fetch a single customer company by id." })
  async findOne(@Query("id", ParseIntPipe) id: number): Promise<QuoteCustomerDto | null> {
    const row = await this.companyRepo.findOne({
      where: { id, companyType: CompanyType.CUSTOMER },
    });
    return row ? toDto(row) : null;
  }

  @Post()
  @ApiOperation({
    summary:
      "Create a customer company. Inserted with companyType = CUSTOMER, so it shows up in the picker for every future quote. Used by the 'Save for future use' tick on the inline new-customer form.",
  })
  async create(@Body() body: Partial<QuoteCustomerDto>): Promise<QuoteCustomerDto> {
    const name = body.name ? body.name.trim() : "";
    if (name.length === 0) {
      throw new BadRequestException("Customer name is required");
    }
    const row = this.companyRepo.create({
      name,
      companyType: CompanyType.CUSTOMER,
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
    return toDto(saved);
  }
}

function toDto(row: Company): QuoteCustomerDto {
  return {
    id: row.id,
    name: row.name,
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
