import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * The shared brand chart — one Recharts wrapper so every graph across the
 * dashboard reads as one family (same green, area fill, grid, tooltip). Takes a
 * simple {label, value} series; the caller decides the period + formatting.
 */
const BRAND = "#1D9E75"; // SelfeConnect green, concrete for SVG
const GRID = "#e8edf1";
const AXIS = "#94a3b8";

export type ChartPoint = { label: string; value: number };

export function EarningsChart({
  data,
  height = 256,
  valueFormat = (v) => `£${v}`,
  tooltipLabel = "Earnings",
  yWidth = -16,
}: {
  data: ChartPoint[];
  height?: number;
  valueFormat?: (v: number) => string;
  tooltipLabel?: string;
  /** Negative pulls the y-axis in (money) — 0 for small integers (ratings). */
  yWidth?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: yWidth, bottom: 0 }}>
          <defs>
            <linearGradient id="scEarnFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.4} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 6" stroke={GRID} />
          <XAxis
            dataKey="label"
            stroke={AXIS}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            stroke={AXIS}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => valueFormat(v as number)}
          />
          <Tooltip
            cursor={{ stroke: BRAND, strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={{
              borderRadius: 14,
              border: "1px solid #e8edf1",
              background: "#ffffff",
              boxShadow: "0 8px 24px -8px rgb(15 23 42 / 0.14)",
              fontSize: 12,
            }}
            formatter={(v: number) => [valueFormat(v), tooltipLabel]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={BRAND}
            strokeWidth={2.5}
            fill="url(#scEarnFill)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
