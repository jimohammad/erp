import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlyStats {
  month: number;
  totalKwd: number;
  totalFx: number;
}

interface MonthlyChartProps {
  data: MonthlyStats[];
  isLoading: boolean;
  title?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyChart({ data, isLoading, title = "Monthly Purchases" }: MonthlyChartProps) {
  const chartData = useMemo(() => {
    const monthMap = new Map<number, { totalKwd: number; totalFx: number }>();
    
    (data || []).forEach(item => {
      monthMap.set(item.month, {
        totalKwd: item.totalKwd,
        totalFx: item.totalFx,
      });
    });

    return MONTH_NAMES.map((name, index) => {
      const monthNum = index + 1;
      const stats = monthMap.get(monthNum);
      return {
        name,
        month: monthNum,
        "KWD": stats?.totalKwd || 0,
        "FX": stats?.totalFx || 0,
      };
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-2">{title} (KWD & FX)</p>
        <div className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-2">
        {title} (KWD & FX) — grouped by month
      </p>
      <div className="h-[200px]" data-testid="chart-monthly">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                name === "KWD" ? value.toFixed(3) : value.toFixed(2),
                name
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="KWD" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="FX" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
