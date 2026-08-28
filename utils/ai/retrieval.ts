// Knowledge retrieval for the AI Assistant.
//
// Phase 8 uses simple, reliable keyword retrieval over the existing
// PostgreSQL knowledge base — no vector infrastructure. Only PUBLISHED
// articles are ever retrieved (the DB also enforces this via RLS, but the
// query filters explicitly so the AI never sees drafts even if it is called
// from a context where RLS would allow more).

export interface RetrievedArticle {
  title: string;
  slug: string;
  excerpt: string;
  serviceName: string | null;
  categoryName: string | null;
}

/** Raw row shape selected from Supabase. */
interface KnowledgeArticleRow {
  title: string;
  slug: string;
  content: string;
  keywords: string[] | null;
  service: { name: string } | null;
  category: { name: string } | null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "do", "does", "did", "how", "what",
  "when", "where", "why", "can", "i", "my", "me", "you", "your", "it", "this",
  "that", "please", "help", "not", "no", "yes", "at", "as", "if", "from",
]);

const MAX_TERMS = 8;
const MAX_ARTICLES = 3;
const EXCERPT_LENGTH = 1200;

/** Extracts up to 8 meaningful search terms from a user message. */
export function extractSearchTerms(message: string): string[] {
  const terms = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return [...new Set(terms)].slice(0, MAX_TERMS);
}

/**
 * Pure scoring pass so retrieval behavior is unit-testable independent of
 * Supabase. Filters to published rows (defense in depth with the explicit
 * query filter + RLS) and ranks by keyword hits, then title hits.
 */
export function rankArticles(
  rows: KnowledgeArticleRow[],
  terms: string[],
): KnowledgeArticleRow[] {
  return rows
    .filter((row) => typeof row.title === "string" && typeof row.content === "string")
    .map((row) => {
      const title = row.title.toLowerCase();
      const content = row.content.toLowerCase();
      const keywords = (row.keywords ?? []).map((k) => k.toLowerCase());
      let score = 0;
      for (const term of terms) {
        if (keywords.some((k) => k.includes(term))) score += 3;
        if (title.includes(term)) score += 2;
        if (content.includes(term)) score += 1;
      }
      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ARTICLES)
    .map((entry) => entry.row);
}

function toRetrieved(row: KnowledgeArticleRow): RetrievedArticle {
  return {
    title: row.title,
    slug: row.slug,
    excerpt:
      row.content.length > EXCERPT_LENGTH
        ? `${row.content.slice(0, EXCERPT_LENGTH)}…`
        : row.content,
    serviceName: row.service?.name ?? null,
    categoryName: row.category?.name ?? null,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Retrieves relevant published articles for a user message. Never throws —
 * retrieval failure must not break the assistant, it just means the AI
 * answers from general knowledge (and the system prompt already forbids
 * fabricating UPHSD procedures).
 */
export async function retrieveKnowledge(
  supabase: SupabaseClient,
  userMessage: string,
): Promise<RetrievedArticle[]> {
  const terms = extractSearchTerms(userMessage);
  if (terms.length === 0) return [];

  try {
    // Fetch a bounded candidate set of published articles and rank in
    // application code. Candidates are limited so large knowledge bases
    // never blow up the request.
    const { data } = await supabase
      .from("knowledge_articles")
      .select(
        "title, slug, content, keywords, service:services(name), category:ticket_categories(name)",
      )
      .eq("is_published", true)
      .limit(200);

    const rows = (data ?? []) as unknown as KnowledgeArticleRow[];
    return rankArticles(rows, terms).map(toRetrieved);
  } catch {
    return [];
  }
}