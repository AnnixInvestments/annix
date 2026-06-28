import type { LineItemImportRow } from "../services/job-card-import.service";
import { isValidLineItem } from "./line-item-validation";

function row(fields: Partial<LineItemImportRow>): LineItemImportRow {
  return { quantity: "1", ...fields };
}

describe("isValidLineItem — QC document filtering", () => {
  it("drops quality-document rows that are not real line items", () => {
    expect(isValidLineItem(row({ itemDescription: "QC Data Book" }))).toBe(false);
    expect(isValidLineItem(row({ itemDescription: "Data Book" }))).toBe(false);
    expect(isValidLineItem(row({ itemDescription: "Data Pack" }))).toBe(false);
    expect(isValidLineItem(row({ itemDescription: "Inspection and Test Plan" }))).toBe(false);
    expect(isValidLineItem(row({ itemDescription: "Inspection & Test Plan Rev 2" }))).toBe(false);
    expect(isValidLineItem(row({ itemDescription: "QCP Rev 2" }))).toBe(false);
  });

  it("keeps legitimate fabrication line items that merely look similar", () => {
    expect(isValidLineItem(row({ itemDescription: "Data plate SS316" }))).toBe(true);
    expect(isValidLineItem(row({ itemNo: "CD1-6150", itemDescription: "Cyclone Body" }))).toBe(
      true,
    );
    expect(isValidLineItem(row({ itemDescription: "100 NB PIPE 6000 LG" }))).toBe(true);
    expect(isValidLineItem(row({ itemNo: "CD1-6148", itemDescription: "Overflow Tank" }))).toBe(
      true,
    );
  });
});
