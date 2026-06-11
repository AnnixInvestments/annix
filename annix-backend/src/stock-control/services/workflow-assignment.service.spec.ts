import { Test, TestingModule } from "@nestjs/testing";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { UserLocationAssignmentRepository } from "../repositories/user-location-assignment.repository";
import { WorkflowNotificationRecipientRepository } from "../repositories/workflow-notification-recipient.repository";
import { WorkflowStepAssignmentRepository } from "../repositories/workflow-step-assignment.repository";
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

  const mockAssignmentRepo = {
    findForCompanyWithUser: jest.fn(),
    findForStepWithUser: jest.fn(),
    findOnePrimaryForStepWithSecondaryUser: jest.fn(),
    findUserIdsForStep: jest.fn(),
    findForStepWithUserRelation: jest.fn(),
    countForStep: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    buildMany: jest.fn().mockImplementation((rows) => rows),
    saveMany: jest.fn(),
  };

  const mockUserRepo = {
    findIdsByIdsForCompany: jest.fn(),
    findForCompanyByRoles: jest.fn(),
    findForCompanyByRolesOrdered: jest.fn(),
  };

  const mockRecipientRepo = {
    findForCompanyOrdered: jest.fn(),
    findForStepOrdered: jest.fn(),
    deleteForStep: jest.fn(),
    buildMany: jest.fn().mockImplementation((rows) => rows),
    saveMany: jest.fn(),
  };

  const mockUserLocationRepo = {
    findForCompanyWithRelations: jest.fn(),
    findForUser: jest.fn(),
    deleteForUser: jest.fn(),
    buildMany: jest.fn().mockImplementation((rows) => rows),
    saveMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowAssignmentService,
        { provide: WorkflowStepAssignmentRepository, useValue: mockAssignmentRepo },
        { provide: StockControlUserRepository, useValue: mockUserRepo },
        { provide: WorkflowNotificationRecipientRepository, useValue: mockRecipientRepo },
        { provide: UserLocationAssignmentRepository, useValue: mockUserLocationRepo },
      ],
    }).compile();

    service = module.get<WorkflowAssignmentService>(WorkflowAssignmentService);
    jest.clearAllMocks();
    mockAssignmentRepo.findManyWhere.mockResolvedValue([]);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("allAssignments", () => {
    it("should return assignments grouped by step", async () => {
      const user1 = createUser({ id: 10, name: "Alice", email: "alice@example.com" });
      const user2 = createUser({ id: 20, name: "Bob", email: "bob@example.com" });

      mockAssignmentRepo.findForCompanyWithUser.mockResolvedValue([
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
      mockAssignmentRepo.findForCompanyWithUser.mockResolvedValue([]);

      const result = await service.allAssignments(COMPANY_ID);

      expect(result).toEqual([]);
    });

    it("should pass correct query options to repository", async () => {
      mockAssignmentRepo.findForCompanyWithUser.mockResolvedValue([]);

      await service.allAssignments(COMPANY_ID);

      expect(mockAssignmentRepo.findForCompanyWithUser).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe("assignmentsForStep", () => {
    it("should return assignments for a specific step", async () => {
      const assignments = [
        createAssignment({ isPrimary: true }),
        createAssignment({ id: 2, userId: 20, isPrimary: false }),
      ];
      mockAssignmentRepo.findForStepWithUser.mockResolvedValue(assignments);

      const result = await service.assignmentsForStep(COMPANY_ID, "reception");

      expect(result).toEqual(assignments);
      expect(mockAssignmentRepo.findForStepWithUser).toHaveBeenCalledWith(COMPANY_ID, "reception");
    });

    it("should return empty array when no assignments exist for step", async () => {
      mockAssignmentRepo.findForStepWithUser.mockResolvedValue([]);

      const result = await service.assignmentsForStep(COMPANY_ID, "nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("updateAssignments", () => {
    it("should delete existing and create new assignments", async () => {
      mockUserRepo.findIdsByIdsForCompany.mockResolvedValue([{ id: 10 }, { id: 20 }]);
      const existingAssignment = createAssignment({ id: 5, userId: 30 });
      mockAssignmentRepo.findManyWhere.mockResolvedValueOnce([existingAssignment]);
      mockAssignmentRepo.saveMany.mockResolvedValue([]);

      await service.updateAssignments(COMPANY_ID, "reception", [10, 20], 10, 20);

      expect(mockAssignmentRepo.findManyWhere).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        workflowStep: "reception",
      });
      expect(mockAssignmentRepo.remove).toHaveBeenCalledWith(existingAssignment);
      expect(mockAssignmentRepo.buildMany).toHaveBeenCalledWith([
        {
          companyId: COMPANY_ID,
          workflowStep: "reception",
          userId: 10,
          isPrimary: true,
          secondaryUserId: 20,
        },
        {
          companyId: COMPANY_ID,
          workflowStep: "reception",
          userId: 20,
          isPrimary: false,
          secondaryUserId: null,
        },
      ]);
      expect(mockAssignmentRepo.saveMany).toHaveBeenCalledTimes(1);
    });

    it("should only delete when userIds is empty", async () => {
      mockUserRepo.findIdsByIdsForCompany.mockResolvedValue([]);
      const existingAssignment = createAssignment({ id: 5, userId: 30 });
      mockAssignmentRepo.findManyWhere.mockResolvedValueOnce([existingAssignment]);

      await service.updateAssignments(COMPANY_ID, "reception", []);

      expect(mockAssignmentRepo.findManyWhere).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        workflowStep: "reception",
      });
      expect(mockAssignmentRepo.remove).toHaveBeenCalledWith(existingAssignment);
      expect(mockAssignmentRepo.buildMany).not.toHaveBeenCalled();
      expect(mockAssignmentRepo.saveMany).not.toHaveBeenCalled();
    });

    it("should set isPrimary false for non-primary users", async () => {
      mockUserRepo.findIdsByIdsForCompany.mockResolvedValue([{ id: 10 }]);
      mockAssignmentRepo.saveMany.mockResolvedValue([]);

      await service.updateAssignments(COMPANY_ID, "reception", [10], 99);

      expect(mockAssignmentRepo.buildMany).toHaveBeenCalledWith([
        {
          companyId: COMPANY_ID,
          workflowStep: "reception",
          userId: 10,
          isPrimary: false,
          secondaryUserId: null,
        },
      ]);
    });

    it("should set secondaryUserId to null when not provided", async () => {
      mockUserRepo.findIdsByIdsForCompany.mockResolvedValue([{ id: 10 }]);
      mockAssignmentRepo.saveMany.mockResolvedValue([]);

      await service.updateAssignments(COMPANY_ID, "reception", [10], 10);

      expect(mockAssignmentRepo.buildMany).toHaveBeenCalledWith([
        {
          companyId: COMPANY_ID,
          workflowStep: "reception",
          userId: 10,
          isPrimary: true,
          secondaryUserId: null,
        },
      ]);
    });
  });

  describe("secondaryUserForStep", () => {
    it("should return secondary user when primary assignment has one", async () => {
      const secondaryUser = createUser({ id: 20, name: "Secondary" });
      mockAssignmentRepo.findOnePrimaryForStepWithSecondaryUser.mockResolvedValue(
        createAssignment({
          isPrimary: true,
          secondaryUserId: 20,
          secondaryUser,
        }),
      );

      const result = await service.secondaryUserForStep(COMPANY_ID, "reception");

      expect(result).toEqual(secondaryUser);
      expect(mockAssignmentRepo.findOnePrimaryForStepWithSecondaryUser).toHaveBeenCalledWith(
        COMPANY_ID,
        "reception",
      );
    });

    it("should return null when no primary assignment exists", async () => {
      mockAssignmentRepo.findOnePrimaryForStepWithSecondaryUser.mockResolvedValue(null);

      const result = await service.secondaryUserForStep(COMPANY_ID, "reception");

      expect(result).toBeNull();
    });

    it("should return null when primary has no secondary user", async () => {
      mockAssignmentRepo.findOnePrimaryForStepWithSecondaryUser.mockResolvedValue(
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
      mockAssignmentRepo.findForStepWithUser.mockResolvedValue([
        createAssignment({ userId: 10, user: user1 }),
        createAssignment({ id: 2, userId: 20, user: user2 }),
      ]);

      const result = await service.usersForStep(COMPANY_ID, "reception");

      expect(result).toEqual([user1, user2]);
    });

    it("should fall back to role-based lookup when no assignments exist", async () => {
      mockAssignmentRepo.findForStepWithUser.mockResolvedValue([]);
      const fallbackUsers = [createUser({ id: 30, role: StockControlRole.ADMIN })];
      mockUserRepo.findForCompanyByRoles.mockResolvedValue(fallbackUsers);

      const result = await service.usersForStep(COMPANY_ID, "reception");

      expect(result).toEqual(fallbackUsers);
      expect(mockUserRepo.findForCompanyByRoles).toHaveBeenCalledWith(
        COMPANY_ID,
        expect.any(Array),
      );
    });
  });

  describe("assignedUserIdsForStep", () => {
    it("should return user ids for assigned users", async () => {
      mockAssignmentRepo.findUserIdsForStep.mockResolvedValue([
        { userId: 10 },
        { userId: 20 },
        { userId: 30 },
      ]);

      const result = await service.assignedUserIdsForStep(COMPANY_ID, "reception");

      expect(result).toEqual([10, 20, 30]);
      expect(mockAssignmentRepo.findUserIdsForStep).toHaveBeenCalledWith(COMPANY_ID, "reception");
    });

    it("should return empty array when no assignments exist", async () => {
      mockAssignmentRepo.findUserIdsForStep.mockResolvedValue([]);

      const result = await service.assignedUserIdsForStep(COMPANY_ID, "reception");

      expect(result).toEqual([]);
    });
  });

  describe("hasExplicitAssignments", () => {
    it("should return true when assignments exist", async () => {
      mockAssignmentRepo.countForStep.mockResolvedValue(3);

      const result = await service.hasExplicitAssignments(COMPANY_ID, "reception");

      expect(result).toBe(true);
      expect(mockAssignmentRepo.countForStep).toHaveBeenCalledWith(COMPANY_ID, "reception");
    });

    it("should return false when no assignments exist", async () => {
      mockAssignmentRepo.countForStep.mockResolvedValue(0);

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
      mockUserRepo.findForCompanyByRolesOrdered.mockResolvedValue(users);

      const result = await service.eligibleUsersForStep(COMPANY_ID, "reception");

      expect(result).toEqual([
        { id: 10, name: "Alice", email: "alice@example.com", role: StockControlRole.MANAGER },
        { id: 20, name: "Bob", email: "bob@example.com", role: StockControlRole.ADMIN },
      ]);
      expect(mockUserRepo.findForCompanyByRolesOrdered).toHaveBeenCalledWith(
        COMPANY_ID,
        expect.any(Array),
      );
    });

    it("should return empty array when no eligible users exist", async () => {
      mockUserRepo.findForCompanyByRolesOrdered.mockResolvedValue([]);

      const result = await service.eligibleUsersForStep(COMPANY_ID, "reception");

      expect(result).toEqual([]);
    });
  });

  describe("allNotificationRecipients", () => {
    it("should return recipients grouped by step", async () => {
      mockRecipientRepo.findForCompanyOrdered.mockResolvedValue([
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
      mockRecipientRepo.findForCompanyOrdered.mockResolvedValue([]);

      const result = await service.allNotificationRecipients(COMPANY_ID);

      expect(result).toEqual([]);
    });

    it("should pass correct query options to repository", async () => {
      mockRecipientRepo.findForCompanyOrdered.mockResolvedValue([]);

      await service.allNotificationRecipients(COMPANY_ID);

      expect(mockRecipientRepo.findForCompanyOrdered).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe("notificationRecipientsForStep", () => {
    it("should return sorted emails for a step", async () => {
      mockRecipientRepo.findForStepOrdered.mockResolvedValue([
        createRecipient({ email: "alpha@example.com" }),
        createRecipient({ id: 2, email: "beta@example.com" }),
      ]);

      const result = await service.notificationRecipientsForStep(COMPANY_ID, "reception");

      expect(result).toEqual(["alpha@example.com", "beta@example.com"]);
      expect(mockRecipientRepo.findForStepOrdered).toHaveBeenCalledWith(COMPANY_ID, "reception");
    });

    it("should return empty array when no recipients exist for step", async () => {
      mockRecipientRepo.findForStepOrdered.mockResolvedValue([]);

      const result = await service.notificationRecipientsForStep(COMPANY_ID, "reception");

      expect(result).toEqual([]);
    });
  });

  describe("updateNotificationRecipients", () => {
    it("should delete existing and create new recipients", async () => {
      mockRecipientRepo.deleteForStep.mockResolvedValue(undefined);
      mockRecipientRepo.saveMany.mockResolvedValue([]);

      await service.updateNotificationRecipients(COMPANY_ID, "reception", [
        "a@example.com",
        "b@example.com",
      ]);

      expect(mockRecipientRepo.deleteForStep).toHaveBeenCalledWith(COMPANY_ID, "reception");
      const built = mockRecipientRepo.buildMany.mock.calls[0][0];
      expect(built).toEqual([
        { companyId: COMPANY_ID, workflowStep: "reception", email: "a@example.com" },
        { companyId: COMPANY_ID, workflowStep: "reception", email: "b@example.com" },
      ]);
      expect(mockRecipientRepo.saveMany).toHaveBeenCalledTimes(1);
    });

    it("should only delete when emails array is empty", async () => {
      mockRecipientRepo.deleteForStep.mockResolvedValue(undefined);

      await service.updateNotificationRecipients(COMPANY_ID, "reception", []);

      expect(mockRecipientRepo.deleteForStep).toHaveBeenCalledWith(COMPANY_ID, "reception");
      expect(mockRecipientRepo.buildMany).not.toHaveBeenCalled();
      expect(mockRecipientRepo.saveMany).not.toHaveBeenCalled();
    });

    it("should deduplicate emails and normalize to lowercase", async () => {
      mockRecipientRepo.deleteForStep.mockResolvedValue(undefined);
      mockRecipientRepo.saveMany.mockResolvedValue([]);

      await service.updateNotificationRecipients(COMPANY_ID, "reception", [
        "Test@Example.com",
        "test@example.com",
        "  TEST@EXAMPLE.COM  ",
      ]);

      const built = mockRecipientRepo.buildMany.mock.calls[0][0];
      expect(built).toEqual([
        { companyId: COMPANY_ID, workflowStep: "reception", email: "test@example.com" },
      ]);
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

      mockUserLocationRepo.findForCompanyWithRelations.mockResolvedValue([
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
      mockUserLocationRepo.findForCompanyWithRelations.mockResolvedValue([]);

      const result = await service.allUserLocationAssignments(COMPANY_ID);

      expect(result).toEqual([]);
    });

    it("should pass correct query options to repository", async () => {
      mockUserLocationRepo.findForCompanyWithRelations.mockResolvedValue([]);

      await service.allUserLocationAssignments(COMPANY_ID);

      expect(mockUserLocationRepo.findForCompanyWithRelations).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe("updateUserLocations", () => {
    it("should delete existing and create new location assignments", async () => {
      mockUserLocationRepo.deleteForUser.mockResolvedValue(undefined);
      mockUserLocationRepo.saveMany.mockResolvedValue([]);

      await service.updateUserLocations(COMPANY_ID, 10, [100, 200]);

      expect(mockUserLocationRepo.deleteForUser).toHaveBeenCalledWith(COMPANY_ID, 10);
      const built = mockUserLocationRepo.buildMany.mock.calls[0][0];
      expect(built).toEqual([
        { companyId: COMPANY_ID, userId: 10, locationId: 100 },
        { companyId: COMPANY_ID, userId: 10, locationId: 200 },
      ]);
      expect(mockUserLocationRepo.saveMany).toHaveBeenCalledTimes(1);
    });

    it("should only delete when locationIds is empty", async () => {
      mockUserLocationRepo.deleteForUser.mockResolvedValue(undefined);

      await service.updateUserLocations(COMPANY_ID, 10, []);

      expect(mockUserLocationRepo.deleteForUser).toHaveBeenCalledWith(COMPANY_ID, 10);
      expect(mockUserLocationRepo.buildMany).not.toHaveBeenCalled();
      expect(mockUserLocationRepo.saveMany).not.toHaveBeenCalled();
    });

    it("should deduplicate location ids", async () => {
      mockUserLocationRepo.deleteForUser.mockResolvedValue(undefined);
      mockUserLocationRepo.saveMany.mockResolvedValue([]);

      await service.updateUserLocations(COMPANY_ID, 10, [100, 100, 200, 200]);

      const built = mockUserLocationRepo.buildMany.mock.calls[0][0];
      expect(built).toHaveLength(2);
    });
  });

  describe("locationIdsForUser", () => {
    it("should return location ids for the user", async () => {
      mockUserLocationRepo.findForUser.mockResolvedValue([
        { locationId: 100 },
        { locationId: 200 },
        { locationId: 300 },
      ]);

      const result = await service.locationIdsForUser(COMPANY_ID, 10);

      expect(result).toEqual([100, 200, 300]);
      expect(mockUserLocationRepo.findForUser).toHaveBeenCalledWith(COMPANY_ID, 10);
    });

    it("should return empty array when user has no location assignments", async () => {
      mockUserLocationRepo.findForUser.mockResolvedValue([]);

      const result = await service.locationIdsForUser(COMPANY_ID, 10);

      expect(result).toEqual([]);
    });
  });
});
