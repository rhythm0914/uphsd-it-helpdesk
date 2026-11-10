"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateTicketNumber } from "@/utils/ticket-number";
import type { Database } from "@/types/database";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/utils/tickets/constants";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

// Import validation reads the shared workflow lists so a CSV can never inject a
// status the state machine does not know about.
const ALLOWED_STATUSES: readonly string[] = TICKET_STATUSES;
const ALLOWED_PRIORITIES: readonly string[] = TICKET_PRIORITIES;
const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function validateRow(row: Record<string, unknown>) {
  const errors: string[] = [];
  const ticketNumber = normalizeString(row.ticket_number);
  const requesterEmail = normalizeString(row.requester_email).toLowerCase();
  const service = normalizeString(row.service);
  const category = normalizeString(row.category);
  const subject = normalizeString(row.subject);
  const description = normalizeString(row.description);
  const priority = normalizeString(row.priority).toLowerCase();
  const status = normalizeString(row.status).toLowerCase();
  const createdAt = normalizeString(row.created_at);

  if (!ticketNumber) {
    errors.push("Missing ticket_number");
  }

  if (!requesterEmail) {
    errors.push("Missing requester_email");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    errors.push("Invalid requester_email format");
  }

  if (!service) {
    errors.push("Missing service");
  }

  if (!category) {
    errors.push("Missing category");
  }

  if (!subject) {
    errors.push("Missing subject");
  } else if (subject.length > MAX_SUBJECT_LENGTH) {
    errors.push(`Subject exceeds ${MAX_SUBJECT_LENGTH} characters`);
  }

  if (!description) {
    errors.push("Missing description");
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  if (!priority) {
    errors.push("Missing priority");
  } else if (!ALLOWED_PRIORITIES.includes(priority)) {
    errors.push(`Invalid priority "${priority}". Allowed: ${ALLOWED_PRIORITIES.join(", ")}`);
  }

  if (!status) {
    errors.push("Missing status");
  } else if (!ALLOWED_STATUSES.includes(status)) {
    errors.push(`Invalid status "${status}". Allowed: ${ALLOWED_STATUSES.join(", ")}`);
  }

  if (createdAt && isNaN(Date.parse(createdAt))) {
    errors.push("Invalid created_at date format");
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: {
      ticket_number: ticketNumber || null,
      requester_email: requesterEmail || null,
      service,
      category,
      subject,
      description,
      priority: priority || null,
      status: status || null,
      created_at: createdAt || null,
    },
  };
}

export async function validateImportCsv(csvRows: Record<string, unknown>[]) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  const [servicesResult, categoriesResult, profilesResult] = await Promise.all([
    supabase.from("services").select("id, name, is_active"),
    supabase.from("ticket_categories").select("id, name, is_active"),
    supabase.from("profiles").select("id, email, full_name, role").ilike("email", "%@%"),
  ]);

  const services = (servicesResult.data || []).reduce<Record<string, { id: string; is_active: boolean }>>(
    (acc, s) => {
      acc[s.name.toLowerCase()] = { id: s.id, is_active: s.is_active };
      return acc;
    },
    {}
  );

  const categories = (categoriesResult.data || []).reduce<Record<string, { id: string; is_active: boolean }>>(
    (acc, c) => {
      acc[c.name.toLowerCase()] = { id: c.id, is_active: c.is_active };
      return acc;
    },
    {}
  );

  const profilesByEmail = (profilesResult.data || []).reduce<Record<string, { id: string; full_name: string; role: string; email: string }>>(
    (acc, p) => {
      acc[p.email.toLowerCase()] = { id: p.id, full_name: p.full_name, role: p.role, email: p.email };
      return acc;
    },
    {}
  );

  const existingTicketNumbers = new Set<string>();
  const existingSimilar = new Map<string, { ticket_number: string; subject: string; requester_email: string; service: string; category: string }>();

  if (csvRows.length > 0) {
    const ticketNumbers = csvRows
      .map((r) => normalizeString(r.ticket_number))
      .filter((t) => t);

    if (ticketNumbers.length > 0) {
      const { data: existingTickets } = await supabase
        .from("tickets")
        .select("ticket_number, subject, requester_id, service_id, category_id")
        .in("ticket_number", ticketNumbers);

      (existingTickets || []).forEach((t) => {
        existingTicketNumbers.add(t.ticket_number.toLowerCase());
      });
    }

    const similarCandidates = csvRows.filter((r) => {
      const subject = normalizeString(r.subject).toLowerCase();
      const service = normalizeString(r.service).toLowerCase();
      const category = normalizeString(r.category).toLowerCase();
      return subject && service && category;
    });

    if (similarCandidates.length > 0) {
      const { data: similarTickets } = await supabase
        .from("tickets")
        .select("ticket_number, subject, requester_id, service_id, category_id")
        .order("created_at", { ascending: false })
        .limit(1000);

      (similarTickets || []).forEach((t) => {
        const service = services[t.service_id] ? Object.keys(services).find((k) => services[k].id === t.service_id)?.toLowerCase() : "";
        const category = categories[t.category_id] ? Object.keys(categories).find((k) => categories[k].id === t.category_id)?.toLowerCase() : "";
        const key = `${t.subject.toLowerCase()}|${service}|${category}`;
        existingSimilar.set(key, {
          ticket_number: t.ticket_number,
          subject: t.subject,
          requester_email: t.requester_id ? profilesByEmail[t.requester_id]?.email || "" : "",
          service: service || "",
          category: category || "",
        });
      });
    }
  }

  const preview = csvRows.map((row, index) => {
    const rowNum = index + 1;
    const validation = validateRow(row);

    let duplicateStatus: "none" | "exact" | "possible" = "none";
    let duplicateInfo: string | null = null;

    if (validation.isValid) {
      const ticketNumber = validation.normalized.ticket_number!.toLowerCase();
      if (existingTicketNumbers.has(ticketNumber)) {
        duplicateStatus = "exact";
        duplicateInfo = `Ticket number ${validation.normalized.ticket_number} already exists`;
      } else {
        const subject = validation.normalized.subject!.toLowerCase();
        const service = validation.normalized.service!.toLowerCase();
        const category = validation.normalized.category!.toLowerCase();
        const key = `${subject}|${service}|${category}`;
        const existing = existingSimilar.get(key);
        if (existing) {
          duplicateStatus = "possible";
          duplicateInfo = `Similar to existing ticket ${existing.ticket_number}`;
        }
      }
    }

    return {
      rowNum,
      ticket_number: validation.normalized.ticket_number,
      subject: validation.normalized.subject,
      requester_email: validation.normalized.requester_email,
      service: validation.normalized.service,
      category: validation.normalized.category,
      priority: validation.normalized.priority,
      status: validation.normalized.status,
      validation,
      duplicateStatus,
      duplicateInfo,
    };
  });

  const validRows = preview.filter((p) => p.validation.isValid && p.duplicateStatus === "none");
  const exactDuplicates = preview.filter((p) => p.duplicateStatus === "exact");
  const possibleDuplicates = preview.filter((p) => p.duplicateStatus === "possible");
  const invalidRows = preview.filter((p) => !p.validation.isValid);

  return {
    preview,
    summary: {
      total: csvRows.length,
      valid: validRows.length,
      exactDuplicates: exactDuplicates.length,
      possibleDuplicates: possibleDuplicates.length,
      invalid: invalidRows.length,
    },
  };
}

