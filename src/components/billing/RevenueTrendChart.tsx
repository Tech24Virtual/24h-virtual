import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export interface TrendPoint {
  month: string; // 'YYYY-MM'
  billed: number;
  paid: number;
}

const config = {
  billed: { label: 'Billed', color: 'hsl(var(--chart-1))' },
  paid: { label: 'Paid', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

/** Monthly bars for the last N months of billing-run overage (billing_summaries). */
export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  const rows = useMemo(
    () => data.map((d) => ({ ...d, label: format(parse(d.month, 'yyyy-MM', new Date()), 'MMM') })),
    [data],
  );
  const total = data.reduce((sum, d) => sum + d.billed, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Billing run revenue — last 6 months</CardTitle>
        <CardDescription>
          Overage billed vs. paid per month from billing runs. Base subscriptions are charged through Stripe/NMI and are not in this chart.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[220px] w-full">
          <BarChart data={rows} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(2)}`} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="billed" fill="var(--color-billed)" radius={4} />
            <Bar dataKey="paid" fill="var(--color-paid)" radius={4} />
          </BarChart>
        </ChartContainer>
        {total === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">No billing runs recorded in this period yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
