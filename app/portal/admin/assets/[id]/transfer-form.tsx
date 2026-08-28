"use client";

// Record an asset transfer: appends a movement-history entry and updates the
// asset's current personnel/location information.

import { useState } from "react";
import { transferAsset, type AssetActionResult } from "../actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

export function TransferForm({ assetId }: { assetId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const result: AssetActionResult = await transferAsset(
      assetId,
      new FormData(form),
    );
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    form.reset();
    setSuccess("Transfer recorded. The previous information was preserved in the movement history below.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="t-personnel" className="block text-xs font-medium text-foreground/70 mb-1">
            New Accountable Personnel (Name or ID)
          </label>
          <input id="t-personnel" name="new_accountable_personnel" className={inputClass} />
        </div>
        <div>
          <label htmlFor="t-position" className="block text-xs font-medium text-foreground/70 mb-1">
            New Position
          </label>
          <input id="t-position" name="new_accountable_position" className={inputClass} />
        </div>
        <div>
          <label htmlFor="t-department" className="block text-xs font-medium text-foreground/70 mb-1">
            New Department / Office (Location)
          </label>
          <input id="t-department" name="new_department_office" className={inputClass} />
        </div>
        <div>
          <label htmlFor="t-bldg" className="block text-xs font-medium text-foreground/70 mb-1">
            New BLDG.
          </label>
          <input id="t-bldg" name="new_bldg" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="t-remarks" className="block text-xs font-medium text-foreground/70 mb-1">
          Transfer Remarks
        </label>
        <input id="t-remarks" name="remarks" className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {pending ? "Recording…" : "Record Transfer"}
      </button>
    </form>
  );
}
