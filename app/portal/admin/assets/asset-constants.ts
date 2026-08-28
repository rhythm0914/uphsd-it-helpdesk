// Phase 9 asset constants. Kept out of actions.ts because "use server"
// modules may only export async functions.

/**
 * The EXACT Excel column headers of the client's "Office Computer Inventory"
 * sheet, minus the two explicitly removed fields (Installed Sangfor, PMS).
 * Used for the UI table and the Excel/CSV exports.
 */
export const ASSET_EXPORT_COLUMNS = [
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
] as const;

/** Common condition values (text field — the Excel sheet stores free text). */
export const ASSET_CONDITIONS = [
  "Working",
  "Needs Repair",
  "Defective",
  "Condemned",
] as const;
