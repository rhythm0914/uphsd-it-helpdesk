"use client";

// Asset Management main UI: search, filters, 16-column Excel-faithful
// inventory table, add/edit/delete, and Excel/CSV export.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ASSET_EXPORT_COLUMNS } from "./asset-constants";
import { AssetForm } from "./asset-form";
import { deleteAsset, exportAssets } from "./actions";
import type { IctAsset } from "@/types/database";

const cellClass = "px-3 py-2.5 text-sm whitespace-nowrap align-top";

export function AssetManagement({
  assets,
  departments,
  buildings,
}: {
  assets: IctAsset[];
  departments: string[];
  buildings: string[];
}) {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("all");
  const [department, setDepartment] = useState("all");
  const [bldg, setBldg] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IctAsset | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (condition !== "all" && (a.condition ?? "") !== condition) return false;
      if (department !== "all" && (a.department_office ?? "") !== department) return false;
      if (bldg !== "all" && (a.bldg ?? "") !== bldg) return false;
      if (!q) return true;
      return [
        a.asset_number, a.serial_number, a.ict_asset, a.manufacturer, a.model,
        a.accountable_personnel, a.department_office, a.bldg,
        a.computer_name, a.domain_name,
      ].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [assets, query, condition, department, bldg]);

  async function handleExport(format: "csv" | "excel") {
    setExporting(true);
    const result = await exportAssets(format, { query, condition, department, bldg });
    setExporting(false);
    if (result.error || !result.data) {
      setBanner({ type: "error", text: result.error || "Export failed." });
      return;
    }
    const blob = new Blob([result.data], {
      type:
        format === "csv"
          ? "text/csv;charset=utf-8"
          : "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename || "inventory";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(asset: IctAsset) {
    if (
      !window.confirm(
        `Delete asset "${asset.ict_asset}" (Asset No. ${asset.asset_number ?? "n/a"})? This also removes its movement history.`,
      )
    ) {
      return;
    }
    const result = await deleteAsset(asset.id);
    setBanner(
      result.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "Asset deleted." },
    );
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div
          role="status"
          className={`rounded-lg border p-3 text-sm ${
            banner.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {banner.text}
          <button type="button" onClick={() => setBanner(null)} className="ml-3 underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex-1">
          <label htmlFor="asset-search" className="block text-xs font-medium text-foreground/70 mb-1">
            Search
          </label>
          <input
            id="asset-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Asset number, serial, personnel, department, computer name…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label htmlFor="f-condition-filter" className="block text-xs font-medium text-foreground/70 mb-1">Condition</label>
          <select id="f-condition-filter" value={condition} onChange={(e) => setCondition(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="all">All</option>
            {[...new Set(assets.map((a) => a.condition).filter(Boolean))].map((c) => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-dept-filter" className="block text-xs font-medium text-foreground/70 mb-1">Department / Office</label>
          <select id="f-dept-filter" value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="all">All</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-bldg-filter" className="block text-xs font-medium text-foreground/70 mb-1">BLDG.</label>
          <select id="f-bldg-filter" value={bldg} onChange={(e) => setBldg(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="all">All</option>
            {buildings.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover"
          >
            Add Asset
          </button>
          <button type="button" onClick={() => handleExport("excel")} disabled={exporting} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50">
            Export Excel
          </button>
          <button type="button" onClick={() => handleExport("csv")} disabled={exporting} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50">
            Export CSV
          </button>
        </div>
      </div>

      <p className="text-xs text-foreground/60">
        Showing {filtered.length} of {assets.length} assets
      </p>

      {formOpen && (
        <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Asset" : "Add Asset"}</h2>
          <AssetForm
            asset={editing ?? undefined}
            onDone={() => {
              setFormOpen(false);
              setEditing(null);
              setBanner({ type: "success", text: editing ? "Asset updated." : "Asset added." });
            }}
          />
        </div>
      )}

      {/* Inventory table — the 16 Excel columns, horizontal scroll */}
      <div className="rounded-2xl border border-border bg-background overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-surface">
            <tr>
              {ASSET_EXPORT_COLUMNS.map((col) => (
                <th key={col} className="px-3 py-2.5 text-left text-xs font-semibold text-foreground/70 whitespace-nowrap">
                  {col}
                </th>
              ))}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground/70 whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={ASSET_EXPORT_COLUMNS.length + 1} className="px-3 py-8 text-center text-sm text-foreground/60">
                  No assets found. Use &quot;Add Asset&quot; to create the first inventory record.
                </td>
              </tr>
            ) : (
              filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-surface/60">
                  {[
                    asset.re, asset.ict_asset, asset.manufacturer, asset.model,
                    asset.serial_number, asset.specification, asset.asset_number,
                    asset.date_acquired, asset.accountable_personnel,
                    asset.accountable_position, asset.condition,
                    asset.department_office, asset.bldg, asset.remarks,
                    asset.domain_name, asset.computer_name,
                  ].map((v, i) => (
                    <td key={i} className={cellClass}>{v ?? "—"}</td>
                  ))}
                  <td className={`${cellClass} space-x-2`}>
                    <Link href={`/portal/admin/assets/${asset.id}`} className="text-brand-primary hover:underline text-xs font-medium">
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setEditing(asset); setFormOpen(true); }}
                      className="text-foreground/70 hover:text-brand-primary text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(asset)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
