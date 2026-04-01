import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { motion } from "motion/react";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div
            className="mb-4 text-6xl"
            style={{ color: "#9F5F80" }}
          >
            🚫
          </div>
          <h1
            className="text-2xl mb-2"
            style={{ color: "#b6bac5" }}
          >
            Access Denied
          </h1>
          <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
            You don't have permission to access this area.
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
