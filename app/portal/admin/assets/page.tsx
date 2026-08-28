import { getAssetFilterOptions, getAssets } from "./actions";
import { AssetManagement } from "./asset-management";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const [{ assets, error }, { departments, buildings }] = await Promise.all([
    getAssets(),
    getAssetFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Asset Management</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Office Computer Inventory — ICT equipment records and movement history.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <AssetManagement assets={assets} departments={departments} buildings={buildings} />
      )}
    </div>
  );
}
