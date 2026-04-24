import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";
import { WorkflowAssignmentService } from "./workflow-assignment.service";

const COMPANY_ID = 1;

const createUser = (overrides: Partial<StockControlUser> = {}): StockControlUser =>
  ({
    id: 10,
    name: "Test User",
    email: "test@example.com",
    role: StockControlRole.MANAGER,
    ...overrides,
  }) as StockControlUser;

const createAssignment = (
  overrides: Partial<WorkflowStepAssignment> = {},
): WorkflowStepAssignment =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    workflowStep: "reception",
    userId: 10,
    isPrimary: false,
    secondaryUserId: null,
    secondaryUser: null,
    user: createUser(),
    ...overrides,
  }) as WorkflowStepAssignment;

const createRecipient = (
  overrides: Partial<WorkflowNotificationRecipient> = {},
): WorkflowNotificationRecipient =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    workflowStep: "reception",
    email: "notify@example.com",
    ...overrides,
  }) as WorkflowNotificationRecipient;

const createLocationAssignment = (
  overrides: Partial<UserLocationAssignment> = {},
): UserLocationAssignment =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    userId: 10,
    locationId: 100,
    user: createUser(),
    ...overrides,
  }) as UserLocationAssignment;

describe("WorkflowAssignmentService", () => {
  let service: WorkflowAssignmentService;

  const mockManager = {
    delete: jest.fn(),
    create: jest.fn().mockImplementation((_entity, data) => data),
    save: jest.fn(),
  };

  const mockAssignmentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn(),
    manager: {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    },
  };

  const mockUserRepo = {
    find: jest.fn(),
  };

  const mockRecipientRepo = {
    find: jest.fn(),
    delete: jest.fn(),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn(),
  };

  const mockUserLocationRepo = {
    find: jest.fn(),
    delete: jest.fn(),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowAssignmentService,
        { provide: getRepositoryToken(WorkflowStepAssignment), useValue: mockAssignmentRepo },
        { provide: getRepositoryToken(StockControlUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(WorkflowNotificationRecipient), useValue: mockRecipientRepo },
        { provide: getRepositoryToken(UserLocationAssignment), useValue: mockUserLocationRepo },
      ],
    }).compile();

    service = module.get<WorkflowAssignmentService>(WorkflowAssignmentService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("allAssignments", () => {
    it("should return assignments grouped by step", async () => {
      const user1 = createUser({ id: 10, name: "Alice", email: "alice@example.com" });
      const user2 = createUser({ id: 20, name: "Bob", email: "bob@example.com" });

      mockAssignmentRepo.find.mockResolvedValue([
        createAssignment({
          workflowStep: "reception",
          userId: 10,
          isPrimary: true,
          secondaryUserId: 20,
          user: user1,
        }),
        createAssignment({
          id: 2,
          workflowStep: "reception",
          userId: 20,
          isPrimary: false,
          user: user2,
        }),
        createAssignment({
          id: 3,
          workflowStep: "inspection",
          userId: 10,
          isPrimary: true,
          secondaryUserId: null,
          user: user1,
        }),
      ]);

      const result = await service.allAssignments(COMPANY_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        step: "reception",
        userIds: [10, 20],
        primaryUserId: 10,
        secondaryUserId: 20,
        users: [
          {
            id: 10,
            unifiedUserId: null,
            name: "Alice",
            email: "alice@example.com",
            role: StockControlRole.MANAGER,
          },
          {
            id: 20,
            unifiedUserId: null,
            name: "Bob",
            email: "bob@example.com",
            role: StockControlRole.MANAGER,
          },
        ],
      });
      expect(result[1]).toEqual({
        step: "inspection",
        userIds: [10],
        primaryUserId: 10,
        secondaryUserId: null,
        users: [
          {
            id: 10,
            unifiedUserId: null,
            name: "Alice",
            email: "alice@example.com",
            role: StockControlRole.MANAGER,
          },
        ],
      });
    });

    it("should return empty array when no assignments exist", async () => {
      mockAssignmentRepo.find.mockResolvedValue([]);

      const result = await service.allAssignments(COMPANY_ID);

      expect(result).toEqual([]);
    });

    it("should pass correct query options to repository", async () => {
      mockAssignmentRepo.find.mockResolvedValue([]);

      await service.allAssignments(COMPANY_ID);

      expect(mockAssignmentRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID },
        relations: ["user"],
        order: { workflowStep: "ASC", isPrimary: "DESC" },
      });
    });
  });

  describe("assignmentsForStep", () => {
    it("should return assignments for a specific step", async () => {
      const assignments = [
        createAssignment({ isPrimary: true }),
        createAssignment({ id: 2, userId: 20, isPrimary: false }),
      ];
      mockAssignmentRepo.find.mockResolvedValue(assignments);

      const result = await service.assignmentsForStep(COMPANY_ID, "reception");

      expect(result).toEqual(assignments);
      expect(mockAssignmentRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, workflowStep: "reception" },
        relations: ["user"],
        order: { isPrimary: "DESC" },
      });
    });

    it("should return empty array when no assignments exist for step", async () => {
      mockAssignmentRepo.find.mockResolvedValue([]);

      const result = await service.assignmentsForStep(COMPANY_ID, "nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("updateAssignments", () => {
    it("should delete existing and create new assignments", async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 10 }, { id: 20 }]);
      mockManager.delete.mockResolvedValue({ affected: 1 });
      mockManager.save.mockResolvedValue([]);

      await service.updateAssignments(COMPANY_ID, "reception", [10, 20], 10, 20);

      expect(mockManager.delete).toHaveBeenCalledWith(WorkflowStepAssignment, {
        companyId: COMPANY_ID,
        workflowStep: "reception",
      });
      expect(mockManager.create).toHaveBeenCalledTimes(2);
      expect(mockManager.create).toHaveBeenCalledWith(WorkflowStepAssignment, {
        companyId: COMPANY_ID,
        workflowStep: "reception",
        userId: 10,
        isPrimary: true,
        secondaryUserId: 20,
      });
      expect(mockManager.create).toHaveBeenCalledWith(WorkflowStepAssignment, {
        companyId: COMPANY_ID,
        workflowStep: "reception",
        userId: 20,
        isPrimary: false,
        secondaryUserId: null,
      });
      expect(mockManager.save).toHaveBeenCalledTimes(1);
    });

    it("should only delete when userIds is empty", async () => {
      mockUserRepo.find.mockResolvedValue([]);
      mockManager.delete.mockResolvedValue({ affected: 1 });

      await service.updateAssignments(COMPANY_ID, "reception", []);

      expect(mockManager.delete).toHaveBeenCalledWith(WorkflowStepAssignment, {
        companyId: COMPANY_ID,
        workflowStep: "reception",
      });
      expect(mockManager.create).not.toHaveBeenCalled();
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it("should set isPrimary false for non-primary users", async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 10 }]);
      mockManager.delete.mockResolvedValue({ affected: 0 });
      mockManager.save.mockResolvedValue([]);

      await service.updateAssignments(COMPANY_ID, "reception", [10], 99);

      expect(mockManager.create).toHaveBeenCalledWith(WorkflowStepAssignment, {
        companyId: COMPANY_ID,
        workflowStep: "reception",
        userId: 10,
        isPrimary: false,
        secondaryUserId: null,
      });
    });

    it("should set secondaryUserId to null when not provided", async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 10 }]);
      mockManager.delete.mockResolvedValue({ affected: 0 });
      mockManager.save.mockResolvedValue([]);

      await service.updateAssignments(COMPANY_ID, "reception", [10], 10);

      expect(mockManager.create).toHaveBeenCalledWith(WorkflowStepAssignment, {
        companyId: COMPANY_ID,
        workflowStep: "reception",
        userId: 10,
        isPrimary: true,
        secondaryUserId: null,
      });
    });
  });

  describe("secondaryUserForStep", () => {
    it("should return secondary user when primary assignment has one", async () => {
      const secondaryUser = createUser({ id: 20, name: "Secondary" });
      mockAssignmentRepo.findOne.mockResolvedValue(
        createAssignment({
          isPrimary: true,
          secondaryUserId: 20,
          secondaryUser,
        }),
      );

      const result = await service.secondaryUserForStep(COMPANY_ID, "reception");

      expect(result).toEqual(secondaryUser);
      expect(mockAssignmentRepo.findOne).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, workflowStep: "reception", isPrimary: true },
        relations: ["secondaryUser"],
      });
    });

    it("should return null when no primary assignment exists", async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(null);

      const result = await service.secondaryUserForStep(COMPANY_ID, "reception");

      expect(result).toBeNull();
    });

    it("should return null when primary has no secondary user", async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(
        createAssignment({ isPrimary: true, secondaryUserId: null }),
      );

      const result = await service.secondaryUserForStep(COMPANY_ID, "reception");

      expect(result).toBeNull();
    });
  });

  describe("usersForStep", () => {
    it("should return users from assignments when they exist", async () => {
      const user1 = createUser({ id: 10 });
      const user2 = createUser({ id: 20 });
      mockAssignmentRepo.find.mockResolvedValue([
        createAssignment({ userId: 10, user: user1 }),
        createAssignment({ id: 2, userId: 20, user: user2 }),
      ]);

      const result = await service.usersForStep(COMPANY_ID, "reception");

      expect(result).toEqual([user1, user2]);
    });

    it("should fall back to role-based lookup when no assignments exist", async () => {
      mockAssignmentRepo.find.mockResolvedValue([]);
      const fallbackUsers = [createUser({ id: 30, role: StockControlRole.ADMIN })];
      mockUserRepo.find.mockResolvedValue(fallbackUsers);

      const result = await service.usersForStep(COMPANY_ID, "reception");

      expect(result).toEqual(fallbackUsers);
      expect(mockUserRepo.find).toHaveBeenCalledWith({
        where: expect.arrayContaining([expect.objectContaining({ companyId: COMPANY_ID })]),
      });
    });
  });

  describe("assignedUserIdsForStep", () => {
    it("should return user ids for assigned users", async () => {
      mockAssignmentRepo.find.mockResolvedValue([{ userId: 10 }, { userId: 20 }, { userId: 30 }]);

      const result = await service.assignedUserIdsForStep(COMPANY_ID, "reception");

      expect(result).toEqual([10, 20, 30]);
      expect(mockAssignmentRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, workflowStep: "reception" },
        select: ["userId"],
      });
    });

    it("should return empty array when no assignments exist", async () => {
      mockAssignmentRepo.find.mockResolvedValue([]);

      const result = await service.assignedUserIdsForStep(COMPANY_ID, "reception");

      expect(result).toEqual([]);
    });
  });

  describe("hasExplicitAssignments", () => {
    it("should return true when assignments exist", async () => {
      mockAssignmentRepo.count.mockResolvedValue(3);

      const result = await service.hasExplicitAssignments(COMPANY_ID, "reception");

      expect(result).toBe(true);
      expect(mockAssignmentRepo.count).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, workflowStep: "reception" },
      });
    });

    it("should return false when no assignments exist", async () => {
      mockAssignmentRepo.count.mockResolvedValue(0);

      const result = await service.hasExplicitAssignments(COMPANY_ID, "reception");

      expect(result).toBe(false);
    });
  });

  describe("eligibleUsersForStep", () => {
    it("should return users with compatible roles mapped to summary objects", async () => {
      const users = [
        createUser({
          id: 10,
          name: "Alice",
          email: "alice@example.com",
          role: StockControlRole.MANAGER,
        }),
        createUser({ id: 20, name: "Bob", email: "bob@example.com", role: StockControlRole.ADMIN }),
      ];
      mockUserRepo.find.mockResolvedValue(users);

      const result = await service.eligibleUsersForStep(COMPANY_ID, "reception");

      expect(result).toEqual([
        { id: 10, name: "Alice", email: "alice@example.com", role: StockControlRole.MANAGER },
        { id: 20, name: "Bob", email: "bob@example.com", role: StockControlRole.ADMIN },
      ]);
      expect(mockUserRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, role: expect.anything() },
        order: { name: "ASC" },
      });
    });

    it("should return empty array when no eligible users exist", async () => {
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.eligibleUsersForStep(COMPANY_ID, "reception");

      expect(result).toEqual([]);
    });
  });

  describe("allNotificationRecipients", () => {
    it("should return recipients grouped by step", async () => {
      mockRecipientRepo.find.mockResolvedValue([
        createRecipient({ workflowStep: "reception", email: "a@example.com" }),
        createRecipient({ id: 2, workflowStep: "reception", email: "b@example.com" }),
        createRecipient({ id: 3, workflowStep: "inspection", email: "c@example.com" }),
      ]);

      const result = await service.allNotificationRecipients(COMPANY_ID);

      expect(result).toEqual([
        { step: "reception", emails: ["a@example.com", "b@example.com"] },
        { step: "inspection", emails: ["c@example.com"] },
      ]);
    });

    it("should return empty array when no recipients exist", async () => {
      mockRecipientRepo.find.mockResolvedValue([]);

      const result = await service.allNotificationRecipients(COMPANY_ID);

      expect(result).toEqual([]);
    });

    it("should pass correct query options to repository", async () => {
      mockRecipientRepo.find.mockResolvedValue([]);

      await service.allNotificationRecipients(COMPANY_ID);

      expect(mockRecipientRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID },
        order: { workflowStep: "ASC", email: "ASC" },
      });
    });
  });

  describe("notificationRecipientsForStep", () => {
    it("should return sorted emails for a step", async () => {
      mockRecipientRepo.find.mockResolvedValue([
        createRecipient({ email: "alpha@example.com" }),
        createRecipient({ id: 2, email: "beta@example.com" }),
      ]);

      const result = await service.notificationRecipientsForStep(COMPANY_ID, "reception");

      expect(result).toEqual(["alpha@example.com", "beta@example.com"]);
      expect(mockRecipientRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, workflowStep: "reception" },
        order: { email: "ASC" },
      });
    });

    it("should return empty array when no recipients exist for step", async () => {
      mockRecipientRepo.find.mockResolvedValue([]);

      const result = await service.notificationRecipientsForStep(COMPANY_ID, "reception");

      expect(result).toEqual([]);
    });
  });

  describe("updateNotificationRecipients", () => {
    it("should delete existing and create new recipients", async () => {
      mockRecipientRepo.delete.mockResolvedValue({ affected: 1 });
      mockRecipientRepo.save.mockResolvedValue([]);

      await service.updateNotificationRecipients(COMPANY_ID, "reception", [
        "a@example.com",
        "b@example.com",
      ]);

      expect(mockRecipientRepo.delete).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        workflowStep: "reception",
      });
      expect(mockRecipientRepo.create).toHaveBeenCalledTimes(2);
      expect(mockRecipientRepo.create).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        workflowStep: "reception",
        email: "a@example.com",
      });
      expect(mockRecipientRepo.create).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        workflowStep: "reception",
        email: "b@example.com",
      });
      expect(mockRecipientRepo.save).toHaveBeenCalledTimes(1);
    });

    it("should only delete when emails array is empty", async () => {
      mockRecipientRepo.delete.mockResolvedValue({ affected: 1 });

      await service.updateNotificationRecipients(COMPANY_ID, "reception", []);

      expect(mockRecipientRepo.delete).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        workflowStep: "reception",
      });
      expect(mockRecipientRepo.create).not.toHaveBeenCalled();
      expect(mockRecipientRepo.save).not.toHaveBeenCalled();
    });

    it("should deduplicate emails and normalize to lowercase", async () => {
      mockRecipientRepo.delete.mockResolvedValue({ affected: 0 });
      mockRecipientRepo.save.mockResolvedValue([]);

      await service.updateNotificationRecipients(COMPANY_ID, "reception", [
        "Test@Example.com",
        "test@example.com",
        "  TEST@EXAMPLE.COM  ",
      ]);

      expect(mockRecipientRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRecipientRepo.create).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        workflowStep: "reception",
        email: "test@example.com",
      });
    });
  });

  describe("allUserLocationAssignments", () => {
    it("should return location assignments grouped by user", async () => {
      const user1 = createUser({
        id: 10,
        name: "Alice",
        email: "alice@example.com",
        role: StockControlRole.MANAGER,
      });
      const user2 = createUser({
        id: 20,
        name: "Bob",
        email: "bob@example.com",
        role: StockControlRole.STOREMAN,
      });

      mockUserLocationRepo.find.mockResolvedValue([
        createLocationAssignment({ userId: 10, locationId: 100, user: user1 }),
        createLocationAssignment({ id: 2, userId: 10, locationId: 200, user: user1 }),
        createLocationAssignment({ id: 3, userId: 20, locationId: 100, user: user2 }),
      ]);

      const result = await service.allUserLocationAssignments(COMPANY_ID);

      expect(result).toEqual([
        {
          userId: 10,
          userName: "Alice",
          userEmail: "alice@example.com",
          userRole: StockControlRole.MANAGER,
          locationIds: [100, 200],
        },
        {
          userId: 20,
          userName: "Bob",
          userEmail: "bob@example.com",
          userRole: StockControlRole.STOREMAN,
          locationIds: [100],
        },
      ]);
    });

    it("should return empty array when no assignments exist", async () => {
      mockUserLocationRepo.find.mockResolvedValue([]);

      const result = await service.allUserLocationAssignments(COMPANY_ID);

      expect(result).toEqual([]);
    });

    it("should pass correct query options to repository", async () => {
      mockUserLocationRepo.find.mockResolvedValue([]);

      await service.allUserLocationAssignments(COMPANY_ID);

      expect(mockUserLocationRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID },
        relations: ["user", "location"],
        order: { userId: "ASC" },
      });
    });
  });

  describe("updateUserLocations", () => {
    it("should delete existing and create new location assignments", async () => {
      mockUserLocationRepo.delete.mockResolvedValue({ affected: 1 });
      mockUserLocationRepo.save.mockResolvedValue([]);

      await service.updateUserLocations(COMPANY_ID, 10, [100, 200]);

      expect(mockUserLocationRepo.delete).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        userId: 10,
      });
      expect(mockUserLocationRepo.create).toHaveBeenCalledTimes(2);
      expect(mockUserLocationRepo.create).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        userId: 10,
        locationId: 100,
      });
      expect(mockUserLocationRepo.create).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        userId: 10,
        locationId: 200,
      });
      expect(mockUserLocationRepo.save).toHaveBeenCalledTimes(1);
    });

    it("should only delete when locationIds is empty", async () => {
      mockUserLocationRepo.delete.mockResolvedValue({ affected: 1 });

      await service.updateUserLocations(COMPANY_ID, 10, []);

      expect(mockUserLocationRepo.delete).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        userId: 10,
      });
      expect(mockUserLocationRepo.create).not.toHaveBeenCalled();
      expect(mockUserLocationRepo.save).not.toHaveBeenCalled();
    });

    it("should deduplicate location ids", async () => {
      mockUserLocationRepo.delete.mockResolvedValue({ affected: 0 });
      mockUserLocationRepo.save.mockResolvedValue([]);

      await service.updateUserLocations(COMPANY_ID, 10, [100, 100, 200, 200]);

      expect(mockUserLocationRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("locationIdsForUser", () => {
    it("should return location ids for the user", async () => {
      mockUserLocationRepo.find.mockResolvedValue([
        { locationId: 100 },
        { locationId: 200 },
        { locationId: 300 },
      ]);

      const result = await service.locationIdsForUser(COMPANY_ID, 10);

      expect(result).toEqual([100, 200, 300]);
      expect(mockUserLocationRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, userId: 10 },
        select: ["locationId"],
      });
    });

    it("should return empty array when user has no location assignments", async () => {
      mockUserLocationRepo.find.mockResolvedValue([]);

      const result = await service.locationIdsForUser(COMPANY_ID, 10);

      expect(result).toEqual([]);
    });
  });
});
