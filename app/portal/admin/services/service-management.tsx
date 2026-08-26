"use client";

import { useState } from "react";
import {
  createService,
  createCategory,
  toggleServiceStatus,
  toggleCategoryStatus,
  addServiceCategory,
  removeServiceCategory,
  getServiceCategories,
  getUnmappedCategories,
} from "./actions";

export function ServiceManagement({ services, categories }: { services: any[]; categories: any[] }) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [mappedCategories, setMappedCategories] = useState<any[]>([]);
  const [unmappedCategories, setUnmappedCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadServiceCategories(serviceId: string) {
    if (!serviceId) {
      setMappedCategories([]);
      setUnmappedCategories([]);
      return;
    }

    setLoading(true);
    const [mappedResult, unmappedResult] = await Promise.all([
      getServiceCategories(serviceId),
      getUnmappedCategories(serviceId),
    ]);
    setMappedCategories(mappedResult.categories);
    setUnmappedCategories(unmappedResult.categories);
    setLoading(false);
  }

  async function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);
    await loadServiceCategories(serviceId);
  }

  async function handleAddMapping(categoryId: string) {
    if (!selectedServiceId) return;
    setMessage(null);
    const result = await addServiceCategory(selectedServiceId, categoryId);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Category mapped successfully" });
      await loadServiceCategories(selectedServiceId);
    }
  }

  async function handleRemoveMapping(categoryId: string) {
    if (!selectedServiceId) return;
    setMessage(null);
    const result = await removeServiceCategory(selectedServiceId, categoryId);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Mapping removed successfully" });
      await loadServiceCategories(selectedServiceId);
    }
  }

  async function handleCreateService(formData: FormData) {
    setMessage(null);
    const result = await createService(formData);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Service created successfully" });
    }
  }

  async function handleCreateCategory(formData: FormData) {
    setMessage(null);
    const result = await createCategory(formData);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Category created successfully" });
    }
  }

  async function handleToggleService(id: string, currentStatus: boolean) {
    setMessage(null);
    const result = await toggleServiceStatus(id, currentStatus);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Service status updated" });
      if (selectedServiceId === id) {
        await loadServiceCategories(id);
      }
    }
  }

  async function handleToggleCategory(id: string, currentStatus: boolean) {
    setMessage(null);
    const result = await toggleCategoryStatus(id, currentStatus);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Category status updated" });
      if (selectedServiceId) {
        await loadServiceCategories(selectedServiceId);
      }
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-lg p-4 ${message.type === "error" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
          <p className={`text-sm ${message.type === "error" ? "text-red-700" : "text-green-700"}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Add New Service</h3>
        <form action={handleCreateService} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Service Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="e.g., Email Support"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Brief description of this service"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Add Service
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
        <form action={handleCreateCategory} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Category Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="e.g., Hardware Issues"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Brief description of this category"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Add Category
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Manage Service Categories</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="service_id" className="block text-sm font-medium mb-2">
              Select Service
            </label>
            <select
              id="service_id"
              value={selectedServiceId}
              onChange={handleServiceChange}
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

          {selectedServiceId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Mapped Categories</h4>
                <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
                  {loading ? (
                    <p className="text-sm text-foreground/60 p-4">Loading...</p>
                  ) : mappedCategories.length > 0 ? (
                    mappedCategories.map((category: any) => (
                      <div key={category.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          <p className="text-xs text-foreground/50">{category.description}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveMapping(category.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-foreground/60 p-4">No categories mapped yet</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Available Categories</h4>
                <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
                  {loading ? (
                    <p className="text-sm text-foreground/60 p-4">Loading...</p>
                  ) : unmappedCategories.length > 0 ? (
                    unmappedCategories.map((category: any) => (
                      <div key={category.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          <p className="text-xs text-foreground/50">{category.description}</p>
                        </div>
                        <button
                          onClick={() => handleAddMapping(category.id)}
                          className="text-xs text-brand-primary hover:text-brand-primary-hover font-medium"
                        >
                          Add
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-foreground/60 p-4">All categories are mapped</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
