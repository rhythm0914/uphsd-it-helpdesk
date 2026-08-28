"use client";

import { useState, useEffect } from "react";
import { submitRequest } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ServiceCategoryOption } from "@/types/database";

export function RequestForm({
  services,
  hasLoadError,
  isEmpty,
}: {
  services: { id: string; name: string }[];
  hasLoadError: boolean;
  isEmpty: boolean;
}) {
  const [selectedService, setSelectedService] = useState("");
  const [loadedService, setLoadedService] = useState("");
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);

  // Derived loading state: a service is selected but its categories have not
  // finished loading yet. This avoids setting state synchronously inside the
  // effect (react-hooks/set-state-in-effect).
  const categoriesLoading = !!selectedService && selectedService !== loadedService;

  useEffect(() => {
    if (!selectedService) return;

    let cancelled = false;

    fetch(`/api/service-categories?service_id=${selectedService}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load categories");
        const data: { categories?: ServiceCategoryOption[] } = await res.json();
        if (!cancelled) {
          setCategories(data.categories || []);
          setCategoriesError(false);
          setLoadedService(selectedService);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoriesError(true);
          setCategories([]);
          setLoadedService(selectedService);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedService]);

  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelectedService(value);
    // Reset the dependent category state on the event path, not in the effect.
    if (!value) {
      setCategories([]);
      setCategoriesError(false);
      setLoadedService("");
    }
  }

  return (
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
              value={selectedService}
              onChange={handleServiceChange}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Select a service</option>
              {services.map((service) => (
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
              disabled={!selectedService || categoriesLoading}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedService
                  ? "Select a service first"
                  : categoriesLoading
                  ? "Loading categories..."
                  : categories.length === 0 && !categoriesError
                  ? "No categories available"
                  : "Select a category"}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categoriesError && (
              <p className="mt-1 text-xs text-red-600">Unable to load categories. Please try again.</p>
            )}
            {!categoriesError && selectedService && categories.length === 0 && !categoriesLoading && (
              <p className="mt-1 text-xs text-amber-600">No categories are available for this service yet.</p>
            )}
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

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-4">
        <a
          href="/portal"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface"
        >
          Cancel
        </a>
        <SubmitButton
          idleLabel="Submit Request"
          pendingLabel="Submitting…"
          className="w-full"
        />
      </div>
    </form>
  );
}
