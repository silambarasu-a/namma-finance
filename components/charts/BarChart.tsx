"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps {
  data: any[];
  xKey: string;
  bars: Array<{
    key: string;
    color: string;
    name: string;
  }>;
  height?: number;
}

export function BarChart({ data, xKey, bars, height = 300 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={{ stroke: "#e5e7eb" }}
          tickFormatter={(value) =>
            `₹${(value / 1000).toFixed(0)}k`
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px",
          }}
          formatter={(value: any) =>
            `₹${parseFloat(value).toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`
          }
        />
        <Legend
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="circle"
        />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            name={bar.name}
            radius={[8, 8, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
