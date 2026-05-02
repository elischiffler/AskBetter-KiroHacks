import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CategoryDistribution } from "../analysis/types";

interface DistributionChartProps {
  distribution: CategoryDistribution[];
}

export function DistributionChart({ distribution }: DistributionChartProps) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-4">
        Prompt Type Breakdown
      </h2>
      {distribution.length === 0 ? (
        <p className="text-slate-400 text-sm">No data to display.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={distribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {distribution.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#f1f5f9",
              }}
              formatter={(value, name) => [
                `${value} prompt${value !== 1 ? "s" : ""}`,
                name as string,
              ]}
            />
            <Legend
              formatter={(value) => (
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
