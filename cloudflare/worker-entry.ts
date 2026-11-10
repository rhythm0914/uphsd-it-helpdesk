// Custom Cloudflare Worker entry for the UPHSD IT Help Desk.
//
// vinext's default fetch handler (vinext/server/fetch-handler) does not
// expose the Worker `env` object to application code, and the AI binding can
// only be reached through `env`. This entry simply captures `env` once per
// isolate (utils/ai/env.ts mirrors it on globalThis) and then delegates to
// vinext unchanged — no framework behavior is modified.
//
// The captured environment is used exclusively server-side by
// utils/ai/* — it is never sent to the browser.

import handler from "vinext/server/fetch-handler";
import { setWorkerEnv } from "@/utils/ai/env";
import { runScheduledJobs, type ScheduledEnv } from "@/utils/jobs/run-scheduled";

/** Minimal structural types for the Workers runtime (no global types needed). */
interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const helper: {
  fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: WorkerExecutionContext,
  ): Promise<Response>;
  scheduled(
    controller: unknown,
    env: Record<string, unknown>,
    ctx: WorkerExecutionContext,
  ): Promise<void>;
} = {
  async fetch(request, env, ctx) {
    setWorkerEnv(env);
    return handler.fetch(request, env, ctx);
  },

  // Cron entry point (see triggers.crons in wrangler.jsonc). The reminder /
  // auto-close / escalation passes run inside Postgres; this only triggers
  // them with the service-role key, which is a Worker secret and never
  // reaches the browser.
  async scheduled(_controller, env, ctx) {
    setWorkerEnv(env);
    ctx.waitUntil(
      runScheduledJobs(env as ScheduledEnv).catch((error) => {
        console.error("[scheduled] maintenance pass failed", error);
      }),
    );
  },
};

export default helper;