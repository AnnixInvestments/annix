import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockControlDepartment } from "../entities/stock-control-department.entity";
import { StockControlLocation } from "../entities/stock-control-location.entity";

@Injectable()
export class LookupService {
  constructor(
    @InjectRepository(StockControlDepartment)
    private readonly departmentRepo: Repository<StockControlDepartment>,
    @InjectRepository(StockControlLocation)
    private readonly locationRepo: Repository<StockControlLocation>,
  ) {}

  async departmentsByCompany(companyId: number): Promise<StockControlDepartment[]> {
    return this.departmentRepo.find({
      where: { companyId, active: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  async allDepartmentsByCompany(companyId: number): Promise<StockControlDepartment[]> {
    return this.departmentRepo.find({
      where: { companyId },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  async departmentById(companyId: number, id: number): Promise<StockControlDepartment> {
    const department = await this.departmentRepo.findOne({
      where: { id, companyId },
    });

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
    const department = this.departmentRepo.create({
      companyId,
      name,
      displayOrder: displayOrder ?? null,
    });
    return this.departmentRepo.save(department);
  }

  async updateDepartment(
    companyId: number,
    id: number,
    data: { name?: string; displayOrder?: number | null; active?: boolean },
  ): Promise<StockControlDepartment> {
    const department = await this.departmentById(companyId, id);
    Object.assign(department, data);
    return this.departmentRepo.save(department);
  }

  async deleteDepartment(companyId: number, id: number): Promise<StockControlDepartment> {
    const department = await this.departmentById(companyId, id);
    department.active = false;
    return this.departmentRepo.save(department);
  }

  async locationsByCompany(companyId: number): Promise<StockControlLocation[]> {
    return this.locationRepo.find({
      where: { companyId, active: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  async allLocationsByCompany(companyId: number): Promise<StockControlLocation[]> {
    return this.locationRepo.find({
      where: { companyId },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  async locationById(companyId: number, id: number): Promise<StockControlLocation> {
    const location = await this.locationRepo.findOne({
      where: { id, companyId },
    });

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
    const location = this.locationRepo.create({
      companyId,
      name,
      description: description ?? null,
      displayOrder: displayOrder ?? null,
    });
    return this.locationRepo.save(location);
  }

  async updateLocation(
    companyId: number,
    id: number,
    data: { name?: string; description?: string | null; displayOrder?: number | null; active?: boolean },
  ): Promise<StockControlLocation> {
    const location = await this.locationById(companyId, id);
    Object.assign(location, data);
    return this.locationRepo.save(location);
  }

  async deleteLocation(companyId: number, id: number): Promise<StockControlLocation> {
    const location = await this.locationById(companyId, id);
    location.active = false;
    return this.locationRepo.save(location);
  }
}
