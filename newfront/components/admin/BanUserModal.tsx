import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { useLanguage } from "../../contexts/LanguageContext";
import { adminApi } from "../../features/admin/api";
import { toast } from "sonner";

interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    name: string;
  };
  onSuccess: () => void;
}

export function BanUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: BanUserModalProps) {
  const { t, language } = useLanguage();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleBan = async () => {
    if (!reason.trim()) {
      toast.error(
        language === "he" ? "נא להזין סיבה לחסימה" : "Please enter a reason"
      );
      return;
    }

    try {
      setLoading(true);
      await adminApi.banUser(user.id, { reason, duration_hours: duration || undefined });
      toast.success(
        language === "he" ? "המשתמש נחסם בהצלחה" : "User banned successfully"
      );
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        language === "he" ? "שגיאה בחסימת משתמש" : "Failed to ban user"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl backdrop-blur-xl overflow-hidden"
              style={{
                backgroundColor: "rgba(56, 62, 78, 0.95)",
                border: "1px solid rgba(159, 95, 128, 0.3)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "rgba(159, 95, 128, 0.2)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                  >
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 style={{ color: "#b6bac5" }}>
                    {t("Ban User", "חסום משתמש")}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" style={{ color: "#b6bac5" }} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <p style={{ color: "rgba(182, 186, 197, 0.8)" }}>
                    {t(
                      `You are about to ban ${user.name} (${user.email})`,
                      `אתה עומד לחסום את ${user.name} (${user.email})`
                    )}
                  </p>
                </div>

                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "#b6bac5" }}
                  >
                    {t("Reason for ban", "סיבת החסימה")}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t(
                      "Enter reason for banning this user...",
                      "הזן סיבה לחסימת משתמש זה..."
                    )}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border outline-none"
                    style={{
                      backgroundColor: "rgba(90, 94, 106, 0.4)",
                      borderColor: "rgba(159, 95, 128, 0.3)",
                      color: "#b6bac5",
                    }}
                    dir={language === "he" ? "rtl" : "ltr"}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "#b6bac5" }}
                  >
                    {t("Duration (optional)", "משך זמן (אופציונלי)")}
                  </label>
                  <select
                    value={duration || ""}
                    onChange={(e) =>
                      setDuration(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full px-4 py-3 rounded-lg border outline-none"
                    style={{
                      backgroundColor: "rgba(90, 94, 106, 0.4)",
                      borderColor: "rgba(159, 95, 128, 0.3)",
                      color: "#b6bac5",
                    }}
                  >
                    <option value="">
                      {t("Permanent", "קבוע")}
                    </option>
                    <option value="1">
                      {t("1 day", "יום אחד")}
                    </option>
                    <option value="7">
                      {t("7 days", "7 ימים")}
                    </option>
                    <option value="30">
                      {t("30 days", "30 ימים")}
                    </option>
                    <option value="90">
                      {t("90 days", "90 ימים")}
                    </option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 border-t flex gap-3"
                style={{ borderColor: "rgba(159, 95, 128, 0.2)" }}
              >
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  {t("Cancel", "ביטול")}
                </Button>
                <Button
                  onClick={handleBan}
                  className="flex-1"
                  disabled={loading}
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white",
                  }}
                >
                  {loading
                    ? t("Banning...", "חוסם...")
                    : t("Ban User", "חסום משתמש")}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
