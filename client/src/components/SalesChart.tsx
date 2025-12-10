import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface SalesChartProps {
  data: Array<{ name: string; sales: number }>;
  formatCurrency: (value: number) => string;
}

export default function SalesChart({ data, formatCurrency }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          className="text-muted-foreground"
          width={40}
        />
        <Tooltip 
          formatter={(value: number) => [`${formatCurrency(value)} KWD`, "Sales"]}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
        <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
          <Cell fill="hsl(var(--muted-foreground))" />
          <Cell fill="hsl(var(--primary))" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
