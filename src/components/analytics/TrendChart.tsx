import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendChartProps {
  title: string;
  data: { created_at: string }[];
  dateField?: string;
  days?: number;
  color?: string;
  showTrendIndicator?: boolean;
}

export function TrendChart({
  title,
  data,
  dateField = 'created_at',
  days = 7,
  color = 'hsl(var(--primary))',
  showTrendIndicator = true,
}: TrendChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Create array of last N days
    const dayBuckets: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const key = format(date, 'yyyy-MM-dd');
      dayBuckets[key] = 0;
    }
    
    // Count items per day
    data.forEach((item: any) => {
      const dateValue = item[dateField];
      if (!dateValue) return;
      const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
      const key = format(date, 'yyyy-MM-dd');
      if (dayBuckets[key] !== undefined) {
        dayBuckets[key]++;
      }
    });
    
    return Object.entries(dayBuckets).map(([date, count]) => ({
      date,
      label: format(parseISO(date), 'EEE'),
      count,
    }));
  }, [data, dateField, days]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return 0;
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.count, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.count, 0) / secondHalf.length;
    if (firstAvg === 0) return secondAvg > 0 ? 100 : 0;
    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  }, [chartData]);

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {showTrendIndicator && (
            <div className="flex items-center gap-1 text-xs">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
        <p className="text-2xl font-bold">{total}</p>
        <p className="text-xs text-muted-foreground">Last {days} days</p>
      </CardHeader>
      <CardContent>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                hide 
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value, 'Count']}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
