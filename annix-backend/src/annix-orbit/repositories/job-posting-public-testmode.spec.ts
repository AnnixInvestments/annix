import { JobPostingStatus } from "../entities/job-posting.entity";
import { MongoJobPostingRepository } from "./job-posting.repository.mongo";

// Locks the POPIA/honesty invariant: test-mode postings must never surface on a
// public read path. We assert the exact Mongo filter each public query builds,
// using a lightweight chainable model stub (no in-memory Mongo engine needed).
describe("MongoJobPostingRepository public reads exclude test mode", () => {
  const NOT_TEST_MODE = { $or: [{ testMode: null }, { testMode: false }] };

  const makeRepo = (resolved: unknown) => {
    const query = {
      sort: () => query,
      limit: () => query,
      lean: () => query,
      exec: jest.fn().mockResolvedValue(resolved),
    };
    const model = {
      find: jest.fn().mockReturnValue(query),
      findOne: jest.fn().mockReturnValue(query),
    };
    const repo = new MongoJobPostingRepository(model as never, {} as never, null);
    return { repo, model };
  };

  it("activeForFeed (jobs.xml) filters out test-mode jobs", async () => {
    const { repo, model } = makeRepo([]);

    await repo.activeForFeed();

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: JobPostingStatus.ACTIVE, ...NOT_TEST_MODE }),
    );
  });

  it("findActiveByReferenceNumber (direct public URL) filters out test-mode jobs", async () => {
    const { repo, model } = makeRepo(null);

    await repo.findActiveByReferenceNumber("JOB-ABC123");

    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceNumber: "JOB-ABC123",
        status: JobPostingStatus.ACTIVE,
        ...NOT_TEST_MODE,
      }),
    );
  });

  it("activePublicJobs (public list) filters out test-mode jobs", async () => {
    const { repo, model } = makeRepo([]);

    await repo.activePublicJobs();

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: JobPostingStatus.ACTIVE, ...NOT_TEST_MODE }),
    );
  });
});
