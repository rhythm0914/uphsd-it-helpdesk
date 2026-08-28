"use client";

// Add/Edit asset form. Contains EXACTLY the 16 Excel inventory fields
// (Installed Sangfor and PMS were explicitly removed by the client).

import { useState } from "react";
import { createAsset, updateAsset, type AssetActionResult } from "./actions";
import { ASSET_CONDITIONS } from "./asset-constants";
import type { IctAsset } from "@/types/database";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

const labelClass = "block text-xs font-medium text-foreground/70 mb-1";

export function AssetForm({
  asset,
  onDone,
}: {
  asset?: IctAsset;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result: AssetActionResult = asset
      ? await updateAsset(asset.id, formData)
      : await createAsset(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField id="f-re" label="Re" name="re" defaultValue={asset?.re} />
        <TextField id="f-ict" label="ICT Asset *" name="ict_asset" required defaultValue={asset?.ict_asset} />
        <TextField id="f-manufacturer" label="Manufacturer" name="manufacturer" defaultValue={asset?.manufacturer} />
        <TextField id="f-model" label="Model" name="model" defaultValue={asset?.model} />
        <TextField id="f-serial" label="Serial Number" name="serial_number" defaultValue={asset?.serial_number} />
        <TextField id="f-asset-number" label="Asset Number" name="asset_number" defaultValue={asset?.asset_number} />
        <div>
          <label htmlFor="f-date" className={labelClass}>Date Acquired</label>
          <input id="f-date" name="date_acquired" type="date" defaultValue={asset?.date_acquired ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="f-condition" className={labelClass}>Condition</label>
          <select id="f-condition" name="condition" defaultValue={asset?.condition ?? ""} className={inputClass}>
            <option value="">—</option>
            {ASSET_CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <TextField id="f-personnel" label="Name or ID of Accountable Personnel" name="accountable_personnel" defaultValue={asset?.accountable_personnel} />
        <TextField id="f-position" label="Position of Accountable Personnel" name="accountable_position" defaultValue={asset?.accountable_position} />
        <TextField id="f-department" label="Department / Office (Location)" name="department_office" defaultValue={asset?.department_office} />
        <TextField id="f-bldg" label="BLDG." name="bldg" defaultValue={asset?.bldg} />
        <TextField id="f-domain" label="Domain Name" name="domain_name" defaultValue={asset?.domain_name} />
        <TextField id="f-computer" label="Computer Name" name="computer_name" defaultValue={asset?.computer_name} />
      </div>

      <div>
        <label htmlFor="f-spec" className={labelClass}>Specification</label>
        <textarea id="f-spec" name="specification" rows={2} defaultValue={asset?.specification ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="f-remarks" className={labelClass}>Remarks</label>
        <textarea id="f-remarks" name="remarks" rows={2} defaultValue={asset?.remarks ?? ""} className={inputClass} />
      </div>

      {asset && (
        <div>
          <label htmlFor="f-movement-remarks" className={labelClass}>
            Transfer Remarks (recorded if personnel/location changes)
          </label>
          <input id="f-movement-remarks" name="movement_remarks" className={inputClass} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : asset ? "Save Changes" : "Add Asset"}
        </button>
      </div>
    </form>
  );
}

function TextField({
  id,
  label,
  name,
  defaultValue,
  required,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={inputClass}
      />
    </div>
  );
}
