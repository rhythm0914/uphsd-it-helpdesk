import Link from "next/link";
import { getAsset } from "../actions";
import { TransferForm } from "./transfer-form";
import { formatDate } from "@/utils/format-date";
import type { AssetMovement } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { asset, movements, error } = await getAsset(id);

  if (error || !asset) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <p className="text-sm text-red-600">{error || "Asset not found."}</p>
          <Link href="/portal/admin/assets" className="mt-4 inline-block text-sm text-brand-primary hover:underline">
            Back to Asset Management
          </Link>
        </div>
      </div>
    );
  }

  const currentFields: [string, string | null][] = [
    ["Re", asset.re],
    ["ICT Asset", asset.ict_asset],
    ["Manufacturer", asset.manufacturer],
    ["Model", asset.model],
    ["Serial Number", asset.serial_number],
    ["Specification", asset.specification],
    ["Asset Number", asset.asset_number],
    ["Date Acquired", asset.date_acquired],
    ["Name or ID of Accountable Personnel", asset.accountable_personnel],
    ["Position of Accountable Personnel", asset.accountable_position],
    ["Condition", asset.condition],
    ["Department / Office (Location)", asset.department_office],
    ["BLDG.", asset.bldg],
    ["Remarks", asset.remarks],
    ["Domain Name", asset.domain_name],
    ["Computer Name", asset.computer_name],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Link href="/portal/admin/assets" className="text-sm text-brand-primary hover:underline">
        ← Back to Asset Management
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {asset.ict_asset}
        {asset.asset_number ? (
          <span className="ml-2 text-base font-normal text-foreground/60">
            ({asset.asset_number})
          </span>
        ) : null}
      </h1>

      {/* CURRENT ASSET INFORMATION */}
      <section className="mt-6 rounded-2xl border border-border bg-background p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Current Asset Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {currentFields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-medium text-foreground/60">{label}</dt>
              <dd className="text-sm break-words">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Record a transfer */}
      <section className="mt-6 rounded-2xl border border-border bg-background p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-1">Record a Transfer</h2>
        <p className="text-xs text-foreground/60 mb-4">
          The previous personnel/location information is automatically preserved in the movement history.
        </p>
        <TransferForm assetId={asset.id} />
      </section>

      {/* MOVEMENT HISTORY */}
      <section className="mt-6 rounded-2xl border border-border bg-background p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Movement History</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No movements recorded yet. Transfers and personnel/location changes will appear here.
          </p>
        ) : (
          <ol className="space-y-4">
            {(movements as AssetMovement[]).map((m) => (
              <li key={m.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium">{formatDate(m.created_at)}</p>
                  {m.performed_by_profile?.full_name && (
                    <p className="text-xs text-foreground/60">
                      Recorded by {m.performed_by_profile.full_name}
                    </p>
                  )}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <MovementRow
                    label="Accountable Personnel"
                    previous={m.previous_accountable_personnel}
                    next={m.new_accountable_personnel}
                  />
                  <MovementRow
                    label="Position"
                    previous={m.previous_accountable_position}
                    next={m.new_accountable_position}
                  />
                  <MovementRow
                    label="Department / Office (Location)"
                    previous={m.previous_department_office}
                    next={m.new_department_office}
                  />
                  <MovementRow label="BLDG." previous={m.previous_bldg} next={m.new_bldg} />
                </dl>
                {m.remarks && (
                  <p className="mt-2 text-xs text-foreground/70">Remarks: {m.remarks}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function MovementRow({
  label,
  previous,
  next,
}: {
  label: string;
  previous: string | null;
  next: string | null;
}) {
  const changed = (previous ?? "") !== (next ?? "");
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-foreground/60">{label}</dt>
      <dd className="text-sm break-words">
        <span className="text-foreground/70">{previous ?? "—"}</span>
        {changed && (
          <>
            <span className="mx-1 text-brand-primary">→</span>
            <span className="font-medium">{next ?? "—"}</span>
          </>
        )}
      </dd>
    </div>
  );
}
