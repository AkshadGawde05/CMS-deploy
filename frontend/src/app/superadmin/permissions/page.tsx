"use client";
import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { type UserPermissions } from "@/components/auth/AuthProvider";
import { Shield, Save, X } from "lucide-react";

interface RolePermissions {
  _id: string;
  role: string;
  permissions: UserPermissions;
  updated_at: string;
}

type PermissionGroups = {
  [key: string]: (keyof UserPermissions)[];
};

const ROLE_COLORS = {
  Admin: "bg-purple-100 text-purple-800 border-purple-300",
  Teacher: "bg-blue-100 text-blue-800 border-blue-300",
  Student: "bg-green-100 text-green-800 border-green-300",
  Parent: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

export default function PermissionsPage() {
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroups>({});
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<UserPermissions | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const groupsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/roles/permission-groups`,
          { credentials: "include" }
        );
        const groupsData = await groupsRes.json();
        setPermissionGroups(groupsData.permissionGroups || {});

        const rolesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/roles/permissions`,
          { credentials: "include" }
        );
        const rolesData = await rolesRes.json();
        setRolePermissions(rolesData.roles || []);
      } catch (err) {
        showToast("Failed to load permissions", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAllowedPermissionKeys = (): (keyof UserPermissions)[] => {
    return Object.values(permissionGroups).flat();
  };


  const handleEditClick = (role: RolePermissions) => {
    setEditingRole(role.role);
    setEditPermissions({ ...role.permissions });
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setEditPermissions(null);
  };

  const handlePermissionToggle = (permission: keyof UserPermissions) => {
    if (!editPermissions) return;
    setEditPermissions({
      ...editPermissions,
      [permission]: !editPermissions[permission],
    });
  };

  const handleSavePermissions = async () => {
    if (!editingRole || !editPermissions) return;

    setSaving(true);
    try {
      const allowedKeys = getAllowedPermissionKeys();

      // 🔥 FILTER OUT INVALID PERMISSIONS
      const filteredPermissions = Object.fromEntries(
        Object.entries(editPermissions).filter(([key]) =>
          allowedKeys.includes(key as keyof UserPermissions)
        )
      );

      if (Object.keys(filteredPermissions).length === 0) {
        showToast("No valid permissions to update", "error");
        setSaving(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/roles/${editingRole}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ permissions: filteredPermissions }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Update failed");

      // Update local state
      setRolePermissions(prev =>
        prev.map(r =>
          r.role === editingRole
            ? {
                ...r,
                permissions: data.rolePermissions.permissions,
                updated_at: data.rolePermissions.updated_at,
              }
            : r
        )
      );

      setEditingRole(null);
      setEditPermissions(null);
      showToast("Permissions updated successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["SuperAdmin"]}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Navbar />
        
        <main className="lg:ml-64 pt-16 px-3 sm:px-4 lg:px-6 pb-6">
  <div className="max-w-7xl mx-auto">

    {/* Header */}
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-2">
        <Shield className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-indigo-600 flex-shrink-0" />
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          Role-Based Permissions
        </h1>
      </div>
      <p className="text-gray-600 text-xs sm:text-sm">
        Configure permissions for each role. All users with the same role will inherit these permissions.
      </p>
    </div>

    {/* Toast */}
    {toast && (
      <div
        className={`fixed top-20 right-4 z-50 px-4 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg text-sm sm:text-base text-white
        ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
      >
        {toast.message || toast}
      </div>
    )}

    {/* Loading */}
    {loading ? (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    ) : rolePermissions.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg shadow">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg mb-2">No role permissions found</p>
        <p className="text-gray-400 text-sm">
          Role permissions will be created automatically on first access
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {rolePermissions.map(role => {
          const enabledCount = Object.values(role.permissions).filter(Boolean).length;
          const totalCount = Object.keys(role.permissions).length;

          return (
            <div
              key={role.role}
              className={`bg-white rounded-xl shadow-md hover:shadow-lg transition border-2
                ${editingRole === role.role ? "border-indigo-500" : "border-transparent"}`}
            >

              {/* Card Header */}
              <div
                className={`p-4 lg:p-5 border-b-2 border-gray-100
                  ${editingRole === role.role ? "bg-indigo-50" : ""}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span
                      className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg font-semibold text-base lg:text-lg border-2
                        ${ROLE_COLORS[role.role as keyof typeof ROLE_COLORS]} w-fit`}
                    >
                      {role.role}
                    </span>
                    <span className="text-xs lg:text-sm text-gray-500">
                      {enabledCount} / {totalCount} enabled
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {editingRole === role.role ? (
                      <>
                        <button
                          onClick={handleSavePermissions}
                          disabled={saving}
                          className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm"
                        >
                          <Save size={16} />
                          {saving ? "Saving..." : "Save"}
                        </button>

                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition text-sm"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditClick(role)}
                        className="px-3 py-2 lg:px-4 lg:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                      >
                        Edit Permissions
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="p-3 sm:p-4 space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                {Object.entries(permissionGroups).map(([group, perms]) => (
                  <div key={group}>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                      {group}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-4">
                      {perms.map(p => {
                        const isEditing = editingRole === role.role;
                        const isChecked = isEditing
                          ? editPermissions?.[p as keyof UserPermissions] || false
                          : role.permissions[p as keyof UserPermissions] || false;

                        return (
                          <label
                            key={p}
                            className={`flex items-center gap-2 p-2 rounded-lg border-2 transition min-w-0
                              ${isEditing ? "cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 border-transparent" : "border-transparent"}
                              ${isChecked ? "bg-gray-50" : ""}`}
                          >
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={isChecked}
                              onChange={() =>
                                isEditing && handlePermissionToggle(p as keyof UserPermissions)
                              }
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span
                              className={`text-xs lg:text-sm truncate
                                ${isChecked ? "text-gray-900 font-medium" : "text-gray-600"}`}
                            >
                              {p.replace(/^can/, "").replace(/([A-Z])/g, " $1").trim()}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-3 sm:px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-xl">
                <p className="text-xs text-gray-500 truncate">
                  Last updated: {new Date(role.updated_at).toLocaleString()}
                </p>
              </div>

            </div>
          );
        })}
      </div>
    )}
  </div>
</main>

      </div>
    </ProtectedRoute>
  );
}
