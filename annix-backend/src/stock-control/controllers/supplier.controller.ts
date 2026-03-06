import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";

@ApiTags("Stock Control - Suppliers")
@Controller("stock-control/suppliers")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class SupplierController {
  constructor(
    @InjectRepository(StockControlSupplier)
    private readonly supplierRepo: Repository<StockControlSupplier>,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all suppliers for tenant" })
  async list(@Req() req: any): Promise<StockControlSupplier[]> {
    return this.supplierRepo.find({
      where: { companyId: req.user.companyId },
      order: { name: "ASC" },
    });
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
    const supplier = this.supplierRepo.create({
      companyId: req.user.companyId,
      name: body.name,
      vatNumber: body.vatNumber || null,
      registrationNumber: body.registrationNumber || null,
      address: body.address || null,
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      email: body.email || null,
    });
    return this.supplierRepo.save(supplier);
  }
}
