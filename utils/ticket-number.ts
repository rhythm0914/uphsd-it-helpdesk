import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Compute the next ticket number (IT-YYYY-NNNNNN) from the numbers the caller
 * can see. NOTE: RLS limits a requester's visibility to their own tickets, so
 * this local computation can produce an already-taken number. It is only a
 * fallback — `getNextTicketNumber` prefers the SECURITY DEFINER
 * `next_ticket_number()` RPC, which sees all rows.
 */
export async function computeNextTicketNumber(
  supabase: SupabaseClient,
  offset = 0
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IT-${year}-`;
  const { data } = await supabase
    .from("tickets")
    .select("ticket_number")
    .like("ticket_number", `${prefix}%`);
  let max = 0;
  for (const row of data ?? []) {
    const n = parseInt(String(row.ticket_number).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1 + offset).padStart(6, "0")}`;
}

/**
 * Next ticket number for a new ticket. Prefers the SECURITY DEFINER
 * `next_ticket_number()` RPC (collision-safe across all users); falls back to
 * the RLS-visible local computation (retry loops at the call sites absorb any
 * rare collision).
 */
export async function generateTicketNumber(
  supabase: SupabaseClient,
  offset = 0
): Promise<string> {
  const { data, error } = await supabase.rpc("next_ticket_number");
  if (!error && typeof data === "string" && data) {
    if (offset > 0) {
      const prefix = data.slice(0, data.lastIndexOf("-") + 1);
      const n = parseInt(data.slice(prefix.length), 10);
      if (!Number.isNaN(n)) {
        return `${prefix}${String(n + offset).padStart(6, "0")}`;
      }
    }
    return data;
  }
  return computeNextTicketNumber(supabase, offset);
}
