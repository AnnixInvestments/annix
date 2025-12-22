import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Rfq, RfqStatus } from '../rfq/entities/rfq.entity';
import { CustomerProfile } from '../customer/entities/customer-profile.entity';
import { PublicStatsDto, UpcomingRfqDto } from './dto/public-stats.dto';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Rfq)
    private rfqRepository: Repository<Rfq>,
    @InjectRepository(CustomerProfile)
    private customerProfileRepository: Repository<CustomerProfile>,
  ) {}

  async getPublicStats(): Promise<PublicStatsDto> {
    // Get total RFQ count
    const totalRfqs = await this.rfqRepository.count();

    // Get total customer count
    const totalCustomers = await this.customerProfileRepository.count();

    // For suppliers, we'll return 0 for now as supplier entity doesn't exist yet
    // This can be updated when supplier registration is implemented
    const totalSuppliers = 0;

    // Get upcoming RFQs (next 30 days) sorted by nearest closing date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingRfqsRaw = await this.rfqRepository
      .createQueryBuilder('rfq')
      .where('rfq.requiredDate >= :today', { today })
      .andWhere('rfq.requiredDate <= :thirtyDaysFromNow', { thirtyDaysFromNow })
      .andWhere('rfq.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [RfqStatus.CANCELLED, RfqStatus.REJECTED],
      })
      .orderBy('rfq.requiredDate', 'ASC')
      .limit(10)
      .getMany();

    const upcomingRfqs: UpcomingRfqDto[] = upcomingRfqsRaw.map((rfq) => {
      const requiredDate = new Date(rfq.requiredDate!);
      const timeDiff = requiredDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

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
    // Placeholder until supplier entity is implemented
    return 0;
  }
}
