import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { StockControlSupplierRepository } from "../repositories/stock-control-supplier.repository";

@ApiTags("Stock Control - Suppliers")
@Controller("stock-control/suppliers")
@UseGuards(StockControlAuthGuard, StockControlOnboardingGuard, StockControlRoleGuard)
export class SupplierController {
  constructor(private readonly supplierRepo: StockControlSupplierRepository) {}

  @Get()
  @ApiOperation({ summary: "List all suppliers for tenant" })
  async list(@Req() req: any): Promise<StockControlSupplier[]> {
    return this.supplierRepo.findAllForCompanyOrderedByName(req.user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Create a supplier" })
  async create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      vatNumber?: string;
      registrationNumber?: string;
      address?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<StockControlSupplier> {
    const supplier = this.supplierRepo.build({
      companyId: req.user.companyId,
      name: body.name,
      vatNumber: body.vatNumber || null,
      registrationNumber: body.registrationNumber || null,
      address: body.address || null,
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      email: body.email || null,
    });
    return this.supplierRepo.saveForCompany(req.user.companyId, supplier);
  }
}
