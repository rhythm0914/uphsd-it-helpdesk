import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function submitRequest(formData: FormData) {
  "use server";
  
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const serviceId = formData.get("service_id") as string;
  const categoryId = formData.get("category_id") as string;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string;

  if (!serviceId || !categoryId || !subject || !description) {
    redirect("/portal/request?error=All+required+fields+must+be+filled");
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      requester_id: user.id,
      service_id: serviceId,
      category_id: categoryId,
      subject,
      description,
      priority: priority || "normal",
      status: "open",
    })
    .select()
    .single();

  if (error) {
    redirect("/portal/request?error=" + encodeURIComponent(error.message));
  }

  redirect(`/portal/tickets/${data.id}`);
}

export default async function RequestPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const [servicesResult, categoriesResult] = await Promise.all([
    supabase.from("services").select("*").eq("is_active", true).order("name"),
    supabase.from("ticket_categories").select("*").eq("is_active", true).order("name"),
  ]);

  const services = servicesResult.data || [];
  const categories = categoriesResult.data || [];
  const servicesError = servicesResult.error;
  const categoriesError = categoriesResult.error;
  const hasLoadError = servicesError || categoriesError;
  const isEmpty = !hasLoadError && services.length === 0 && categories.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Submit a Request</h1>
        <p className="mt-1 text-foreground/60">
          Fill out the form below and we will get back to you during business hours.
        </p>
      </div>

      <form action={submitRequest} className="space-y-6">
        {hasLoadError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">
              Services and categories are currently unavailable. Please try again later or contact IT support.
            </p>
          </div>
        )}

        {isEmpty && !hasLoadError && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-700">
              No services or categories are configured yet. Please contact IT support to set up available services.
            </p>
          </div>
        )}

        {!hasLoadError && !isEmpty && (
          <div className="rounded-2xl border border-border bg-background p-6 space-y-6">
          <div>
            <label htmlFor="service_id" className="block text-sm font-medium mb-2">
              Service <span className="text-brand-primary">*</span>
            </label>
            <select
              id="service_id"
              name="service_id"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Select a service</option>
              {services.map((service: any) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="category_id" className="block text-sm font-medium mb-2">
              Category <span className="text-brand-primary">*</span>
            </label>
            <select
              id="category_id"
              name="category_id"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Select a category</option>
              {categories.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              Subject <span className="text-brand-primary">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              required
              maxLength={200}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Brief summary of your request"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description <span className="text-brand-primary">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Please provide details about your request..."
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-2">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="normal"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        )}

        <div className="flex items-center justify-end gap-4">
          <a
            href="/portal"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}