import { MongoRubberDeliveryNoteItemRepository } from "./rubber-delivery-note-item.repository.mongo";

describe("MongoRubberDeliveryNoteItemRepository", () => {
  it("upserts edited and newly-added delivery note items instead of inserting every row", async () => {
    const repo = new MongoRubberDeliveryNoteItemRepository({} as never);
    const existing = { id: 437, deliveryNoteId: 340, rollNumber: "43949" };
    const added = { deliveryNoteId: 340, rollNumber: "43950" };
    const save = jest
      .spyOn(repo, "save")
      .mockImplementation((entity) => Promise.resolve(entity as never));
    const create = jest.spyOn(repo, "create").mockResolvedValue({} as never);

    const result = await repo.saveMany([existing, added] as never);

    expect(result).toEqual([existing, added]);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenNthCalledWith(1, existing);
    expect(save).toHaveBeenNthCalledWith(2, added);
    expect(create).not.toHaveBeenCalled();
  });
});
