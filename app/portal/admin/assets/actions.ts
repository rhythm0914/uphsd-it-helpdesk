"use server";

// Phase 9: Asset Management server actions. Every action re-verifies
// auth + admin/manager role server-side (UI checks are never trusted) and
// relies on the ict_assets / asset_movements RLS policies as a second layer.

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AssetMovement, IctAsset } from "@/types/database";
import { ASSET_EXPORT_COLUMNS } from "./asset-constants";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/** Returns the supabase client + user id for an authorized admin/manager. */
async function requireAdminManager() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) return null;
  return { supabase, userId: user.id };
}

/**
 * The EXACT Excel column headers of the client's "Office Computer Inventory"
 * sheet, minus the two explicitly removed fields (Installed Sangfor, PMS).
 * Used for both the UI table and the Excel/CSV exports.
 * Defined in ./asset-constants.ts (re-exported by the UI).
 */
export interface AssetFilters {
  query?: string;
  condition?: string;
  department?: string;
  bldg?: string;
}

const ASSET_SELECT = `
  id, re, ict_asset, manufacturer, model, serial_number, specification,
  asset_number, date_acquired, accountable_personnel, accountable_position,
  condition, department_office, bldg, remarks, domain_name, computer_name,
  created_by, created_at, updated_at
`;

export async function getAssets(filters?: AssetFilters) {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  let builder = auth.supabase
    .from("ict_assets")
    .select(ASSET_SELECT)
    .order("created_at", { ascending: false });

  if (filters?.query) {
    const q = filters.query.replace(/[%_,()]/g, " ").trim();
    if (q) {
      builder = builder.or(
        [
          `asset_number.ilike.%${q}%`,
          `serial_number.ilike.%${q}%`,
          `ict_asset.ilike.%${q}%`,
          `manufacturer.ilike.%${q}%`,
          `model.ilike.%${q}%`,
          `accountable_personnel.ilike.%${q}%`,
          `department_office.ilike.%${q}%`,
          `bldg.ilike.%${q}%`,
          `computer_name.ilike.%${q}%`,
          `domain_name.ilike.%${q}%`,
        ].join(","),
      );
    }
  }
  if (filters?.condition && filters.condition !== "all") {
    builder = builder.eq("condition", filters.condition);
  }
  if (filters?.department && filters.department !== "all") {
    builder = builder.eq("department_office", filters.department);
  }
  if (filters?.bldg && filters.bldg !== "all") {
    builder = builder.eq("bldg", filters.bldg);
  }

  const { data, error } = await builder;
  if (error) return { error: error.message, assets: [] as IctAsset[] };
  return { assets: (data || []) as IctAsset[], error: null as string | null };
}

export async function getAsset(id: string) {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  const { data: asset, error } = await auth.supabase
    .from("ict_assets")
    .select(ASSET_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!asset) return { error: "Asset not found." };

  const { data: movements } = await auth.supabase
    .from("asset_movements")
    .select(
      `
      id, asset_id,
      previous_accountable_personnel, new_accountable_personnel,
      previous_accountable_position, new_accountable_position,
      previous_department_office, new_department_office,
      previous_bldg, new_bldg,
      remarks, performed_by, created_at,
      performed_by_profile:profiles!asset_movements_performed_by_fkey(full_name)
    `,
    )
    .eq("asset_id", id)
    .order("created_at", { ascending: false });

  return {
    asset: asset as IctAsset,
    movements: (movements || []) as unknown as AssetMovement[],
    error: null as string | null,
  };
}

