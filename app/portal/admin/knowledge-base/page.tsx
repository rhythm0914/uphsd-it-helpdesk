import { getArticles, getServicesAndCategories } from "./actions";
import { KnowledgeAdmin } from "./knowledge-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Knowledge Base — UPHSD IT Help Desk",
};

export default async function KnowledgeBaseAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params?.q ?? "";

  const [{ articles, error }, { services, categories }] = await Promise.all([
    getArticles(query),
    getServicesAndCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="mt-1 text-foreground/60">
          Manage the published articles that ground the IT Assistant. Published articles are
          visible to authenticated users; drafts are never used as AI context.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <KnowledgeAdmin
        articles={articles.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          keywords: a.keywords ?? [],
          isPublished: a.is_published,
          serviceId: a.service_id,
          categoryId: a.category_id,
          serviceName: a.service?.name ?? null,
          categoryName: a.category?.name ?? null,
          updatedAt: a.updated_at,
        }))}
        services={services}
        categories={categories}
        searchQuery={query}
      />
    </div>
  );
}