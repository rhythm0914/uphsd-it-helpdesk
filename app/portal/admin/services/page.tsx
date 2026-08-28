import { getServicesAndCategories } from "./actions";
import { ServiceManagement } from "./service-management";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const { services, categories, error } = await getServicesAndCategories();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Services & Categories</h1>
        <p className="mt-1 text-foreground/60">
          Manage IT services and ticket categories
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Services</h2>
            </div>
            <div className="divide-y divide-border">
              {services && services.length > 0 ? (
                services.map((service) => (
                  <div key={service.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-foreground/50">{service.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      service.is_active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {service.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-foreground/60">No services found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Categories</h2>
            </div>
            <div className="divide-y divide-border">
              {categories && categories.length > 0 ? (
                categories.map((category) => (
                  <div key={category.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{category.name}</p>
                      <p className="text-xs text-foreground/50">{category.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      category.is_active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-foreground/60">No categories found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ServiceManagement services={services} categories={categories} />
      </div>
    </div>
  );
}
