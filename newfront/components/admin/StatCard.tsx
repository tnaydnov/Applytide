import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "#9F5F80",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="p-6 rounded-xl backdrop-blur-xl"
      style={{
        backgroundColor: "rgba(90, 94, 106, 0.4)",
        border: "1px solid rgba(159, 95, 128, 0.2)",
        boxShadow: "0 10px 30px rgba(56, 62, 78, 0.2)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-lg"
          style={{
            backgroundColor: `${color}20`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {trend && (
          <div
            className="text-sm px-2 py-1 rounded"
            style={{
              color: trend.isPositive ? "#10b981" : "#ef4444",
              backgroundColor: trend.isPositive
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            }}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl mb-1" style={{ color: "#b6bac5" }}>
          {value}
        </div>
        <div className="text-sm" style={{ color: "rgba(182, 186, 197, 0.7)" }}>
          {title}
        </div>
      </div>
    </motion.div>
  );
}