/** Distinct values for the filter dropdowns (from existing data only). */
export async function getAssetFilterOptions() {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  const { data } = await auth.supabase
    .from("ict_assets")
    .select("department_office, bldg");
  const departments = [
    ...new Set(
      (data || [])
        .map((r) => r.department_office)
        .filter((v): v is string => !!v),
    ),
  ].sort();
  const buildings = [
    ...new Set((data || []).map((r) => r.bldg).filter((v): v is string => !!v)),
  ].sort();
  return { departments, buildings };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface AssetActionResult {
  error?: string;
  ok?: boolean;
}

function str(formData: FormData, name: string): string | null {
  const v = formData.get(name);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function assetFieldsFromFormData(formData: FormData) {
  return {
    re: str(formData, "re"),
    ict_asset: str(formData, "ict_asset"),
    manufacturer: str(formData, "manufacturer"),
    model: str(formData, "model"),
    serial_number: str(formData, "serial_number"),
    specification: str(formData, "specification"),
    asset_number: str(formData, "asset_number"),
    date_acquired: str(formData, "date_acquired"),
    accountable_personnel: str(formData, "accountable_personnel"),
    accountable_position: str(formData, "accountable_position"),
    condition: str(formData, "condition"),
    department_office: str(formData, "department_office"),
    bldg: str(formData, "bldg"),
    remarks: str(formData, "remarks"),
    domain_name: str(formData, "domain_name"),
    computer_name: str(formData, "computer_name"),
  };
}

type AssetFields = ReturnType<typeof assetFieldsFromFormData>;

/** Rejects a second record sharing an existing Asset Number or Serial Number. */
async function findDuplicate(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  fields: AssetFields,
  excludeId?: string,
): Promise<string | null> {
  for (const [field, value] of [
    ["asset_number", fields.asset_number],
    ["serial_number", fields.serial_number],
  ] as const) {
    if (!value) continue;
    let check = supabase
      .from("ict_assets")
      .select("id")
      .ilike(field, value)
      .limit(1);
    if (excludeId) check = check.neq("id", excludeId);
    const { data } = await check;
    if (data && data.length > 0) {
      const label = field === "asset_number" ? "Asset Number" : "Serial Number";
      return `An asset with this ${label} already exists. Duplicate equipment records are not allowed.`;
    }
  }
  return null;
}

export async function createAsset(formData: FormData): Promise<AssetActionResult> {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  const fields = assetFieldsFromFormData(formData);
  if (!fields.ict_asset) return { error: "ICT Asset is required." };

  const dup = await findDuplicate(auth.supabase, fields);
  if (dup) return { error: dup };

  const { error } = await auth.supabase.from("ict_assets").insert({
    ...fields,
    created_by: auth.userId,
  });

  if (error) return { error: error.message };
  revalidatePath("/portal/admin/assets");
  return { ok: true };
}

export async function updateAsset(
  id: string,
  formData: FormData,
): Promise<AssetActionResult> {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  const fields = assetFieldsFromFormData(formData);
  if (!fields.ict_asset) return { error: "ICT Asset is required." };

  const dup = await findDuplicate(auth.supabase, fields, id);
  if (dup) return { error: dup };

  const { data: existing } = await auth.supabase
    .from("ict_assets")
    .select("accountable_personnel, accountable_position, department_office, bldg")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Asset not found." };

  const { error } = await auth.supabase
    .from("ict_assets")
    .update(fields)
    .eq("id", id);
  if (error) return { error: error.message };

  // If accountable personnel / position / location changed, preserve the
  // previous state as an immutable movement-history record. History is never
  // overwritten — the asset row only represents the CURRENT state.
  const changed =
    existing.accountable_personnel !== fields.accountable_personnel ||
    existing.accountable_position !== fields.accountable_position ||
    existing.department_office !== fields.department_office ||
    existing.bldg !== fields.bldg;

  if (changed) {
    const { error: histError } = await auth.supabase
      .from("asset_movements")
      .insert({
        asset_id: id,
        previous_accountable_personnel: existing.accountable_personnel,
        new_accountable_personnel: fields.accountable_personnel,
        previous_accountable_position: existing.accountable_position,
        new_accountable_position: fields.accountable_position,
        previous_department_office: existing.department_office,
        new_department_office: fields.department_office,
        previous_bldg: existing.bldg,
        new_bldg: fields.bldg,
        remarks: str(formData, "movement_remarks"),
        performed_by: auth.userId,
      });
    if (histError) return { error: histError.message };
  }

  revalidatePath("/portal/admin/assets");
  revalidatePath(`/portal/admin/assets/${id}`);
  return { ok: true };
}

export async function deleteAsset(id: string): Promise<AssetActionResult> {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  const { error } = await auth.supabase.from("ict_assets").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal/admin/assets");
  return { ok: true };
}

/**
 * Record an explicit asset transfer: appends a movement-history entry and
 * updates the asset's current personnel/location information.
 */
export async function transferAsset(
  id: string,
  formData: FormData,
): Promise<AssetActionResult> {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  const { data: existing } = await auth.supabase
    .from("ict_assets")
    .select("accountable_personnel, accountable_position, department_office, bldg")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Asset not found." };

  const newPersonnel = str(formData, "new_accountable_personnel");
  const newPosition = str(formData, "new_accountable_position");
  const newDepartment = str(formData, "new_department_office");
  const newBldg = str(formData, "new_bldg");
  const remarks = str(formData, "remarks");

  if (!newPersonnel && !newDepartment && !newBldg) {
    return {
      error:
        "Enter at least one of: new accountable personnel, new department/office, or new building.",
    };
  }

  const { error: histError } = await auth.supabase.from("asset_movements").insert({
    asset_id: id,
    previous_accountable_personnel: existing.accountable_personnel,
    new_accountable_personnel: newPersonnel ?? existing.accountable_personnel,
    previous_accountable_position: existing.accountable_position,
    new_accountable_position: newPosition ?? existing.accountable_position,
    previous_department_office: existing.department_office,
    new_department_office: newDepartment ?? existing.department_office,
    previous_bldg: existing.bldg,
    new_bldg: newBldg ?? existing.bldg,
    remarks,
    performed_by: auth.userId,
  });
  if (histError) return { error: histError.message };

  const { error: updateError } = await auth.supabase
    .from("ict_assets")
    .update({
      accountable_personnel: newPersonnel ?? existing.accountable_personnel,
      accountable_position: newPosition ?? existing.accountable_position,
      department_office: newDepartment ?? existing.department_office,
      bldg: newBldg ?? existing.bldg,
    })
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/portal/admin/assets");
  revalidatePath(`/portal/admin/assets/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Exports (exact 16-column Excel structure; never PMS / Installed Sangfor)
// ---------------------------------------------------------------------------

function assetToRow(asset: IctAsset): (string | null)[] {
  return [
    asset.re,
    asset.ict_asset,
    asset.manufacturer,
    asset.model,
    asset.serial_number,
    asset.specification,
    asset.asset_number,
    asset.date_acquired,
    asset.accountable_personnel,
    asset.accountable_position,
    asset.condition,
    asset.department_office,
    asset.bldg,
    asset.remarks,
    asset.domain_name,
    asset.computer_name,
  ];
}

function csvEscape(value: string | null): string {
  const s = String(value ?? "");
  if (/^[=+\-@]/.test(s)) return `\t"${s.replace(/"/g, '""')}"`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function xmlEscape(value: string | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function exportAssets(
  format: "csv" | "excel",
  filters?: AssetFilters,
): Promise<{ error?: string; data?: string; filename?: string }> {
  const { assets, error } = await getAssets(filters);
  if (error) return { error };
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const lines = [
      ASSET_EXPORT_COLUMNS.join(","),
      ...assets.map((a) => assetToRow(a).map(csvEscape).join(",")),
    ];
    return {
      data: lines.join("\r\n"),
      filename: `Office-Computer-Inventory-${stamp}.csv`,
    };
  }

  // Excel export: SpreadsheetML 2003 (.xls) — opens natively in Excel with
  // real columns; no external dependency required.
  const header = ASSET_EXPORT_COLUMNS.map(
    (c) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${xmlEscape(c)}</Data></Cell>`,
  ).join("");
  const rows = assets
    .map(
      (a) =>
        `<Row>${assetToRow(a)
          .map((v) => `<Cell><Data ss:Type="String">${xmlEscape(v)}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="Office Computer Inventory">
  <Table><Row>${header}</Row>${rows}</Table>
 </Worksheet>
</Workbook>`;
  return {
    data: xml,
    filename: `Office-Computer-Inventory-${stamp}.xls`,
  };
}
