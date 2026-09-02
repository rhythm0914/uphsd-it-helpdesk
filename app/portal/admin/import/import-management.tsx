"use client";

import { useState, useCallback } from "react";
import { validateImportCsv, confirmImport } from "./actions";
import { MAX_SUBJECT_LENGTH, MAX_DESCRIPTION_LENGTH } from "./lib";

function parseCsv(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return rows;

  const headers = parseCsvRow(lines[0]);
  if (headers.length === 0) return rows;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvRow(line);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    row._rowNum = i;
    rows.push(row);
  }

  return rows;
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}


export function ImportManagement() {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof validateImportCsv>>["preview"]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof validateImportCsv>>["summary"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid" | "duplicate">("all");
  const [result, setResult] = useState<Awaited<ReturnType<typeof confirmImport>> | null>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setMessage({ type: "error", text: "Please upload a CSV file." });
      return;
    }

    setLoading(true);
    setMessage(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setMessage({ type: "error", text: "The CSV file appears to be empty or has no headers." });
        setLoading(false);
        return;
      }

      const requiredHeaders = ["ticket_number", "requester_email", "service", "category", "subject", "description", "priority", "status"];
      const headers = Object.keys(rows[0]);
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        setMessage({ type: "error", text: `Missing required columns: ${missingHeaders.join(", ")}` });
        setLoading(false);
        return;
      }

      const { validateImportCsv } = await import("./actions");
      const result = await validateImportCsv(rows as Record<string, unknown>[]);

      setPreview(result.preview);
      setSummary(result.summary);
      setStep("preview");
    } catch {
      setMessage({ type: "error", text: "Unable to read this CSV file. Please check the format and try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const validRows = preview
        .filter((p) => p.validation.isValid && p.duplicateStatus === "none")
        .map((p) => ({
          ...p.validation.normalized,
          _rowNum: p.rowNum,
          _filename: fileName,
        }));

      const { confirmImport } = await import("./actions");
      const importResult = await confirmImport(validRows);

      setResult(importResult);
      setStep("result");
    } catch {
      setMessage({ type: "error", text: "Import failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [preview, fileName]);

  const handleDownloadReport = useCallback((data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((key) => {
            const value = String(row[key] ?? "");
            if (value.startsWith("=") || value.startsWith("+") || value.startsWith("-") || value.startsWith("@")) {
              return `\t"${value.replace(/"/g, '""')}"`;
            }
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const filteredPreview = preview.filter((p) => {
    if (filter === "all") return true;
    if (filter === "valid") return p.validation.isValid && p.duplicateStatus === "none";
    if (filter === "invalid") return !p.validation.isValid;
    if (filter === "duplicate") return p.duplicateStatus !== "none";
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Import Tickets</h1>
        <p className="mt-1 text-foreground/60">
          Upload a CSV file to import tickets into the system
        </p>
      </div>

      {message && (
        <div className={`mb-6 rounded-lg p-4 ${message.type === "error" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
          <p className={`text-sm ${message.type === "error" ? "text-red-700" : "text-green-700"}`}>
            {message.text}
          </p>
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background p-6">
            <h3 className="text-lg font-semibold mb-4">Download Template</h3>
            <p className="text-sm text-foreground/70 mb-4">
              Use the official template to ensure your CSV has the correct columns and format.
            </p>
            <button
              type="button"
              onClick={async () => {
                const { downloadCsvTemplate } = await import("./actions");
                const template = await downloadCsvTemplate();
                const blob = new Blob([template.content], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = template.filename;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Download CSV Template
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6">
            <h3 className="text-lg font-semibold mb-4">Upload CSV</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="csvFile" className="block text-sm font-medium mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  id="csvFile"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                />
              </div>
              {loading && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm text-blue-700">Preparing import...</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6">
            <h3 className="text-lg font-semibold mb-2">CSV Format Requirements</h3>
            <ul className="mt-2 text-sm text-foreground/70 space-y-1 list-disc list-inside">
              <li>Required columns: ticket_number, requester_email, service, category, subject, description, priority, status, created_at</li>
              <li>Priority must be one of: low, normal, high, urgent</li>
              <li>Status must be one of: open, in_progress, waiting_for_user, resolved, closed</li>
              <li>requester_email must match an existing profile email</li>
              <li>service and category must match existing active services/categories</li>
              <li>Maximum subject length: {MAX_SUBJECT_LENGTH} characters</li>
              <li>Maximum description length: {MAX_DESCRIPTION_LENGTH} characters</li>
            </ul>
          </div>
        </div>
      )}

      {step === "preview" && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-foreground/60">Total Rows</p>
              <p className="text-2xl font-semibold mt-1">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-foreground/60">Valid</p>
              <p className="text-2xl font-semibold mt-1 text-green-700">{summary.valid}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-foreground/60">Exact Duplicates</p>
              <p className="text-2xl font-semibold mt-1 text-red-700">{summary.exactDuplicates}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-foreground/60">Possible Duplicates</p>
              <p className="text-2xl font-semibold mt-1 text-amber-700">{summary.possibleDuplicates}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-foreground/60">Invalid</p>
              <p className="text-2xl font-semibold mt-1 text-red-700">{summary.invalid}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold">Preview</h3>
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="all">All</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="duplicate">Duplicates</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Row</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Ticket</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Requester</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Service</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Validation</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Duplicate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPreview.map((item) => (
                    <tr key={item.rowNum} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-sm">{item.rowNum}</td>
                      <td className="px-4 py-3 text-sm font-mono">{item.ticket_number}</td>
                      <td className="px-4 py-3 text-sm truncate max-w-xs">{item.subject}</td>
                      <td className="px-4 py-3 text-sm">{item.requester_email}</td>
                      <td className="px-4 py-3 text-sm">{item.service}</td>
                      <td className="px-4 py-3 text-sm capitalize">{item.status}</td>
                      <td className="px-4 py-3">
                        {item.validation.isValid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-green-200 bg-green-50 text-green-700">
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-200 bg-red-50 text-red-700">
                            Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.duplicateStatus === "none" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border bg-surface">
                            None
                          </span>
                        )}
                        {item.duplicateStatus === "exact" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-200 bg-red-50 text-red-700">
                            Exact
                          </span>
                        )}
                        {item.duplicateStatus === "possible" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700">
                            Possible
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm Import</h3>
            <p className="text-sm text-amber-700 mb-4">
              {summary.valid} records will be created. {summary.exactDuplicates} exact duplicates and {summary.possibleDuplicates} possible duplicates will be skipped. {summary.invalid} invalid records will not be imported.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={loading || summary.valid === 0}
                className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {loading ? "Importing..." : `Import ${summary.valid} Valid Records`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setPreview([]);
                  setSummary(null);
                  setFileName("");
                }}
                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background p-8 text-center">
            <h3 className="text-2xl font-semibold mb-2">Import Complete</h3>
            <p className="text-foreground/70 mb-6">
              Your import has been processed successfully.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-foreground/60">Total Processed</p>
                <p className="text-xl font-semibold">{result.summary.total}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-foreground/60">Imported</p>
                <p className="text-xl font-semibold text-green-700">{result.summary.imported}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-foreground/60">Duplicates Skipped</p>
                <p className="text-xl font-semibold text-amber-700">{result.summary.duplicates}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-foreground/60">Rejected</p>
                <p className="text-xl font-semibold text-red-700">{result.summary.rejected}</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-6">
              <h3 className="text-lg font-semibold mb-4">Errors</h3>
              <div className="space-y-2">
                {result.errors.map((err: string, i: number) => (
                  <p key={i} className="text-sm text-red-700">{err}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  handleDownloadReport(
                    result.errors.map((err: string, i: number) => ({ row: i + 1, error: err })),
                    `import-errors-${new Date().toISOString().split("T")[0]}.csv`
                  )
                }
                className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                Download Error Report
              </button>
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setPreview([]);
                setSummary(null);
                setResult(null);
                setFileName("");
              }}
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-8 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
