import { isNumber, isObject, toPairs } from "es-toolkit/compat";
import { MongoWorkflowStepConfigRepository } from "./workflow-step-config.repository.mongo";

// M1b storage-layer suite: WorkflowStepConfig rows are now embedded as an array
// on the StockControlCompany document. There is no live Mongo / mongodb-memory-
// server in this repo (the storage specs use hand-rolled in-memory fakes of the
// exact Mongoose query subset each repository touches), so we follow that
// convention and exercise the REAL repository code paths against faithful fakes
// of the company collection, the legacy workflow_step_configs collection, and
// the counters collection used for id sequencing.

type Doc = Record<string, unknown>;

const COMPANY_ID = 1;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function matchesFilter(doc: Doc, filter: Doc): boolean {
  return toPairs(filter).every(([key, condition]) => {
    if (key === "workflowStepConfigs.id") {
      const arr = (doc.workflowStepConfigs as Doc[] | null | undefined) ?? [];
      return arr.some((el) => el.id === condition);
    }
    const value = doc[key];
    if (condition !== null && isObject(condition)) {
      const cond = condition as Doc;
      if ("$type" in cond) {
        return cond.$type === "number" ? isNumber(value) : value != null;
      }
    }
    return value === condition;
  });
}

class FakeCollection {
  constructor(public rows: Doc[]) {}

  findOne(filter: Doc, _projection?: Doc) {
    const rows = this.rows;
    return {
      session() {
        return this;
      },
      lean() {
        return this;
      },
      async exec() {
        const found = rows.find((row) => matchesFilter(row, filter));
        return found ? deepClone(found) : null;
      },
    };
  }

  find(filter: Doc = {}) {
    let working = this.rows.filter((row) => matchesFilter(row, filter));
    const api = {
      sort(spec: Record<string, number>) {
        const [field, dir] = toPairs(spec)[0];
        working = [...working].sort((a, b) => ((a[field] as number) - (b[field] as number)) * dir);
        return api;
      },
      limit(n: number) {
        working = working.slice(0, n);
        return api;
      },
      session() {
        return api;
      },
      lean() {
        return api;
      },
      async exec() {
        return working.map((row) => deepClone(row));
      },
    };
    return api;
  }

  updateOne(filter: Doc, update: Doc, _opts?: Doc) {
    const rows = this.rows;
    return {
      async exec() {
        const target = rows.find((row) => matchesFilter(row, filter));
        const set = (update.$set as Doc) ?? {};
        if (target) {
          Object.assign(target, deepClone(set));
        }
        return { modifiedCount: target ? 1 : 0 };
      },
    };
  }
}

class FakeCounters {
  seq = 0;
  async findOneAndUpdate(_filter: Doc, _update: Doc, _opts: Doc) {
    this.seq += 1;
    return { _id: "workflow_step_configs", seq: this.seq };
  }
  async updateOne() {
    return undefined;
  }
}

function buildRepo(options: { companyRows: Doc[]; legacyRows: Doc[] }) {
  const companyCollection = new FakeCollection(options.companyRows);
  const legacyCollection = new FakeCollection(options.legacyRows);
  const counters = new FakeCounters();

  const sharedDb = { db: { collection: () => counters } };

  const companyModel = {
    db: sharedDb,
    findOne: (filter: Doc, projection?: Doc) => companyCollection.findOne(filter, projection),
    updateOne: (filter: Doc, update: Doc, opts?: Doc) =>
      companyCollection.updateOne(filter, update, opts),
  };

  const legacyModel = {
    db: sharedDb,
    schema: { path: () => ({ instance: "Number" }) },
    collection: { collectionName: "workflow_step_configs" },
    find: (filter?: Doc) => legacyCollection.find(filter),
    updateOne: (filter: Doc, update: Doc, opts?: Doc) =>
      legacyCollection.updateOne(filter, update, opts),
  };

  const repo = new MongoWorkflowStepConfigRepository(legacyModel as never, companyModel as never);

  return { repo, companyCollection, counters };
}

const embeddedStep = (overrides: Doc = {}): Doc => ({
  id: 1,
  companyId: COMPANY_ID,
  key: "admin_approval",
  label: "Admin",
  sortOrder: 1,
  isSystem: true,
  isBackground: false,
  triggerAfterStep: null,
  actionLabel: "Accept Job",
  branchColor: null,
  phaseActionLabels: null,
  stepOutcomes: null,
  branchType: null,
  rejoinAtStep: null,
  ...overrides,
});

const seededCompany = (steps: Doc[]): Doc => ({ _id: COMPANY_ID, workflowStepConfigs: steps });

const fgAndBgSteps = (): Doc[] => [
  embeddedStep({ id: 1, key: "admin_approval", sortOrder: 1 }),
  embeddedStep({ id: 2, key: "manager_approval", label: "Manager", sortOrder: 2 }),
  embeddedStep({ id: 3, key: "quality_check", label: "Quality", sortOrder: 3 }),
  embeddedStep({
    id: 10,
    key: "document_upload",
    label: "Docs",
    sortOrder: 2,
    isBackground: true,
    triggerAfterStep: "admin_approval",
  }),
  embeddedStep({
    id: 11,
    key: "stock_allocation",
    label: "Stock",
    sortOrder: 1,
    isBackground: true,
    triggerAfterStep: "admin_approval",
  }),
];

