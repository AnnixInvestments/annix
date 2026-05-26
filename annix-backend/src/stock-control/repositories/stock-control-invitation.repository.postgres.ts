import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  StockControlInvitation,
  StockControlInvitationStatus,
} from "../entities/stock-control-invitation.entity";
import { StockControlInvitationRepository } from "./stock-control-invitation.repository";

@Injectable()
export class PostgresStockControlInvitationRepository
  extends TypeOrmCrudRepository<StockControlInvitation>
  implements StockControlInvitationRepository
{
  constructor(
    @InjectRepository(StockControlInvitation) repository: Repository<StockControlInvitation>,
  ) {
    super(repository);
  }

  findOneByTokenAndStatus(
    token: string,
    status: StockControlInvitationStatus,
  ): Promise<StockControlInvitation | null> {
    return this.repository.findOne({ where: { token, status } });
  }

  findOneByEmailAndStatus(
    email: string,
    status: StockControlInvitationStatus,
  ): Promise<StockControlInvitation | null> {
    return this.repository.findOne({ where: { email, status } });
  }

  findOnePendingForCompanyByEmail(
    companyId: number,
    email: string,
  ): Promise<StockControlInvitation | null> {
    return this.repository.findOne({
      where: { companyId, email, status: StockControlInvitationStatus.PENDING },
    });
  }

  findPendingForCompanyWithInviter(companyId: number): Promise<StockControlInvitation[]> {
    return this.repository.find({
      where: { companyId, status: StockControlInvitationStatus.PENDING },
      relations: ["invitedBy"],
      order: { createdAt: "DESC" },
    });
  }

  findOneByTokenWithCompany(token: string): Promise<StockControlInvitation | null> {
    return this.repository.findOne({
      where: { token },
      relations: ["company"],
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<StockControlInvitation | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneForCompanyWithInviter(
    id: number,
    companyId: number,
  ): Promise<StockControlInvitation | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["invitedBy"],
    });
  }
}
