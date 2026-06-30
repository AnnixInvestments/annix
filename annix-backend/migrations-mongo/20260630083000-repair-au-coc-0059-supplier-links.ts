import type { mongo } from "mongoose";

type NumericDoc = { _id: number; [key: string]: unknown };

const DELIVERY_NOTES = "rubber_delivery_notes";
const AU_COCS = "rubber_au_cocs";

const BAD_COC_ID = 259;
const CORRECT_CALENDERER_COC_ID = 255;
const CORRECT_COMPOUNDER_COC_ID = 169;
const REPAIRED_DELIVERY_NOTE_IDS = [310, 312];

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection<NumericDoc>(DELIVERY_NOTES).updateMany(
    {
      _id: { $in: REPAIRED_DELIVERY_NOTE_IDS },
      linkedCocId: BAD_COC_ID,
    },
    {
      $set: {
        linkedCocId: CORRECT_CALENDERER_COC_ID,
        updatedAt: new Date(),
      },
    },
  );

  await db.collection<NumericDoc>(AU_COCS).updateOne(
    {
      _id: 84,
      cocNumber: "AU-COC-0059",
      sourceDeliveryNoteId: 312,
      readinessStatus: "WAITING_FOR_CALENDERER_COC",
    },
    {
      $set: {
        readinessStatus: "WAITING_FOR_GRAPH",
        readinessDetails: {
          calendererCocId: CORRECT_CALENDERER_COC_ID,
          compounderCocId: CORRECT_COMPOUNDER_COC_ID,
          graphPdfPath: null,
          calendererApproved: true,
          compounderApproved: true,
          missingDocuments: ["Rheometer graph PDF"],
          lastCheckedAt: new Date(),
        },
        updatedAt: new Date(),
      },
    },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection<NumericDoc>(DELIVERY_NOTES).updateMany(
    {
      _id: { $in: REPAIRED_DELIVERY_NOTE_IDS },
      linkedCocId: CORRECT_CALENDERER_COC_ID,
    },
    {
      $set: {
        linkedCocId: BAD_COC_ID,
        updatedAt: new Date(),
      },
    },
  );

  await db.collection<NumericDoc>(AU_COCS).updateOne(
    {
      _id: 84,
      cocNumber: "AU-COC-0059",
      sourceDeliveryNoteId: 312,
      readinessStatus: "WAITING_FOR_GRAPH",
    },
    {
      $set: {
        readinessStatus: "WAITING_FOR_CALENDERER_COC",
        readinessDetails: {
          calendererCocId: null,
          compounderCocId: null,
          graphPdfPath: null,
          calendererApproved: false,
          compounderApproved: false,
          missingDocuments: [
            "No approved BSCA38 supplier CoC with batch data found for rolls 42938, 42939, 42940, 42941, 42935, 42936, 42937, 42938",
          ],
          lastCheckedAt: new Date(),
        },
        updatedAt: new Date(),
      },
    },
  );
};
