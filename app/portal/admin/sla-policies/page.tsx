import { getSlaPolicies, updateSlaPolicy } from "./actions";
import React from "react";

export const dynamic = "force-dynamic";

export default async function SlaPoliciesPage() {
  const result = await getSlaPolicies();

  if (result.error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">SLA Policies</h1>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mt-4">
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">SLA Policies</h1>
        <p className="mt-1 text-foreground/60">
          Configure response and resolution targets per priority. Changes apply
          to new tickets only; existing tickets keep their original due dates.
        </p>
      </div>

      <SlaPoliciesTable policies={result.policies} />
    </div>
  );
}

function SlaPoliciesTable({ policies }: { policies: { priority: string; responseMinutes: number; resolutionMinutes: number }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background/50">
            <th className="px-4 py-3 text-left text-foreground/60 font-medium">Priority</th>
            <th className="px-4 py-3 text-left text-foreground/60 font-medium">Response Target</th>
            <th className="px-4 py-3 text-left text-foreground/60 font-medium">Resolution Target</th>
            <th className="px-4 py-3 text-right text-foreground/60 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {policies.map((p) => (
            <tr key={p.priority} className="hover:bg-background/30 transition-colors">
              <td className="px-4 py-3 font-medium capitalize">{p.priority}</td>
              <td className="px-4 py-3">{formatTarget(p.responseMinutes)}</td>
              <td className="px-4 py-3">{formatTarget(p.resolutionMinutes)}</td>
              <td className="px-4 py-3 text-right">
                <SlaPolicyEditor priority={p.priority} responseMinutes={p.responseMinutes} resolutionMinutes={p.resolutionMinutes} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTarget(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

function SlaPolicyEditor({
  priority,
  responseMinutes,
  resolutionMinutes,
}: {
  priority: string;
  responseMinutes: number;
  resolutionMinutes: number;
}) {
  return <SlaPolicyForm priority={priority} responseMinutes={responseMinutes} resolutionMinutes={resolutionMinutes} />;
}

function SlaPolicyForm({
  priority,
  responseMinutes,
  resolutionMinutes,
}: {
  priority: string;
  responseMinutes: number;
  resolutionMinutes: number;
}) {
  const [respMinutes, setRespMinutes] = React.useState(responseMinutes);
  const [resMinutes, setResMinutes] = React.useState(resolutionMinutes);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { error } = await updateSlaPolicy(priority, respMinutes, resMinutes);
    setSaving(false);
    if (error) {
      setMessage(error);
    } else {
      setMessage("Saved.");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-2">
      <div className="flex gap-2 items-center">
        <input
          name="responseMinutes"
          type="number"
          min="1"
          defaultValue={responseMinutes}
          onChange={(e) => setRespMinutes(Number(e.target.value))}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <span className="text-xs text-foreground/60">min response</span>
        <input
          name="resolutionMinutes"
          type="number"
          min="1"
          defaultValue={resolutionMinutes}
          onChange={(e) => setResMinutes(Number(e.target.value))}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <span className="text-xs text-foreground/60">min resolve</span>
        <button
          disabled={saving}
          className="rounded-lg border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${message === "Saved." ? "text-emerald-700" : "text-red-700"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
