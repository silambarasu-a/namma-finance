"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LineChartDataPoint } from "@/types";

interface LineConfig {
  key: string;
  color: string;
  name: string;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  xKey: string;
  lines: LineConfig[];
  height?: number;
}

export function LineChart({ data, xKey, lines, height = 300 }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
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
          formatter={(value: number | string) =>
            `₹${parseFloat(value.toString()).toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`
          }
        />
        <Legend
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="circle"
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            strokeWidth={2}
            name={line.name}
            dot={{ fill: line.color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
