import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AdminAuthService } from "../admin/admin-auth.service";
import { AnyUserAuthGuard } from "../auth/guards/any-user-auth.guard";
import { CustomerAuthService } from "../customer/customer-auth.service";
import { SupplierAuthService } from "../supplier/supplier-auth.service";
import { signFilePath } from "./file-url-signature";
import { FilesController } from "./files.controller";

describe("FilesController (integration)", () => {
  let app: INestApplication;
  let uploadDir: string;
  const relativePath = "stock-control/company-1/job-cards/secret.txt";
  const fileContents = "confidential job card attachment";
  const signingSecret = "test-file-url-signing-secret";

  const configStub = (uploadRoot: string): Partial<ConfigService> => ({
    get: jest.fn((key: string) => {
      if (key === "UPLOAD_DIR") return uploadRoot;
      if (key === "FILE_URL_SIGNING_SECRET") return signingSecret;
      return null;
    }) as never,
  });

  const buildApp = async (bearerAllowed: boolean): Promise<INestApplication> => {
    const compiled: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: AnyUserAuthGuard,
          useValue: { canActivate: jest.fn().mockResolvedValue(bearerAllowed) },
        },
        { provide: ConfigService, useValue: configStub(uploadDir) },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: AdminAuthService, useValue: {} },
        { provide: CustomerAuthService, useValue: {} },
        { provide: SupplierAuthService, useValue: {} },
      ],
    }).compile();

    const built = compiled.createNestApplication();
    built.setGlobalPrefix("api");
    await built.init();
    return built;
  };

  const signedQuery = (filePath: string, expMillis: number): string => {
    const sig = signFilePath(filePath, expMillis, signingSecret);
    return `exp=${expMillis}&sig=${sig}`;
  };

  beforeAll(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "annix-files-"));
    const fullPath = path.join(uploadDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, fileContents);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  afterAll(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it("returns 401 when neither a signature nor a bearer token is supplied", async () => {
    app = await buildApp(false);

    await request(app.getHttpServer()).get(`/api/files/${relativePath}`).expect(401);
  });

  it("streams the file for a valid short-lived signed URL", async () => {
    app = await buildApp(false);

    const exp = Date.now() + 60_000;
    const response = await request(app.getHttpServer())
      .get(`/api/files/${relativePath}?${signedQuery(relativePath, exp)}`)
      .expect(200);

    expect(response.text).toBe(fileContents);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.headers["cache-control"]).toContain("no-store");
  });

  it("returns 401 for a tampered signature", async () => {
    app = await buildApp(false);

    const exp = Date.now() + 60_000;
    const sig = signFilePath(relativePath, exp, signingSecret);
    const tampered = `${sig.slice(0, -1)}${sig.endsWith("a") ? "b" : "a"}`;

    await request(app.getHttpServer())
      .get(`/api/files/${relativePath}?exp=${exp}&sig=${tampered}`)
      .expect(401);
  });

  it("returns 401 for an expired signature", async () => {
    app = await buildApp(false);

    const exp = Date.now() - 1_000;
    await request(app.getHttpServer())
      .get(`/api/files/${relativePath}?${signedQuery(relativePath, exp)}`)
      .expect(401);
  });

  it("returns 401 when a valid signature is presented for a different path (IDOR)", async () => {
    app = await buildApp(false);

    const exp = Date.now() + 60_000;
    const sigForOtherPath = signFilePath("stock-control/company-2/other.txt", exp, signingSecret);

    await request(app.getHttpServer())
      .get(`/api/files/${relativePath}?exp=${exp}&sig=${sigForOtherPath}`)
      .expect(401);
  });

  it("streams the file for a valid bearer token without a signature", async () => {
    app = await buildApp(true);

    const response = await request(app.getHttpServer())
      .get(`/api/files/${relativePath}`)
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(response.text).toBe(fileContents);
  });

  it("rejects an encoded path-traversal attempt with 400", async () => {
    app = await buildApp(true);

    await request(app.getHttpServer())
      .get("/api/files/stock-control/..%2f..%2f..%2f..%2fetc%2fpasswd")
      .expect(400);
  });

  it("returns 404 for a signed path inside the upload dir that does not exist", async () => {
    app = await buildApp(false);

    const missingPath = "stock-control/company-1/job-cards/missing.txt";
    const exp = Date.now() + 60_000;
    await request(app.getHttpServer())
      .get(`/api/files/${missingPath}?${signedQuery(missingPath, exp)}`)
      .expect(404);
  });
});
