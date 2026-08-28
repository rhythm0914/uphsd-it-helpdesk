// Shared domain types for the UPHSD IT Help Desk, mirroring the database
// enums in supabase/schema.sql (user_role, ticket_status, ticket_priority)
// and the workflow rules in app/portal/queue/ticket-rules.ts.
export type UserRole = "student" | "employee" | "it_staff" | "admin" | "manager";

/** Minimal stand-in for Supabase generated DB types (enum unions only). */
export type Database = {
  public: {
    Enums: {
      user_role: UserRole;
      ticket_status: TicketStatus;
      ticket_priority: TicketPriority;
    };
  };
};

export const USER_ROLES: readonly UserRole[] = [
  "student",
  "employee",
  "it_staff",
  "admin",
  "manager",
];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_for_user"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high" | "urgent";

/** Row shape of public.knowledge_articles (Phase 8 AI Assistant KB). */
export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  service_id: string | null;
  category_id: string | null;
  keywords: string[];
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape of public.profiles. */
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  department?: string | null;
  student_number?: string | null;
  employee_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Row shape of public.services. */
export interface Service {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Row shape of public.ticket_categories. */
export interface TicketCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Row shape of public.tickets. */
export interface Ticket {
  id: string;
  ticket_number: string;
  requester_id: string;
  assigned_to: string | null;
  service_id: string;
  category_id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

/** Shape of the /api/service-categories response items. */
export interface ServiceCategoryOption {
  id: string;
  name: string;
  description?: string | null;
}

/** Minimal metadata stored on the auth user (user.user_metadata). */
export interface UserMetadata {
  full_name?: string;
  role?: string;
  [key: string]: unknown;
}

/** Reference projection: profiles(id, full_name, email[, role]). */
export interface ProfileRef {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  role?: UserRole;
}

/**
 * Ticket row joined with service/category/requester/assignee relations, as
 * returned by the archive/queue/reporting queries that embed related rows.
 * Relation fields are `| null` because a ticket row from PostgREST may not
 * include the embed (e.g. filtered selects) or the FK may be unresolvable.
 */
export interface TicketWithRelations extends Omit<Ticket, "assigned_to"> {
  service?: Pick<Service, "id" | "name"> | null;
  category?: Pick<TicketCategory, "id" | "name"> | null;
  requester?: ProfileRef | null;
  assigned_to_profile?: Pick<ProfileRef, "full_name" | "email"> | null;
  assigned_to?: string | null;
}

/** Ticket list row restricted to the columns the archive/export code uses. */
export type ArchivedTicket = Pick<Ticket, "id" | "ticket_number" | "subject" | "description" | "priority" | "status" | "created_at" | "updated_at" | "closed_at"> &
  Pick<TicketWithRelations, "service" | "category" | "requester" | "assigned_to_profile">;

/** A CSV/JSON export row produced by exportTickets(). */
export interface TicketExportRow {
  ticket_number: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  service: string | null;
  category: string | null;
  requester_name: string | null;
  requester_email: string | null;
  requester_role: UserRole | null;
  assigned_to: string | null;
  assigned_to_email: string | null;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
}

/**
 * Office Computer & IT Equipment inventory asset (Phase 9).
 *
 * Mirrors the client's Excel "Office Computer Inventory" sheet EXACTLY,
 * except the two explicitly removed fields: "Installed Sangfor" and "PMS".
 * Do NOT add, rename, or remove inventory fields.
 */
export interface IctAsset {
  id: string;
  /** Excel column "Re" */
  re: string | null;
  /** Excel column "ICT Asset" */
  ict_asset: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  specification: string | null;
  asset_number: string | null;
  date_acquired: string | null;
  /** Excel column "Name or ID of Accountable Personnel" */
  accountable_personnel: string | null;
  /** Excel column "Position of Accountable Personnel" */
  accountable_position: string | null;
  condition: string | null;
  /** Excel column "Department / Office (Location)" */
  department_office: string | null;
  /** Excel column "BLDG." */
  bldg: string | null;
  remarks: string | null;
  domain_name: string | null;
  computer_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Asset movement/transfer history entry. Historical trail only — the current
 * state always lives on the ict_assets row itself.
 */
export interface AssetMovement {
  id: string;
  asset_id: string;
  previous_accountable_personnel: string | null;
  new_accountable_personnel: string | null;
  previous_accountable_position: string | null;
  new_accountable_position: string | null;
  previous_department_office: string | null;
  new_department_office: string | null;
  previous_bldg: string | null;
  new_bldg: string | null;
  remarks: string | null;
  performed_by: string | null;
  performed_by_profile?: { full_name: string | null } | null;
  created_at: string;
}


