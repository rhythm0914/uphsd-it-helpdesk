-- Phase 1 (step 1 of 2) — new ticket status values.
--
-- PostgreSQL cannot rename or remove enum labels, so the original values
-- (`open`, `in_progress`, `waiting_for_user`, `resolved`, `closed`) are kept and
-- two BPMN states are added: `reopened` and `rejected`. Their exact
-- user-facing labels ("Assigned / In Progress", "Awaiting Student") live in
-- utils/tickets/constants.ts.
--
-- IMPORTANT: run this file on its own, *before* 20261110_02_*. `ALTER TYPE ...
-- ADD VALUE` must not be used in the same transaction that adds it, so keeping
-- it in a separate script avoids "unsafe use of new value of enum type".
--
-- Safe to re-run.

ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'reopened';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'rejected';
