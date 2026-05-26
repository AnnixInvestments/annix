import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  SupplierInvitation,
  SupplierInvitationStatus,
} from "./entities/supplier-invitation.entity";
import { SupplierInvitationRepository } from "./supplier-invitation.repository";

@Injectable()
export class PostgresSupplierInvitationRepository
  extends TypeOrmCrudRepository<SupplierInvitation>
  implements SupplierInvitationRepository
{
  constructor(@InjectRepository(SupplierInvitation) repository: Repository<SupplierInvitation>) {
    super(repository);
  }

  findByCompany(customerCompanyId: number): Promise<SupplierInvitation[]> {
    return this.repository.find({
      where: { customerCompanyId },
      relations: ["invitedBy", "supplierProfile"],
      order: { createdAt: "DESC" },
    });
  }

  findActivePendingByCompanyAndEmail(
    customerCompanyId: number,
    email: string,
    nowDate: Date,
  ): Promise<SupplierInvitation | null> {
    return this.repository.findOne({
      where: {
        customerCompanyId,
        email,
        status: SupplierInvitationStatus.PENDING,
        expiresAt: MoreThan(nowDate),
      },
    });
  }

  findByIdInCompany(id: number, customerCompanyId: number): Promise<SupplierInvitation | null> {
    return this.repository.findOne({
      where: { id, customerCompanyId },
    });
  }

  findActivePendingByToken(token: string, nowDate: Date): Promise<SupplierInvitation | null> {
    return this.repository.findOne({
      where: {
        token,
        status: SupplierInvitationStatus.PENDING,
        expiresAt: MoreThan(nowDate),
      },
      relations: ["customerCompany"],
    });
  }

  findByToken(token: string): Promise<SupplierInvitation | null> {
    return this.repository.findOne({
      where: { token },
    });
  }

  findPendingByEmail(email: string): Promise<SupplierInvitation[]> {
    return this.repository.find({
      where: {
        email,
        status: SupplierInvitationStatus.PENDING,
      },
    });
  }
}
