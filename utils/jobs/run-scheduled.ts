// Runs the scheduled maintenance passes from the Cloudflare cron handler.
//
// Both passes live in Postgres as SECURITY DEFINER functions, because both must
// go through public.transition_ticket() — the only writer of ticket state. This
// module only authenticates and calls them, so a failure here can never leave a
// ticket half-updated.
//
// Requires SUPABASE_SERVICE_ROLE_KEY (a Worker secret). Without it the job
// reports `ran: false` instead of throwing, so a misconfigured deploy does not
// break the site — it just does not run the automation.

import { createClient } from "@supabase/supabase-js";

export interface ScheduledEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface ScheduledResult {
  ran: boolean;
  reason?: string;
  noResponse?: { reminded: number; closed: number };
  escalation?: { escalated: number };
  errors: string[];
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function runScheduledJobs(
  env: ScheduledEnv,
  now: Date = new Date(),
): Promise<ScheduledResult> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return {
      ran: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY is not configured; scheduled passes skipped.",
      errors: [],
    };
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const errors: string[] = [];
  const result: ScheduledResult = { ran: true, errors };

  const stamp = now.toISOString();

  // 3-day reminder / 5-day No Response close.
  const noResponse = await supabase.rpc("run_no_response_job", { p_now: stamp });
  if (noResponse.error) {
    errors.push(`no_response: ${noResponse.error.message}`);
  } else {
    const row = Array.isArray(noResponse.data) ? noResponse.data[0] : noResponse.data;
    result.noResponse = {
      reminded: toNumber(row?.reminded),
      closed: toNumber(row?.closed),
    };
  }

  // SLA breach / repeat-reopen escalation.
  const escalation = await supabase.rpc("run_sla_escalation", { p_now: stamp });
  if (escalation.error) {
    errors.push(`escalation: ${escalation.error.message}`);
  } else {
    const row = Array.isArray(escalation.data) ? escalation.data[0] : escalation.data;
    result.escalation = { escalated: toNumber(row?.escalated) };
  }

  return result;
}
