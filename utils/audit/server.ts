/** Server-side audit logging helper. Calls the SECURITY DEFINER write_audit_log
 *  function so the audit row is written with elevated privileges but tied to
 *  the authenticated actor. Never callable directly from the client. */

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function writeAuditLog({
  action,
  targetType,
  targetId,
  details,
}: {
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.rpc("write_audit_log", {
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId ?? null,
    p_details: details ?? {},
  });

  if (error) {
    // Audit logging must never break the caller's flow.
    console.error("[audit] write failed:", error.message);
  }
}
