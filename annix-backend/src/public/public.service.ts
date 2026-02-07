import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerProfile } from "../customer/entities";
import { fromJSDate, now } from "../lib/datetime";
import { Rfq, RfqStatus } from "../rfq/entities/rfq.entity";
import {
  SupplierAccountStatus,
  SupplierProfile,
} from "../supplier/entities/supplier-profile.entity";
import { PublicStatsDto, UpcomingRfqDto } from "./dto/public-stats.dto";

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Rfq)
    private rfqRepository: Repository<Rfq>,
    @InjectRepository(CustomerProfile)
    private customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(SupplierProfile)
    private supplierProfileRepository: Repository<SupplierProfile>,
  ) {}

  async getPublicStats(): Promise<PublicStatsDto> {
    // Get total RFQ count
    const totalRfqs = await this.rfqRepository.count();

    // Get total customer count
    const totalCustomers = await this.customerProfileRepository.count();

    // Get total supplier count (only active suppliers)
    const totalSuppliers = await this.supplierProfileRepository.count({
      where: { accountStatus: SupplierAccountStatus.ACTIVE },
    });

    // Get upcoming RFQs (next 30 days) sorted by nearest closing date
    const today = now().startOf("day").toJSDate();
    const thirtyDaysFromNow = now().startOf("day").plus({ days: 30 }).toJSDate();

    const upcomingRfqsRaw = await this.rfqRepository
      .createQueryBuilder("rfq")
      .where("rfq.requiredDate >= :today", { today })
      .andWhere("rfq.requiredDate <= :thirtyDaysFromNow", { thirtyDaysFromNow })
      .andWhere("rfq.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [RfqStatus.REJECTED],
      })
      .orderBy("rfq.requiredDate", "ASC")
      .limit(10)
      .getMany();

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
      where: { accountStatus: SupplierAccountStatus.ACTIVE },
    });
  }
}
