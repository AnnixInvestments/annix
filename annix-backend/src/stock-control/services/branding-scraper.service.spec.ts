import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PuppeteerPoolService } from "../../shared/services/puppeteer-pool.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { BrandingScraperService } from "./branding-scraper.service";

describe("BrandingScraperService SSRF guard", () => {
  let service: BrandingScraperService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandingScraperService,
        { provide: STORAGE_SERVICE, useValue: { upload: jest.fn() } },
        { provide: PuppeteerPoolService, useValue: { executeWithPage: jest.fn() } },
      ],
    }).compile();

    service = module.get<BrandingScraperService>(BrandingScraperService);
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const blockedUrls = [
    "http://localhost/img.png",
    "http://127.0.0.1/img.png",
    "http://127.5.5.5/img.png",
    "http://10.0.0.5/img.png",
    "http://172.16.0.1/img.png",
    "http://172.31.255.255/img.png",
    "http://192.168.1.1/img.png",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0/img.png",
    "http://metadata.google.internal/img",
    "http://[::1]/img.png",
    "http://[fe80::1]/img.png",
    "http://[fc00::1]/img.png",
  ];

  it.each(blockedUrls)("rejects private/loopback/metadata target %s", async (url) => {
    await expect(service.proxyImage(url)).rejects.toThrow(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects non-http(s) schemes", async () => {
    await expect(service.proxyImage("file:///etc/passwd")).rejects.toThrow(BadRequestException);
    await expect(service.proxyImage("ftp://example.com/x")).rejects.toThrow(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects malformed URLs", async () => {
    await expect(service.proxyImage("not a url")).rejects.toThrow(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Redirect-target re-validation is enforced inside `safeFetch`, which runs
  // `assertSafeOutboundUrl` on every hop (including the `location` of a 3xx) and
  // pins the connect-time IP via a guarded DNS lookup. The blocked-host cases
  // above prove that check rejects every private/loopback/metadata target, so a
  // redirect landing on one is refused before the hop is requested. A
  // transport-level redirect test belongs in a `safe-outbound-fetch` lib spec.
});
