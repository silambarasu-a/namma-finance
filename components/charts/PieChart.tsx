"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  height?: number;
}

export function PieChart({ data, height = 300 }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) =>
            `₹${parseFloat(value).toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`
          }
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
