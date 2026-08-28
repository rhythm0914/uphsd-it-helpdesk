import { getUsers } from "./actions";
import Link from "next/link";
import { formatDate } from "@/utils/format-date";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { users, error } = await getUsers();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
          <p className="mt-1 text-foreground/60">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Email</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Role</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Department</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users && users.length > 0 ? (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{user.full_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground/70">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border bg-surface">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground/70">{user.department || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        user.is_active !== false
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        {user.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground/60">
                        {formatDate(user.created_at)}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <p className="text-sm text-foreground/60">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
