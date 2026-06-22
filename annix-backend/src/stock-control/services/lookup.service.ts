import { Injectable, NotFoundException } from "@nestjs/common";
import { StockControlDepartment } from "../entities/stock-control-department.entity";
import { StockControlLocation } from "../entities/stock-control-location.entity";
import { StockControlDepartmentRepository } from "../repositories/stock-control-department.repository";
import { StockControlLocationRepository } from "../repositories/stock-control-location.repository";

@Injectable()
export class LookupService {
  constructor(
    private readonly departmentRepo: StockControlDepartmentRepository,
    private readonly locationRepo: StockControlLocationRepository,
  ) {}

  async departmentsByCompany(companyId: number): Promise<StockControlDepartment[]> {
    return this.departmentRepo.findActiveForCompanyOrdered(companyId);
  }

  async allDepartmentsByCompany(companyId: number): Promise<StockControlDepartment[]> {
    return this.departmentRepo.findAllForCompanyOrdered(companyId);
  }

  async departmentById(companyId: number, id: number): Promise<StockControlDepartment> {
    const department = await this.departmentRepo.findOneForCompany(id, companyId);

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    return department;
  }

  async createDepartment(
    companyId: number,
    name: string,
    displayOrder?: number,
  ): Promise<StockControlDepartment> {
    return this.departmentRepo.create({
      companyId,
      name,
      displayOrder: displayOrder ?? null,
    });
  }

  async updateDepartment(
    companyId: number,
    id: number,
    data: { name?: string; displayOrder?: number | null; active?: boolean },
  ): Promise<StockControlDepartment> {
    const department = await this.departmentById(companyId, id);
    Object.assign(department, data);
    return this.departmentRepo.saveForCompany(companyId, department);
  }

  async deleteDepartment(companyId: number, id: number): Promise<StockControlDepartment> {
    const department = await this.departmentById(companyId, id);
    department.active = false;
    return this.departmentRepo.saveForCompany(companyId, department);
  }

  async locationsByCompany(companyId: number): Promise<StockControlLocation[]> {
    return this.locationRepo.findActiveForCompanyOrdered(companyId);
  }

  async allLocationsByCompany(companyId: number): Promise<StockControlLocation[]> {
    return this.locationRepo.findAllForCompanyOrdered(companyId);
  }

  async locationById(companyId: number, id: number): Promise<StockControlLocation> {
    const location = await this.locationRepo.findOneForCompany(id, companyId);

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    return location;
  }

  async createLocation(
    companyId: number,
    name: string,
    description?: string,
    displayOrder?: number,
  ): Promise<StockControlLocation> {
    return this.locationRepo.create({
      companyId,
      name,
      description: description ?? null,
      displayOrder: displayOrder ?? null,
    });
  }

  async updateLocation(
    companyId: number,
    id: number,
    data: {
      name?: string;
      description?: string | null;
      displayOrder?: number | null;
      active?: boolean;
    },
  ): Promise<StockControlLocation> {
    const location = await this.locationById(companyId, id);
    Object.assign(location, data);
    return this.locationRepo.saveForCompany(companyId, location);
  }

  async deleteLocation(companyId: number, id: number): Promise<StockControlLocation> {
    const location = await this.locationById(companyId, id);
    location.active = false;
    return this.locationRepo.saveForCompany(companyId, location);
  }
}
