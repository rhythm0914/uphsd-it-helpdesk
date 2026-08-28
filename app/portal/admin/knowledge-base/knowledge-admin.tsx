"use client";

// Admin/manager knowledge-base management UI. All mutations go through the
// server actions in ./actions.ts, which re-verify auth and the admin/manager
// role server-side — this component performs no authorization of its own.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createArticle,
  deleteArticle,
  setArticlePublished,
  updateArticle,
} from "./actions";

interface ServiceOption { id: string; name: string }
interface CategoryOption { id: string; name: string }

interface ArticleView {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  isPublished: boolean;
  serviceId: string | null;
  categoryId: string | null;
  serviceName: string | null;
  categoryName: string | null;
  updatedAt: string;
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

interface EditorState {
  id: string | null;
  title: string;
  content: string;
  keywords: string;
  serviceId: string;
  categoryId: string;
  isPublished: boolean;
}

const EMPTY_EDITOR: EditorState = {
  id: null,
  title: "",
  content: "",
  keywords: "",
  serviceId: "",
  categoryId: "",
  isPublished: false,
};

export function KnowledgeAdmin({
  articles,
  services,
  categories,
  searchQuery,
}: {
  articles: ArticleView[];
  services: ServiceOption[];
  categories: CategoryOption[];
  searchQuery: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function startCreate() {
    setEditor({ ...EMPTY_EDITOR });
    setMessage(null);
  }

  function startEdit(article: ArticleView) {
    setEditor({
      id: article.id,
      title: article.title,
      content: article.content,
      keywords: article.keywords.join(", "),
      serviceId: article.serviceId ?? "",
      categoryId: article.categoryId ?? "",
      isPublished: article.isPublished,
    });
    setMessage(null);
  }

  function handleSave() {
    if (!editor) return;
    if (!editor.title.trim() || !editor.content.trim()) {
      setMessage({ type: "error", text: "Title and content are required." });
      return;
    }
    const formData = new FormData();
    formData.set("title", editor.title);
    formData.set("content", editor.content);
    formData.set("keywords", editor.keywords);
    formData.set("service_id", editor.serviceId);
    formData.set("category_id", editor.categoryId);
    formData.set("is_published", editor.isPublished ? "true" : "false");
    if (editor.id) formData.set("id", editor.id);

    startTransition(async () => {
      const result = editor.id
        ? (await updateArticle(formData))
        : await createArticle(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: editor.id ? "Article updated." : "Article created." });
        setEditor(null);
        router.refresh();
      }
    });
  }

  function togglePublished(article: ArticleView) {
    startTransition(async () => {
      const result = await setArticlePublished(article.id, !article.isPublished);
      if (result.error) setMessage({ type: "error", text: result.error });
      else router.refresh();
    });
  }

  function remove(article: ArticleView) {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="alert"
          className={`rounded-lg border p-4 text-sm ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <form className="flex gap-2 flex-1 max-w-md" action="/portal/admin/knowledge-base">
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search articles..."
            className={inputClass}
            aria-label="Search articles"
          />
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface transition-colors shrink-0"
          >
            Search
          </button>
        </form>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-hover transition-colors shrink-0"
        >
          New Article
        </button>
      </div>

      {editor && (
        <div className="rounded-2xl border border-border bg-background p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editor.id ? "Edit Article" : "New Article"}</h2>
          <div>
            <label htmlFor="kb-title" className="block text-sm font-medium mb-2">
              Title
            </label>
            <input
              id="kb-title"
              value={editor.title}
              onChange={(e) => setEditor({ ...editor, title: e.target.value })}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="kb-content" className="block text-sm font-medium mb-2">
              Content
            </label>
            <textarea
              id="kb-content"
              value={editor.content}
              onChange={(e) => setEditor({ ...editor, content: e.target.value })}
              rows={8}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="kb-service" className="block text-sm font-medium mb-2">
                Service (optional)
              </label>
              <select
                id="kb-service"
                value={editor.serviceId}
                onChange={(e) => setEditor({ ...editor, serviceId: e.target.value })}
                className={inputClass}
              >
                <option value="">None</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="kb-category" className="block text-sm font-medium mb-2">
                Category (optional)
              </label>
              <select
                id="kb-category"
                value={editor.categoryId}
                onChange={(e) => setEditor({ ...editor, categoryId: e.target.value })}
                className={inputClass}
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="kb-keywords" className="block text-sm font-medium mb-2">
              Keywords (comma-separated)
            </label>
            <input
              id="kb-keywords"
              value={editor.keywords}
              onChange={(e) => setEditor({ ...editor, keywords: e.target.value })}
              className={inputClass}
              placeholder="e.g. password, wifi, canvas"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="kb-published"
              checked={editor.isPublished}
              onChange={(e) => setEditor({ ...editor, isPublished: e.target.checked })}
              className="rounded border-border"
            />
            <label htmlFor="kb-published" className="text-sm text-foreground/70">
              Published (visible to users and used as AI context)
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditor(null)}
              disabled={isPending}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background divide-y divide-border">
        {articles.length === 0 ? (
          <p className="p-6 text-sm text-foreground/60 text-center">
            No articles yet. Create your first knowledge article so the AI Assistant can ground
            its answers in official UPHSD information.
          </p>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{article.title}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        article.isPublished
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {article.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60 line-clamp-2">{article.content}</p>
                  <p className="mt-1 text-xs text-foreground/50">
                    {article.serviceName ? `${article.serviceName}` : "No service"}
                    {article.categoryName ? ` / ${article.categoryName}` : ""}
                    {article.keywords.length > 0 ? ` | Keywords: ${article.keywords.join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePublished(article)}
                    disabled={isPending}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors disabled:opacity-50"
                  >
                    {article.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(article)}
                    disabled={isPending}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(article)}
                    disabled={isPending}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
