import { Injectable } from "@nestjs/common";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { fromJSDate, now } from "../lib/datetime";
import { RfqStatus } from "../rfq/entities/rfq.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { SupplierAccountStatus } from "../supplier/entities/supplier-profile.entity";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { PublicStatsDto, UpcomingRfqDto } from "./dto/public-stats.dto";

@Injectable()
export class PublicService {
  constructor(
    private rfqRepository: RfqRepository,
    private customerProfileRepository: CustomerProfileRepository,
    private supplierProfileRepository: SupplierProfileRepository,
  ) {}

  async getPublicStats(): Promise<PublicStatsDto> {
    const totalRfqs = await this.rfqRepository.count();

    const totalCustomers = await this.customerProfileRepository.count();

    const totalSuppliers = await this.supplierProfileRepository.count({
      accountStatus: SupplierAccountStatus.ACTIVE,
    });

    const today = now().startOf("day").toJSDate();
    const thirtyDaysFromNow = now().startOf("day").plus({ days: 30 }).toJSDate();

    const upcomingRfqsRaw = await this.rfqRepository.findUpcomingNonRejected(
      today,
      thirtyDaysFromNow,
      10,
      [RfqStatus.REJECTED],
    );

    const upcomingRfqs: UpcomingRfqDto[] = upcomingRfqsRaw.map((rfq) => {
      const requiredDate = fromJSDate(rfq.requiredDate!);
      const todayDt = now().startOf("day");
      const daysRemaining = Math.ceil(requiredDate.diff(todayDt, "days").days);

      return {
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        projectName: rfq.projectName,
        requiredDate: rfq.requiredDate!,
        daysRemaining,
        status: rfq.status,
      };
    });

    return {
      totalRfqs,
      totalSuppliers,
      totalCustomers,
      upcomingRfqs,
    };
  }

  async getRfqCount(): Promise<number> {
    return this.rfqRepository.count();
  }

  async getCustomerCount(): Promise<number> {
    return this.customerProfileRepository.count();
  }

  async getSupplierCount(): Promise<number> {
    return this.supplierProfileRepository.count({
      accountStatus: SupplierAccountStatus.ACTIVE,
    });
  }
}
