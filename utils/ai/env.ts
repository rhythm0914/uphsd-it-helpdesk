// Server-only access to the Cloudflare Worker environment.
//
// vinext inlines wrangler.jsonc `vars` into `process.env` at build time,
// but Worker *bindings* (such as the Workers AI binding) are only available
// on the `env` object passed to the Worker's fetch handler. vinext's default
// fetch handler does not expose `env` to application code, so this project
// uses a small custom worker entry (cloudflare/worker-entry.ts) that captures
// `env` once per isolate before delegating to vinext.
//
// SECURITY: this module must only be imported by server code. The env object
// contains bindings — it is never serialized into client bundles or API
// responses.

/** Minimal shape of the Cloudflare Workers AI binding we rely on. */
export interface WorkersAIBinding {
  run(
    model: string,
    inputs: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
}

/** The slice of the Worker environment this application needs. */
export interface WorkerEnv {
  AI?: WorkersAIBinding;
  /** Non-secret model override (a wrangler `var`, not a credential). */
  AI_MODEL?: string;
}

const ENV_GLOBAL_KEY = Symbol.for("uphsd.helpdesk.workerEnv");

/**
 * Called once per isolate by cloudflare/worker-entry.ts. Also mirrored on
 * globalThis so that code compiled into a different module instance of the
 * same isolate (e.g. another server bundle) still resolves the environment.
 */
export function setWorkerEnv(env: unknown): void {
  (globalThis as Record<symbol, unknown>)[ENV_GLOBAL_KEY] = env;
}

/**
 * Returns the current Worker environment, or `null` when running outside the
 * Worker runtime (e.g. `next dev` on Node, unit tests). Callers must degrade
 * gracefully instead of crashing.
 */
export function getWorkerEnv(): WorkerEnv | null {
  const env = (globalThis as Record<symbol, unknown>)[ENV_GLOBAL_KEY];
  return (env as WorkerEnv | undefined) ?? null;
}

/** True when a Workers AI binding is present in the current runtime. */
export function hasAIBinding(): boolean {
  return !!getWorkerEnv()?.AI;
}