import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategoryDistribution } from '../analysis/types';

interface DistributionChartProps {
  distribution: CategoryDistribution[];
}

export function DistributionChart({ distribution }: DistributionChartProps) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: '#1a1030',
        border: '1px solid rgba(139, 92, 246, 0.25)',
      }}
    >
      <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#a78bfa' }}>
        Prompt Type Breakdown
      </h2>
      {distribution.length === 0 ? (
        <p className="text-sm" style={{ color: '#6b5fa0' }}>
          No data to display.
        </p>
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
                backgroundColor: '#1a1030',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '8px',
                color: '#f5f3ff',
              }}
              formatter={(value, name) => [
                `${value} prompt${value !== 1 ? 's' : ''}`,
                name as string,
              ]}
            />
            <Legend
              formatter={(value) => (
                <span style={{ color: '#a78bfa', fontSize: '13px' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
