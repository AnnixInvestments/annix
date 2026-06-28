import { NotFoundException } from "@nestjs/common";
import { ContactRepository } from "./contact.repository";
import { ContactService } from "./contact.service";

describe("ContactService", () => {
  let repo: {
    findByCompanyAndId: jest.Mock;
    save: jest.Mock;
  };
  let service: ContactService;

  beforeEach(() => {
    repo = {
      findByCompanyAndId: jest.fn(),
      save: jest.fn(),
    };
    service = new ContactService(repo as unknown as ContactRepository);
  });

  it("updates Sage mapping only after loading the contact within the route company", async () => {
    const contact = {
      id: 12,
      companyId: 7,
      sageContactId: null,
      sageContactType: null,
    };
    repo.findByCompanyAndId.mockResolvedValue(contact);
    repo.save.mockImplementation(async (saved) => saved);

    await expect(service.updateSageMapping(7, 12, 99, "SUPPLIER")).resolves.toEqual({
      id: 12,
      companyId: 7,
      sageContactId: 99,
      sageContactType: "SUPPLIER",
    });

    expect(repo.findByCompanyAndId).toHaveBeenCalledWith(7, 12);
  });

  it("rejects Sage mapping updates for contacts outside the route company", async () => {
    repo.findByCompanyAndId.mockResolvedValue(null);

    await expect(service.updateSageMapping(7, 12, 99, "SUPPLIER")).rejects.toThrow(
      NotFoundException,
    );

    expect(repo.save).not.toHaveBeenCalled();
  });
});
