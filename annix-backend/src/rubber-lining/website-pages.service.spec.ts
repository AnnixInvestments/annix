import { NotFoundException } from "@nestjs/common";
import { WebsitePage } from "./entities/website-page.entity";
import type { WebsitePageRepository } from "./repositories/website-page.repository";
import { WebsitePagesService } from "./website-pages.service";

function makePage(overrides: Partial<WebsitePage> = {}): WebsitePage {
  return {
    id: "page-1",
    slug: "rubber-lining",
    title: "Rubber Lining",
    draftBlocks: null,
    publishedBlocks: null,
    draftUpdatedAt: null,
    lastPublishedAt: null,
    lastPublishedBy: null,
    ...overrides,
  } as unknown as WebsitePage;
}

describe("WebsitePagesService block draft/publish", () => {
  let repo: { findById: jest.Mock; save: jest.Mock };
  let service: WebsitePagesService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      save: jest.fn(async (page: WebsitePage) => page),
    };
    service = new WebsitePagesService(repo as unknown as WebsitePageRepository);
  });

  it("saveDraftBlocks stores the blocks and stamps draftUpdatedAt", async () => {
    const page = makePage();
    repo.findById.mockResolvedValue(page);
    const blocks = [{ type: "richText", markdown: "hello" }];

    const result = await service.saveDraftBlocks("page-1", blocks);

    expect(result.draftBlocks).toEqual(blocks);
    expect(result.draftUpdatedAt).toBeTruthy();
    expect(result.publishedBlocks).toBeNull();
    expect(repo.save).toHaveBeenCalledWith(page);
  });

  it("publishBlocks copies the draft to published and records the publisher", async () => {
    const blocks = [{ type: "hero", headline: "Welcome" }];
    const page = makePage({ draftBlocks: blocks, publishedBlocks: null });
    repo.findById.mockResolvedValue(page);

    const result = await service.publishBlocks("page-1", "admin@example.com");

    expect(result.publishedBlocks).toEqual(blocks);
    expect(result.draftBlocks).toEqual(blocks);
    expect(result.lastPublishedBy).toBe("admin@example.com");
    expect(result.lastPublishedAt).toBeTruthy();
  });

  it("discardDraftBlocks reverts the draft to the published copy", async () => {
    const published = [{ type: "richText", markdown: "live" }];
    const page = makePage({
      draftBlocks: [{ type: "richText", markdown: "work-in-progress" }],
      publishedBlocks: published,
    });
    repo.findById.mockResolvedValue(page);

    const result = await service.discardDraftBlocks("page-1");

    expect(result.draftBlocks).toEqual(published);
  });

  it("throws NotFoundException when the page does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.saveDraftBlocks("missing", [])).rejects.toBeInstanceOf(NotFoundException);
  });
});
