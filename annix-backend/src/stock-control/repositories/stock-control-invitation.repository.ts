import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  StockControlInvitation,
  StockControlInvitationStatus,
} from "../entities/stock-control-invitation.entity";

export abstract class StockControlInvitationRepository extends CrudRepository<StockControlInvitation> {
  abstract findOneByTokenAndStatus(
    token: string,
    status: StockControlInvitationStatus,
  ): Promise<StockControlInvitation | null>;
  abstract findOneByEmailAndStatus(
    email: string,
    status: StockControlInvitationStatus,
  ): Promise<StockControlInvitation | null>;
  abstract findOnePendingForCompanyByEmail(
    companyId: number,
    email: string,
  ): Promise<StockControlInvitation | null>;
  abstract findPendingForCompanyWithInviter(companyId: number): Promise<StockControlInvitation[]>;
  abstract findOneByTokenWithCompany(token: string): Promise<StockControlInvitation | null>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlInvitation | null>;
  abstract findOneForCompanyWithInviter(
    id: number,
    companyId: number,
  ): Promise<StockControlInvitation | null>;
}
