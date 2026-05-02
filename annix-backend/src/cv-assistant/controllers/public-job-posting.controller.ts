import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { JobPostingService } from "../services/job-posting.service";

@Controller("cv-assistant/public/job-postings")
export class PublicJobPostingController {
  constructor(private readonly jobPostingService: JobPostingService) {}

  @Get(":referenceNumber")
  async byReferenceNumber(@Param("referenceNumber") referenceNumber: string) {
    const jobPosting = await this.jobPostingService.publicByReferenceNumber(referenceNumber);
    if (!jobPosting) {
      throw new NotFoundException("Job posting not found");
    }
    return jobPosting;
  }
}
