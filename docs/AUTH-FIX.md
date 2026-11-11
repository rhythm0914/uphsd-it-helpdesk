# AUTH-FIX

## 1. Auth architecture (mapped from repo)

### Stack
- **Framework/runtime:** Next.js 16.3.3 app with `vinext` (Vite) and Cloudflare Workers deployment (`wrangler.jsonc`, `vite.config.ts`, `@vinext/cloudflare`, `cloudflare/worker-entry.ts`).
- **Auth:** Supabase Auth via `@supabase/ssr` and `@supabase/supabase-js`. Public env vars configured in `wrangler.jsonc` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL`).
- **Session storage:** Cookie-based Supabase SSR sessions (including chunked auth cookies managed by `@supabase/ssr`). No localStorage-based route guard found.

### Session creation / mutation
- `app/auth/actions.ts`: server actions `signIn` (`signInWithPassword`), `signUp`, `resendConfirmation`, `forgotPassword` (`resetPasswordForEmail`), `updatePassword` (`updateUser`), `signOut` (`auth.signOut`), `adminAssistedRecovery`. `next` destinations validated server-side with `getValidatedReturnTo`.
- `app/auth/callback/route.ts`: exchanges PKCE `code` or verifies OTP/token hash, creates missing profile on OTP signup path when needed, redirects to validated `next` (recovery -> `/auth/update-password`) or sign-in error.
- `app/auth/sign-out/route.ts`: GET/POST invoke `signOut()`.

### Supabase client/session helpers
- `utils/supabase/client.ts`: browser `createBrowserClient`.
- `utils/supabase/server.ts`: server `createServerClient` bound to `cookies()` store; `setAll` writes cookie options when allowed (Server Components may be read-only).
- `utils/supabase/middleware.ts` and `utils/auth/session.ts`: middleware-bound SSR client; refresh/validation via `supabase.auth.getUser()` and persistence of updated cookies on the outgoing response.
- `middleware.ts`: central route guard/redirect behavior for `/portal/*` and auth routes.

### Session verification / role enforcement (server-side)
- `middleware.ts`: protects `/portal/*`, refreshes session, forwards cookies on redirects, redirects unauthenticated portal requests to `/auth/sign-in?next=<validated target>`, redirects authenticated users away from auth pages (except `/auth/update-password`, `/auth/callback`) to validated `next` or `/portal`.
- `app/portal/layout.tsx`: requires authenticated user, loads/repairs profile fallback, renders portal shell; unauthenticated fallback redirects to sign-in with best-effort `next`.
- Portal pages/actions keep defense-in-depth auth checks and preserve `next` on unauthenticated redirects: `app/portal/page.tsx`, `request/*`, `track/page.tsx`, `notifications/*`, `assistant/page.tsx`, `queue/page.tsx`, `queue/[id]/page.tsx`, `admin/*`.
- Role checks: `utils/authorization.ts` (`isITStaff`, `isAdmin`); admin layout/pages require admin/manager, queue pages require IT staff/admin/manager. **Authenticated but unauthorized users are redirected to `/portal?error=forbidden` (never to sign-in).**
- API routes (e.g. `app/api/assistant/route.ts`) authenticate via server session and return 401 for unauthenticated callers (no sign-in redirect).

### Client navigation
- Sidebar/header use framework `Link` with correct portal hrefs (`/portal`, `/portal/request`, `/portal/track`, `/portal/queue`, `/portal/notifications`, `/portal/admin`). No client auth listener forcing sign-in on hydration was found; route protection is server/middleware-driven.

## 2. Redirect / `next` handling sites (key)
- `middleware.ts`: builds validated sign-in redirect target from original portal path+search.
- `utils/auth/session.ts`: `buildSignInRedirect`, `getSafeNextFromPath`, `copyResponseCookies`, `withNoStore`.
- `utils/authorization.ts`: `getValidatedReturnTo` (single source of truth, server-validated).
- `app/auth/actions.ts`, `app/auth/callback/route.ts`, auth pages (`sign-in`, `sign-up`, `forgot-password`, `update-password`), portal guards/actions.

## 3. Reproduction and instrumentation

### Reported production symptom
- Authenticated user lands on `/portal` (session visible), clicks sidebar/portal links, and is redirected to `/auth/sign-in?next=%2Fportal` (or target) while still signed in. `?next=` indicates a server-side guard rejected the request as unauthenticated.

### Local investigation in this environment
- Inspected middleware, Supabase SSR helpers, auth actions/callback/pages, portal layouts/pages/actions, sidebar, and configs.
- Started Next dev server locally (`uphsd-it-helpdesk`, `npm.cmd run dev`, http://localhost:3000). **Could not perform authenticated Playwright sign-in/click-through** because no valid Supabase test credentials/session were available in the workspace environment and `.env`/`.env.local` are absent.
- **Could not run production-style vinext/wrangler preview end-to-end with auth** or verify on https://uphsd-it-helpdesk.rycanano.workers.dev/ (no deployment/browser session/credentials available from this environment).

## 4. Confirmed root cause (code evidence)

### Primary: refreshed/updated Supabase auth cookies not persisted with full options in middleware (and fragile cookie propagation)
- **Before fix:** `utils/supabase/middleware.ts` `createClient` set cookies in `setAll` as `supabaseResponse.cookies.set(name, value)` **without `options`** (path, max-age/expires, secure, sameSite, httpOnly as provided by `@supabase/ssr`). It also rebuilt `NextResponse.next({request})` and copied cookies to the request/response but dropped cookie attributes.
- **Effect:** during middleware session refresh/validation (`auth.getUser()` can rotate tokens), updated auth cookies (including chunked cookies) could be written without correct attributes. Subsequent document/RSC/prefetch/data navigations to `/portal/*` then failed server-side auth checks and middleware redirected to `/auth/sign-in?next=...` even though the user had just signed in. This matches: first post-login render works, link navigations bounce to sign-in with session still present.
- **Before fix:** `utils/supabase/server.ts` `setAll` called `cookieStore.set(name, value, options)` in general, but middleware-side persistence was the critical path for navigation requests; redirect responses also needed reliable cookie copying.

### Secondary/hardening issues addressed
- **`next` validation was too permissive:** `getValidatedReturnTo` allowed any single-slash path without `/portal` allowlist and was weak against encoded traversal/protocol tricks. Hardened to accept only normalized `/portal` paths, reject encoded/protocol-relative/absolute/`\\`/traversal/control-char/malformed inputs.
- **Duplicated/inconsistent guards:** several portal pages/actions redirected unauthenticated users to `/auth/sign-in` without `next`; role failures in admin/queue paths could redirect to `/portal` without an explicit forbidden context. Centralized session/middleware helpers and made unauth redirects preserve validated targets; unauthorized authenticated users redirect to `/portal?error=forbidden`.
- **Authenticated auth-page access:** sign-in/sign-up/forgot-password/login/signup pages now redirect authenticated users to validated `next` or `/portal` (middleware also enforces), preventing confusing re-auth flows.
- **Private response caching:** portal/auth-guard responses set `Cache-Control: private, no-store, max-age=0, must-revalidate`, `Pragma: no-cache`, and `Vary: Cookie` to avoid serving authenticated/unauthenticated HTML incorrectly.
- **Sidebar active state:** active item selection now prefers the longest matching href to avoid ambiguous matches.

### Ruled out / not evidenced
- **Client-only session storage:** guards are cookie/server-based.
- **Client hydration redirect to sign-in:** no `onAuthStateChange`/session-null sign-in push found in portal shell.
- **Explicit RSC-header special-casing bug:** not identified in source; cookie persistence fix addresses the most likely failure mode for server-evaluated navigations.

## 5. Implemented fix

### Centralized session/auth helpers
- Added `utils/auth/session.ts`: `getMiddlewareSession` (SSR client + `auth.getUser()` refresh/validation), cookie propagation with full options, `buildSignInRedirect`, `getSafeNextFromPath`, `copyResponseCookies`, `withNoStore`, route helpers.
- Hardened `utils/supabase/middleware.ts` and `utils/supabase/server.ts` to preserve cookie `options` in `setAll`.
- Updated `middleware.ts` to use centralized session handling, protect `/portal/*`, refresh and forward cookies on all outcomes, redirect only when no valid/refreshable session, preserve validated original target in `next`, and redirect authenticated users away from auth routes (except recovery/callback) safely.

### `next` validation and auth flows
- Hardened `getValidatedReturnTo` in `utils/authorization.ts` with `/portal` allowlist, normalization, decoding checks, traversal/protocol/host/backslash/control-char rejection.
- `app/auth/actions.ts`: validate `next`, preserve it on sign-in/resend error redirects, require successful session before redirect.
- `app/auth/callback/route.ts`: validated `next`, recovery destination handling retained.
- Auth pages (`sign-in`, `sign-up`, `forgot-password`, `/login`, `/signup`): redirect authenticated users to validated destination/portal.

### Guard hardening
- `app/portal/layout.tsx`, `app/portal/page.tsx`, request/track/notifications/assistant/queue/admin pages and relevant actions: consistent unauth redirects with `next`, authenticated unauthorized users -> `/portal?error=forbidden`.
- `app/portal/queue/[id]/page.tsx`: fixed param/id handling and staff guard.

## 6. Tests and checks

### Added/updated
- `tests/unit/authorization.test.ts`: expanded `getValidatedReturnTo` coverage for safe portal paths, defaulting, open-redirect/protocol tricks (`//evil.com`, `https://evil.com`, `/\evil.com`, backslash host, schemes), encoded/traversal/control-char cases, and non-portal allowlist rejection.

### Executed locally
- `node ./node_modules/vitest/vitest.mjs run tests/unit/authorization.test.ts` — **PASS** (12 tests).
- `npm.cmd run -s lint` — **FAIL (pre-existing repo-wide lint errors, 29 errors/6 warnings)** unrelated to this auth fix (e.g. `react-hooks/purity` in existing UI components, `no-explicit-any`/unused vars in existing tests/scripts/utils, etc.). No lint errors were introduced in modified auth/session/authorization files.
- `node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit --pretty false` — **FAIL (pre-existing)**: `tests/unit/ticket-state-machine.test.ts` and `utils/tickets/sla.ts` type errors present in repo state, not caused by auth changes.
- Authenticated Playwright end-to-end flows, Workers/vinext preview validation, and production click-through — **not executed** in this environment (no Supabase test credentials/session, no deploy/browser access).

## 7. Production deployment and verification (required follow-up)

Not performed from this environment. Required after deploy to https://uphsd-it-helpdesk.rycanano.workers.dev/:
1. Sign in and click Dashboard, IT Queue, Notifications, Admin, Track, New Request; confirm URL never becomes `/auth/sign-in` and each page heading/content is correct.
2. Hard reload each portal page and open a portal URL in a new tab (shared session) — must remain signed in.
3. Simulate access-token expiry with valid refresh token — navigation must refresh session without sign-in redirect.
4. Signed out: `/portal/queue` -> `/auth/sign-in?next=%2Fportal%2Fqueue`; after sign-in lands on `/portal/queue`.
5. Signed in: `/auth/sign-in` and `/auth/sign-up` -> `/portal` (or validated `next`).
6. Role checks: student cannot open `/portal/admin` or `/portal/queue` (403/redirect to `/portal`, not sign-in); admin/manager can.
7. Sign out clears session; protected pages redirect to sign-in; Back does not reveal protected content.
8. Verify Workers env/secrets required for auth exist in production (names only) and host/https/cookie behavior on `workers.dev` is correct. Check for any production-only `proxy`/middleware convention behavior under vinext.

## 8. Files changed (auth fix)
- `middleware.ts`
- `utils/auth/session.ts` (new)
- `utils/supabase/middleware.ts`
- `utils/supabase/server.ts`
- `utils/authorization.ts`
- `app/auth/actions.ts`
- `app/auth/callback/route.ts`
- `app/auth/sign-in/page.tsx`
- `app/auth/sign-up/page.tsx`
- `app/auth/forgot-password/page.tsx`
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/portal/layout.tsx`
- `app/portal/page.tsx`
- `app/portal/admin/layout.tsx`
- `app/portal/admin/page.tsx`
- `app/portal/assistant/page.tsx`
- `app/portal/notifications/page.tsx`
- `app/portal/notifications/actions.ts`
- `app/portal/queue/page.tsx`
- `app/portal/queue/[id]/page.tsx`
- `app/portal/request/page.tsx`
- `app/portal/request/actions.ts`
- `app/portal/track/page.tsx`
- `components/layout/sidebar.tsx` (active link selection hardening)
- `tests/unit/authorization.test.ts`
- `docs/AUTH-FIX.md`

## 9. Separate issue: primary button styling
- Separate commit applies theme/token compatibility fixes for `brand-primary`/`primary` button utilities (`app/globals.css`, shared button components/pages as needed). Must be verified in browser (computed styles) and on production after deploy; not browser-verified in this environment.