describe("MongoWorkflowStepConfigRepository (embedded array)", () => {
  describe("reads against the embedded array", () => {
    it("returns ordered foreground steps sorted by sortOrder", async () => {
      const { repo } = buildRepo({
        companyRows: [seededCompany(fgAndBgSteps())],
        legacyRows: [],
      });

      const result = await repo.findOrderedForeground(COMPANY_ID);

      expect(result.map((s) => s.key)).toEqual([
        "admin_approval",
        "manager_approval",
        "quality_check",
      ]);
      expect(result.every((s) => s.isBackground === false)).toBe(true);
    });

    it("returns ordered background steps sorted by sortOrder", async () => {
      const { repo } = buildRepo({
        companyRows: [seededCompany(fgAndBgSteps())],
        legacyRows: [],
      });

      const result = await repo.findOrderedBackground(COMPANY_ID);

      expect(result.map((s) => s.key)).toEqual(["stock_allocation", "document_upload"]);
    });

    it("filters background steps by trigger", async () => {
      const { repo } = buildRepo({
        companyRows: [
          seededCompany([
            ...fgAndBgSteps(),
            embeddedStep({
              id: 12,
              key: "inspection",
              sortOrder: 1,
              isBackground: true,
              triggerAfterStep: "manager_approval",
            }),
          ]),
        ],
        legacyRows: [],
      });

      const result = await repo.findBackgroundForTrigger(COMPANY_ID, "admin_approval");

      expect(result.map((s) => s.key)).toEqual(["stock_allocation", "document_upload"]);
    });

    it("finds one step by key and foreground-only by key", async () => {
      const { repo } = buildRepo({
        companyRows: [seededCompany(fgAndBgSteps())],
        legacyRows: [],
      });

      const byKey = await repo.findOneForCompanyByKey(COMPANY_ID, "document_upload");
      const fgByKey = await repo.findOneForegroundForCompanyByKey(COMPANY_ID, "document_upload");

      expect(byKey?.key).toBe("document_upload");
      expect(fgByKey).toBeNull();
    });
  });

  describe("legacy dual-read fallback (un-migrated company)", () => {
    it("reads from the legacy collection when workflowStepConfigs is absent", async () => {
      const { repo } = buildRepo({
        companyRows: [{ _id: COMPANY_ID }],
        legacyRows: [
          {
            _id: 5,
            companyId: COMPANY_ID,
            key: "admin_approval",
            sortOrder: 1,
            isBackground: false,
          },
          {
            _id: 6,
            companyId: COMPANY_ID,
            key: "manager_approval",
            sortOrder: 2,
            isBackground: false,
          },
        ],
      });

      const result = await repo.findOrderedForeground(COMPANY_ID);

      expect(result.map((s) => s.key)).toEqual(["admin_approval", "manager_approval"]);
      expect(result[0].id).toBe(5);
    });

    it("reads from legacy when the company doc does not exist", async () => {
      const { repo } = buildRepo({
        companyRows: [],
        legacyRows: [
          { _id: 7, companyId: COMPANY_ID, key: "x", sortOrder: 1, isBackground: false },
        ],
      });

      const result = await repo.findForCompany(COMPANY_ID);

      expect(result.map((s) => s.key)).toEqual(["x"]);
    });
  });

  describe("lazy-init on first write", () => {
    it("backfills the array from legacy rows before applying the write", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [{ _id: COMPANY_ID }],
        legacyRows: [
          {
            _id: 5,
            companyId: COMPANY_ID,
            key: "admin_approval",
            sortOrder: 1,
            isBackground: false,
          },
        ],
      });

      await repo.updateByCompanyAndKey(COMPANY_ID, "admin_approval", { label: "Renamed" });

      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      expect(stored).toHaveLength(1);
      expect(stored[0].key).toBe("admin_approval");
      expect(stored[0].label).toBe("Renamed");
      expect(stored[0].id).toBe(5);
    });
  });

  describe("create / saveForCompany / removeForCompany", () => {
    it("create appends a new element with an allocated id and returns it", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [seededCompany([embeddedStep({ id: 1 })])],
        legacyRows: [],
      });

      const created = await repo.create({
        companyId: COMPANY_ID,
        key: "custom_new",
        label: "New",
        sortOrder: 2,
        isSystem: false,
        isBackground: false,
      });

      expect(typeof created.id).toBe("number");
      expect(created.key).toBe("custom_new");
      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      expect(stored.map((s) => s.key)).toEqual(["admin_approval", "custom_new"]);
    });

    it("saveForCompany replaces the matching element by key and preserves its id", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [
          seededCompany([embeddedStep({ id: 9, key: "custom_step", isBackground: false })]),
        ],
        legacyRows: [],
      });

      const saved = await repo.saveForCompany(COMPANY_ID, {
        id: 9,
        companyId: COMPANY_ID,
        key: "custom_step",
        label: "Custom",
        sortOrder: 0,
        isSystem: false,
        isBackground: true,
        triggerAfterStep: "admin_approval",
      } as never);

      expect(saved.id).toBe(9);
      expect(saved.isBackground).toBe(true);
      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      expect(stored).toHaveLength(1);
      expect(stored[0].triggerAfterStep).toBe("admin_approval");
    });

    it("removeForCompany drops the element by key", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [
          seededCompany([
            embeddedStep({ id: 1, key: "admin_approval" }),
            embeddedStep({ id: 2, key: "custom_step", isSystem: false }),
          ]),
        ],
        legacyRows: [],
      });

      await repo.removeForCompany(COMPANY_ID, {
        id: 2,
        companyId: COMPANY_ID,
        key: "custom_step",
      } as never);

      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      expect(stored.map((s) => s.key)).toEqual(["admin_approval"]);
    });
  });

  describe("insertManyIgnore dedup", () => {
    it("inserts only keys not already present", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [seededCompany([embeddedStep({ id: 1, key: "admin_approval" })])],
        legacyRows: [],
      });

      await repo.insertManyIgnore([
        { companyId: COMPANY_ID, key: "admin_approval", label: "Dup", isBackground: false },
        { companyId: COMPANY_ID, key: "brand_new", label: "Brand New", isBackground: false },
      ]);

      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      expect(stored.map((s) => s.key)).toEqual(["admin_approval", "brand_new"]);
      expect(stored.find((s) => s.key === "admin_approval")?.label).toBe("Admin");
    });
  });

  describe("updateByCompanyAndKey", () => {
    it("returns modified count and applies updates", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [seededCompany([embeddedStep({ id: 1, key: "admin_approval" })])],
        legacyRows: [],
      });

      const modified = await repo.updateByCompanyAndKey(COMPANY_ID, "admin_approval", {
        actionLabel: null,
      });

      expect(modified).toBe(1);
      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      expect(stored[0].actionLabel).toBeNull();
    });

    it("returns 0 when no key matches", async () => {
      const { repo } = buildRepo({
        companyRows: [seededCompany([embeddedStep({ id: 1, key: "admin_approval" })])],
        legacyRows: [],
      });

      const modified = await repo.updateByCompanyAndKey(COMPANY_ID, "nope", { label: "x" });

      expect(modified).toBe(0);
    });
  });

  describe("updateById (reorder/bulkReorder path)", () => {
    it("locates the owning company by element id and updates the element", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [
          seededCompany([
            embeddedStep({ id: 1, key: "admin_approval", sortOrder: 1 }),
            embeddedStep({ id: 2, key: "manager_approval", sortOrder: 2 }),
          ]),
        ],
        legacyRows: [],
      });

      await repo.updateById(2, { sortOrder: 1 });
      await repo.updateById(1, { sortOrder: 2 });

      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      const byKey = new Map(stored.map((s) => [s.key, s.sortOrder]));
      expect(byKey.get("admin_approval")).toBe(2);
      expect(byKey.get("manager_approval")).toBe(1);
    });
  });

  describe("updateTriggerAfterStep", () => {
    it("rewrites triggerAfterStep on matching elements", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [
          seededCompany([
            embeddedStep({
              id: 10,
              key: "document_upload",
              isBackground: true,
              triggerAfterStep: "middle_step",
            }),
            embeddedStep({
              id: 11,
              key: "stock_allocation",
              isBackground: true,
              triggerAfterStep: "middle_step",
            }),
            embeddedStep({
              id: 12,
              key: "other",
              isBackground: true,
              triggerAfterStep: "admin_approval",
            }),
          ]),
        ],
        legacyRows: [],
      });

      await repo.updateTriggerAfterStep(COMPANY_ID, "middle_step", "admin_approval");

      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      expect(stored.every((s) => s.triggerAfterStep === "admin_approval")).toBe(true);
    });
  });

  describe("bumpSortOrderAfter", () => {
    it("increments sortOrder for elements strictly greater than the threshold", async () => {
      const { repo, companyCollection } = buildRepo({
        companyRows: [
          seededCompany([
            embeddedStep({ id: 1, key: "a", sortOrder: 1 }),
            embeddedStep({ id: 2, key: "b", sortOrder: 2 }),
            embeddedStep({ id: 3, key: "c", sortOrder: 3 }),
          ]),
        ],
        legacyRows: [],
      });

      await repo.bumpSortOrderAfter(COMPANY_ID, 1);

      const stored = companyCollection.rows[0].workflowStepConfigs as Doc[];
      const byKey = new Map(stored.map((s) => [s.key, s.sortOrder]));
      expect(byKey.get("a")).toBe(1);
      expect(byKey.get("b")).toBe(3);
      expect(byKey.get("c")).toBe(4);
    });
  });
});