export async function confirmImport(validRows: Record<string, unknown>[]) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  const [servicesResult, categoriesResult, profilesResult] = await Promise.all([
    supabase.from("services").select("id, name, is_active"),
    supabase.from("ticket_categories").select("id, name, is_active"),
    supabase.from("profiles").select("id, email"),
  ]);

  const services = (servicesResult.data || []).reduce<Record<string, string>>(
    (acc, s) => {
      acc[s.name.toLowerCase()] = s.id;
      return acc;
    },
    {}
  );

  const categories = (categoriesResult.data || []).reduce<Record<string, string>>(
    (acc, c) => {
      acc[c.name.toLowerCase()] = c.id;
      return acc;
    },
    {}
  );

  const profilesByEmail = (profilesResult.data || []).reduce<Record<string, string>>(
    (acc, p) => {
      acc[p.email.toLowerCase()] = p.id;
      return acc;
    },
    {}
  );

  const serviceCategoryMap = new Map<string, Set<string>>();
  const { data: mappings } = await supabase
    .from("service_categories")
    .select("service_id, category_id");

  (mappings || []).forEach((m) => {
    if (!serviceCategoryMap.has(m.service_id)) {
      serviceCategoryMap.set(m.service_id, new Set());
    }
    serviceCategoryMap.get(m.service_id)!.add(m.category_id);
  });

  const filename = validRows[0]?._filename || "unknown";

  let imported = 0;
  let duplicates = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const row of validRows) {
    const ticketNumber = normalizeString(row.ticket_number);
    const requesterEmail = normalizeString(row.requester_email).toLowerCase();
    const serviceName = normalizeString(row.service).toLowerCase();
    const categoryName = normalizeString(row.category).toLowerCase();
    const subject = normalizeString(row.subject);
    const description = normalizeString(row.description);
    const priority = normalizeString(row.priority).toLowerCase();
    const status = normalizeString(row.status).toLowerCase();
    const createdAt = normalizeString(row.created_at);

    const serviceId = services[serviceName];
    const categoryId = categories[categoryName];
    const requesterId = profilesByEmail[requesterEmail];

    if (!serviceId || !categoryId || !requesterId) {
      rejected++;
      errors.push(`Row ${row._rowNum || "?"}: missing service, category, or requester`);
      continue;
    }

    const validCategories = serviceCategoryMap.get(serviceId);
    if (!validCategories || !validCategories.has(categoryId)) {
      rejected++;
      errors.push(`Row ${row._rowNum || "?"}: category is not mapped to the selected service`);
      continue;
    }

    const finalTicketNumber = ticketNumber || (await generateTicketNumber(supabase));

    const { error } = await supabase.from("tickets").insert({
      ticket_number: finalTicketNumber,
      requester_id: requesterId,
      service_id: serviceId,
      category_id: categoryId,
      subject,
      description,
      priority: priority as Database["public"]["Enums"]["ticket_priority"],
      status: status as Database["public"]["Enums"]["ticket_status"],
      created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
    });

    if (error) {
      if (error.code === "23505") {
        duplicates++;
      } else {
        rejected++;
        errors.push(`Row ${row._rowNum || "?"}: ${error.message}`);
      }
    } else {
      imported++;
    }
  }

  const { error: auditError } = await supabase.from("imports").insert({
    filename,
    imported_by: user.id,
    total_rows: validRows.length,
    imported_rows: imported,
    duplicate_rows: duplicates,
    rejected_rows: rejected,
    error_report: errors.length > 0 ? errors.join("\n") : null,
  });

  if (auditError) {
    return {
      success: true,
      summary: { imported, duplicates, rejected, total: validRows.length },
      errors,
    };
  }

  return {
    success: true,
    summary: { imported, duplicates, rejected, total: validRows.length },
    errors,
  };
}

export async function downloadCsvTemplate() {
  const headers = [
    "ticket_number",
    "requester_email",
    "service",
    "category",
    "subject",
    "description",
    "priority",
    "status",
    "created_at",
  ];

  const exampleRow = [
    "IT-2026-000001",
    "user@perpetual.edu.ph",
    "University Email",
    "Email",
    "Cannot access email",
    "User reports inability to log in to university email",
    "normal",
    "open",
    "2026-08-27",
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
  ].join("\n");

  return {
    content: csvContent,
    filename: `uphsd-it-helpdesk-import-template-${new Date().toISOString().split("T")[0]}.csv`,
  };
}
