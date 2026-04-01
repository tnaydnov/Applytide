import { useState, useEffect, useRef } from "react";
import { AdminGuard } from "../../components/guards/AdminGuard";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { BanUserModal } from "../../components/admin/BanUserModal";
import { adminApi, User } from "../../features/admin/api";
import { Search, Ban, UserCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { format } from "date-fns";

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    loadUsers(() => cancelled);
    return () => { cancelled = true; };
  }, [page, debouncedSearch, roleFilter]);

  const loadUsers = async (isCancelled?: () => boolean) => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers({ page, search: debouncedSearch, role: roleFilter });
      if (isCancelled?.()) return;
      setUsers(data.users);
      setTotalPages(data.pages);
    } catch (error) {
      if (isCancelled?.()) return;
      toast.error(t("Failed to load users", "שגיאה בטעינת משתמשים"));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const handleBan = (user: User) => {
    setSelectedUser(user);
    setShowBanModal(true);
  };

  const handleUnban = async (userId: string) => {
    try {
      await adminApi.unbanUser(userId);
      toast.success(t("User unbanned", "החסימה הוסרה"));
      loadUsers();
    } catch (error) {
      toast.error(t("Failed to unban user", "שגיאה בהסרת חסימה"));
    }
  };

  return (
    <AdminGuard>
      <PageTransition>
        <AdminLayout>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl mb-2" style={{ color: "#b6bac5" }}>
              {t("User Management", "ניהול משתמשים")}
            </h1>
            <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
              {t("Manage user accounts and permissions", "ניהול חשבונות והרשאות")}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: "rgba(182, 186, 197, 0.5)" }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("Search users...", "חיפוש משתמשים...")}
                className="w-full pl-12 pr-4 py-3 rounded-lg border outline-none"
                style={{
                  backgroundColor: "rgba(90, 94, 106, 0.4)",
                  borderColor: "rgba(159, 95, 128, 0.3)",
                  color: "#b6bac5",
                }}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg border outline-none"
              style={{
                backgroundColor: "rgba(90, 94, 106, 0.4)",
                borderColor: "rgba(159, 95, 128, 0.3)",
                color: "#b6bac5",
              }}
            >
              <option value="">{t("All Roles", "כל התפקידים")}</option>
              <option value="user">{t("User", "משתמש")}</option>
              <option value="premium">{t("Premium", "פרימיום")}</option>
              <option value="admin">{t("Admin", "מנהל")}</option>
            </select>
          </div>

          {/* Users Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "rgba(90, 94, 106, 0.4)",
              border: "1px solid rgba(159, 95, 128, 0.2)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      backgroundColor: "rgba(56, 62, 78, 0.6)",
                      borderBottom: "1px solid rgba(159, 95, 128, 0.2)",
                    }}
                  >
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("User", "משתמש")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("Role", "תפקיד")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("Applications", "בקשות")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("Joined", "הצטרף")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("Status", "סטטוס")}
                    </th>
                    <th className="px-6 py-4 text-right text-sm" style={{ color: "#b6bac5" }}>
                      {t("Actions", "פעולות")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-6 py-4">
                          <div
                            className="h-12 rounded animate-pulse"
                            style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
                          />
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center"
                        style={{ color: "rgba(182, 186, 197, 0.7)" }}
                      >
                        {t("No users found", "לא נמצאו משתמשים")}
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: "1px solid rgba(159, 95, 128, 0.1)",
                        }}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div style={{ color: "#b6bac5" }}>{user.name}</div>
                            <div
                              className="text-sm"
                              style={{ color: "rgba(182, 186, 197, 0.6)" }}
                            >
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 rounded-full text-sm"
                            style={{
                              backgroundColor:
                                user.role === "admin"
                                  ? "rgba(239, 68, 68, 0.2)"
                                  : user.role === "premium"
                                  ? "rgba(159, 95, 128, 0.2)"
                                  : "rgba(90, 94, 106, 0.4)",
                              color:
                                user.role === "admin"
                                  ? "#ef4444"
                                  : user.role === "premium"
                                  ? "#9F5F80"
                                  : "#b6bac5",
                            }}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4" style={{ color: "#b6bac5" }}>
                          {user.total_applications}
                        </td>
                        <td className="px-6 py-4" style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4">
                          {user.is_banned ? (
                            <span
                              className="px-3 py-1 rounded-full text-sm"
                              style={{
                                backgroundColor: "rgba(239, 68, 68, 0.2)",
                                color: "#ef4444",
                              }}
                            >
                              {t("Banned", "חסום")}
                            </span>
                          ) : (
                            <span
                              className="px-3 py-1 rounded-full text-sm"
                              style={{
                                backgroundColor: "rgba(16, 185, 129, 0.2)",
                                color: "#10b981",
                              }}
                            >
                              {t("Active", "פעיל")}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.is_banned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnban(user.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              {t("Unban", "בטל חסימה")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBan(user)}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              {t("Ban", "חסום")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t("Previous", "הקודם")}
              </Button>
              <div className="px-4 py-2" style={{ color: "#b6bac5" }}>
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t("Next", "הבא")}
              </Button>
            </div>
          )}

          {/* Ban Modal */}
          {selectedUser && (
            <BanUserModal
              isOpen={showBanModal}
              onClose={() => {
                setShowBanModal(false);
                setSelectedUser(null);
              }}
              user={selectedUser}
              onSuccess={loadUsers}
            />
          )}
        </AdminLayout>
      </PageTransition>
    </AdminGuard>
  );
}
