import { Company } from "../../platform/entities/company.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlDepartment } from "./stock-control-department.entity";

export class StaffMember {
  id: number;

  name: string;

  employeeNumber: string | null;

  department: string | null;

  departmentEntity: StockControlDepartment | null;

  departmentId: number | null;

  photoUrl: string | null;

  qrToken: string;

  active: boolean;

  company: StockControlCompany;

  companyId: number;

  allocations: StockAllocation[];

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
