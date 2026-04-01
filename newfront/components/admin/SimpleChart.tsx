import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "../../contexts/LanguageContext";

interface SimpleChartProps {
  data: Array<{ date: string; count: number }>;
  title: string;
  color?: string;
}

export function SimpleChart({
  data,
  title,
  color = "#9F5F80",
}: SimpleChartProps) {
  const { language } = useLanguage();

  // Format data for chart
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString(
      language === "he" ? "he-IL" : "en-US",
      { month: "short", day: "numeric" }
    ),
    value: d.count,
  }));

  return (
    <div
      className="p-6 rounded-xl backdrop-blur-xl"
      style={{
        backgroundColor: "rgba(90, 94, 106, 0.4)",
        border: "1px solid rgba(159, 95, 128, 0.2)",
        boxShadow: "0 10px 30px rgba(56, 62, 78, 0.2)",
      }}
    >
      <h3 className="mb-6" style={{ color: "#b6bac5" }}>
        {title}
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(182, 186, 197, 0.1)"
          />
          <XAxis
            dataKey="date"
            stroke="rgba(182, 186, 197, 0.5)"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="rgba(182, 186, 197, 0.5)"
            style={{ fontSize: "12px" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(90, 94, 106, 0.95)",
              border: "1px solid rgba(159, 95, 128, 0.3)",
              borderRadius: "8px",
              color: "#b6bac5",
            }}
            labelStyle={{ color: "#b6bac5" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
