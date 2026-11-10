import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/utils/tickets/constants";

export const MAX_SUBJECT_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;

// Re-exported from the single shared workflow module so imports cannot drift
// from the state machine.
export const ALLOWED_STATUSES: readonly string[] = TICKET_STATUSES;
export const ALLOWED_PRIORITIES: readonly string[] = TICKET_PRIORITIES;
