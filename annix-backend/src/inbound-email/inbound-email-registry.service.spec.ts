import { Test, TestingModule } from "@nestjs/testing";
import { InboundEmailRegistry } from "./inbound-email-registry.service";
import { IDocumentClassifier } from "./interfaces/document-classifier.interface";
import { IDocumentRouter } from "./interfaces/document-router.interface";
import { EmailAppAdapter } from "./interfaces/email-app-adapter.interface";

describe("InboundEmailRegistry", () => {
  let registry: InboundEmailRegistry;

  const fakeClassifier: IDocumentClassifier = {
    classifyFromSubject: jest.fn(),
    classifyFromContent: jest.fn(),
  };

  const fakeRouter: IDocumentRouter = {
    route: jest.fn(),
    supportedMimeTypes: jest.fn().mockReturnValue(["application/pdf"]),
  };

  const fakeAdapter: EmailAppAdapter = {
    appName: () => "test-app",
    classifyFromSubject: jest.fn(),
    classifyFromContent: jest.fn(),
    route: jest.fn(),
    supportedMimeTypes: jest.fn().mockReturnValue(["application/pdf"]),
    resolveCompanyId: jest.fn().mockResolvedValue(42),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InboundEmailRegistry],
    }).compile();

    registry = module.get<InboundEmailRegistry>(InboundEmailRegistry);
  });

  describe("legacy registerApp path", () => {
    it("registers classifier and router under appName", () => {
      registry.registerApp("legacy-app", fakeClassifier, fakeRouter);

      expect(registry.isRegistered("legacy-app")).toBe(true);
      expect(registry.classifierForApp("legacy-app")).toBe(fakeClassifier);
      expect(registry.routerForApp("legacy-app")).toBe(fakeRouter);
    });

    it("leaves adapterForApp null for legacy registrations", () => {
      registry.registerApp("legacy-app", fakeClassifier, fakeRouter);
      expect(registry.adapterForApp("legacy-app")).toBeNull();
    });
  });

  describe("registerAdapter path", () => {
    it("registers adapter as both classifier and router", () => {
      registry.registerAdapter(fakeAdapter);

      expect(registry.isRegistered("test-app")).toBe(true);
      expect(registry.classifierForApp("test-app")).toBe(fakeAdapter);
      expect(registry.routerForApp("test-app")).toBe(fakeAdapter);
      expect(registry.adapterForApp("test-app")).toBe(fakeAdapter);
    });

    it("uses adapter.appName() as the key", () => {
      registry.registerAdapter(fakeAdapter);
      expect(registry.registeredApps()).toContain("test-app");
    });

    it("overwrites prior registration with the same appName", () => {
      registry.registerApp("test-app", fakeClassifier, fakeRouter);
      registry.registerAdapter(fakeAdapter);

      expect(registry.adapterForApp("test-app")).toBe(fakeAdapter);
      expect(registry.classifierForApp("test-app")).toBe(fakeAdapter);
    });
  });

  describe("lookup methods", () => {
    it("returns null for unregistered app", () => {
      expect(registry.classifierForApp("missing")).toBeNull();
      expect(registry.routerForApp("missing")).toBeNull();
      expect(registry.adapterForApp("missing")).toBeNull();
      expect(registry.isRegistered("missing")).toBe(false);
    });

    it("registeredApps returns all keys", () => {
      registry.registerApp("app-a", fakeClassifier, fakeRouter);
      registry.registerAdapter(fakeAdapter);

      const apps = registry.registeredApps();
      expect(apps).toContain("app-a");
      expect(apps).toContain("test-app");
      expect(apps).toHaveLength(2);
    });
  });
});
