import { JobPostingStatus } from "../entities/job-posting.entity";
import { JobExpiryService } from "./job-expiry.service";

describe("JobExpiryService", () => {
  const jobPostingRepo = { findActiveExpired: jest.fn(), save: jest.fn() };
  const jobPostingService = { deindexAndUnpost: jest.fn() };

  const service = () => new JobExpiryService(jobPostingRepo as never, jobPostingService as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jobPostingRepo.save.mockImplementation(async (job) => job);
    jobPostingService.deindexAndUnpost.mockResolvedValue(undefined);
  });

  it("marks each due job EXPIRED and de-indexes it", async () => {
    const job = { id: 1, status: JobPostingStatus.ACTIVE };
    jobPostingRepo.findActiveExpired.mockResolvedValue([job]);

    const result = await service().sweep();

    expect(result.expired).toBe(1);
    expect(job.status).toBe(JobPostingStatus.EXPIRED);
    expect(jobPostingRepo.save).toHaveBeenCalledWith(job);
    expect(jobPostingService.deindexAndUnpost).toHaveBeenCalledWith(job);
  });

  it("no-ops when nothing is due", async () => {
    jobPostingRepo.findActiveExpired.mockResolvedValue([]);

    expect(await service().sweep()).toEqual({ expired: 0 });
    expect(jobPostingService.deindexAndUnpost).not.toHaveBeenCalled();
  });
});
