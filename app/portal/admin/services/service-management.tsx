"use client";

import { useState } from "react";
import { createService, createCategory, toggleServiceStatus, toggleCategoryStatus } from "./actions";

export function ServiceManagement() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    }
  }

  async function handleToggleCategory(id: string, currentStatus: boolean) {
    setMessage(null);
    const result = await toggleCategoryStatus(id, currentStatus);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Category status updated" });
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
    </div>
  );
}
