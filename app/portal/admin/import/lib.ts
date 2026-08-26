export const MAX_SUBJECT_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;

export const ALLOWED_STATUSES = ["open", "in_progress", "waiting_for_user", "resolved", "closed"] as const;
export const ALLOWED_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
