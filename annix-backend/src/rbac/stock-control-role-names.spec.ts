import { StockControlRole } from "../stock-control/entities/stock-control-user.entity";
import { STOCK_CONTROL_ROLE_NAMES } from "./rbac.service";

describe("STOCK_CONTROL_ROLE_NAMES", () => {
  it("maps every StockControlRole enum value to a display label", () => {
    const enumValues = Object.values(StockControlRole);
    const missing = enumValues.filter((role) => !STOCK_CONTROL_ROLE_NAMES[role]);
    expect(missing).toEqual([]);
  });

  it.each([
    ["storeman", "Storeman"],
    ["accounts", "Accounts"],
    ["manager", "Manager"],
    ["admin", "Administrator"],
  ])("maps %s to %s", (roleCode, expectedLabel) => {
    expect(STOCK_CONTROL_ROLE_NAMES[roleCode]).toBe(expectedLabel);
  });

  it("returns undefined for unknown role codes so callers can fall back", () => {
    expect(STOCK_CONTROL_ROLE_NAMES.nonexistent).toBeUndefined();
    expect(STOCK_CONTROL_ROLE_NAMES["fabricator"]).toBeUndefined();
  });

  it("uses 'Administrator' not 'Admin' for the admin role", () => {
    expect(STOCK_CONTROL_ROLE_NAMES.admin).toBe("Administrator");
    expect(STOCK_CONTROL_ROLE_NAMES.admin).not.toBe("Admin");
  });
});
