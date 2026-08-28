import { describe, it, expect } from "vitest";
import { ASSET_EXPORT_COLUMNS, ASSET_CONDITIONS } from "../../app/portal/admin/assets/asset-constants";

// Phase 9: the inventory structure must reproduce the client's Excel
// "Office Computer Inventory" sheet EXACTLY, minus "Installed Sangfor"
// and "PMS" which the client explicitly removed.

const EXPECTED_COLUMNS = [
  "Re",
  "ICT Asset",
  "Manufacturer",
  "Model",
  "Serial Number",
  "Specification",
  "Asset Number",
  "Date Acquired",
  "Name or ID of Accountable Personnel",
  "Position of Accountable Personnel",
  "Condition",
  "Department / Office (Location)",
  "BLDG.",
  "Remarks",
  "Domain Name",
  "Computer Name",
];

describe("asset inventory structure", () => {
  it("has exactly the 16 Excel columns, in order", () => {
    expect(ASSET_EXPORT_COLUMNS).toEqual(EXPECTED_COLUMNS);
    expect(ASSET_EXPORT_COLUMNS).toHaveLength(16);
  });

  it("does NOT contain the removed PMS and Installed Sangfor fields", () => {
    const cols = ASSET_EXPORT_COLUMNS.map((c) => c.toLowerCase());
    expect(cols.some((c) => c.includes("pms"))).toBe(false);
    expect(cols.some((c) => c.includes("sangfor"))).toBe(false);
  });

  it("keeps the removed fields out of the condition options", () => {
    expect(ASSET_CONDITIONS.length).toBeGreaterThan(0);
    expect(ASSET_CONDITIONS.map((c) => c.toLowerCase()).some((c) => c.includes("sangfor") || c.includes("pms"))).toBe(false);
  });
});
