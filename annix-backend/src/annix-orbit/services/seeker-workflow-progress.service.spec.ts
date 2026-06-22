import { Test, type TestingModule } from "@nestjs/testing";
import { UserRepository } from "../../user/user.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { SeekerTestEventRepository } from "../repositories/seeker-test-event.repository";
import { SeekerTestParticipantRepository } from "../repositories/seeker-test-participant.repository";
import { SeekerTestPhaseRepository } from "../repositories/seeker-test-phase.repository";
import { SeekerWorkflowProgressRepository } from "../repositories/seeker-workflow-progress.repository";
import { SeekerWorkflowStepRepository } from "../repositories/seeker-workflow-step.repository";
import { SeekerWorkflowProgressService } from "./seeker-workflow-progress.service";

type EventOverride = Partial<{ candidateId: number; eventName: string; ts: Date; ok: boolean }>;

describe("SeekerWorkflowProgressService.reconcile", () => {
  let service: SeekerWorkflowProgressService;
  let events: { eventsSince: jest.Mock };
  let phases: { findByStatus: jest.Mock; listNewestFirst: jest.Mock };
  let participants: {
    findByCandidateAndPhase: jest.Mock;
    findByCandidate: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let progress: {
    findByParticipant: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    listAll: jest.Mock;
  };
  let steps: {
    findByParticipantAndStep: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    listByParticipant: jest.Mock;
  };
  let candidates: { findById: jest.Mock };
  let profiles: { findByUserId: jest.Mock };
  let users: { findOrbitUserByEmail: jest.Mock };

  const event = (over: EventOverride = {}) => ({
    candidateId: 1,
    eventName: "seeker_jobs_viewed",
    ts: new Date("2026-06-01"),
    ok: true,
    ...over,
  });

  const markedSteps = (): string[] =>
    steps.findByParticipantAndStep.mock.calls.map((call) => call[1]);

  beforeEach(async () => {
    events = { eventsSince: jest.fn().mockResolvedValue([]) };
    phases = {
      findByStatus: jest.fn().mockResolvedValue([{ id: "phase1" }]),
      listNewestFirst: jest.fn().mockResolvedValue([]),
    };
    participants = {
      findByCandidateAndPhase: jest.fn().mockResolvedValue({ id: "part1" }),
      findByCandidate: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "part1" }),
      save: jest.fn().mockResolvedValue({ id: "part1" }),
    };
    progress = {
      findByParticipant: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      listAll: jest.fn().mockResolvedValue([]),
    };
    steps = {
      findByParticipantAndStep: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      listByParticipant: jest.fn().mockResolvedValue([]),
    };
    candidates = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        email: "a@example.com",
        createdAt: new Date("2026-01-01"),
      }),
    };
    profiles = {
      findByUserId: jest.fn().mockResolvedValue({
        userType: "individual",
        onboardingCompletedAt: null,
        cvUploadedAt: null,
      }),
    };
    users = { findOrbitUserByEmail: jest.fn().mockResolvedValue({ id: 10 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeekerWorkflowProgressService,
        { provide: SeekerTestEventRepository, useValue: events },
        { provide: SeekerTestPhaseRepository, useValue: phases },
        { provide: SeekerTestParticipantRepository, useValue: participants },
        { provide: SeekerWorkflowProgressRepository, useValue: progress },
        { provide: SeekerWorkflowStepRepository, useValue: steps },
        { provide: CandidateRepository, useValue: candidates },
        { provide: AnnixOrbitProfileRepository, useValue: profiles },
        { provide: UserRepository, useValue: users },
      ],
    }).compile();
    service = module.get(SeekerWorkflowProgressService);
  });

  it("collapses concurrent callers onto a single in-flight run", async () => {
    await Promise.all([service.reconcile(), service.reconcile()]);
    expect(events.eventsSince).toHaveBeenCalledTimes(1);
  });

  it("does not throw when a step create races into a duplicate-key error", async () => {
    events.eventsSince.mockResolvedValue([event()]);
    steps.create.mockRejectedValue({ code: 11000 });
    await expect(service.reconcile()).resolves.toBeDefined();
  });

  it("recovers from a duplicate-key on progress create by updating the existing row", async () => {
    events.eventsSince.mockResolvedValue([event()]);
    progress.findByParticipant.mockResolvedValueOnce(null).mockResolvedValue({ id: "prog1" });
    progress.create.mockRejectedValue({ code: 11000 });
    await service.reconcile();
    expect(progress.save).toHaveBeenCalled();
  });

  it("rethrows a non-duplicate-key error from step create", async () => {
    events.eventsSince.mockResolvedValue([event()]);
    steps.create.mockRejectedValue(new Error("connection lost"));
    await expect(service.reconcile()).rejects.toThrow("connection lost");
  });

  it("does not credit a step whose event failed (ok === false)", async () => {
    events.eventsSince.mockResolvedValue([
      event({ eventName: "seeker_ai_analysis_completed", ok: false }),
    ]);
    await service.reconcile();
    expect(markedSteps()).not.toContain("ai_cv_analysis");
  });

  it("derives registered_account but not profile steps for a non-individual profile", async () => {
    profiles.findByUserId.mockResolvedValue({
      userType: "company",
      onboardingCompletedAt: new Date("2026-05-01"),
      cvUploadedAt: new Date("2026-05-02"),
    });
    events.eventsSince.mockResolvedValue([event()]);
    await service.reconcile();
    expect(markedSteps()).toContain("registered_account");
    expect(markedSteps()).not.toContain("completed_profile");
    expect(markedSteps()).not.toContain("uploaded_cv");
  });

  it("derives completed_profile and uploaded_cv from an individual profile's durable state", async () => {
    profiles.findByUserId.mockResolvedValue({
      userType: "individual",
      onboardingCompletedAt: new Date("2026-05-01"),
      cvUploadedAt: new Date("2026-05-02"),
    });
    events.eventsSince.mockResolvedValue([event()]);
    await service.reconcile();
    expect(markedSteps()).toContain("completed_profile");
    expect(markedSteps()).toContain("uploaded_cv");
  });
});
