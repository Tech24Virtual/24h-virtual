import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SALES_BOARD_STAGES, PIPELINE_STAGES, type PipelineStage } from '@/lib/revenue/pipeline';

interface Lead {
  id: string;
  status: string | null;
  pipeline_stage: string | null;
}

interface FunnelChartProps {
  title?: string;
  leads: Lead[];
}

// Tailwind bg-* classes (from the canonical stage model) don't work as SVG
// fill colors, so map each stage to an actual color value for the chart.
const STAGE_FILL: Record<PipelineStage, string> = {
  new: 'hsl(var(--chart-1))',
  contacted: 'hsl(var(--chart-2))',
  qualified: 'hsl(var(--chart-3))',
  proposal: 'hsl(var(--chart-4))',
  sales: 'hsl(var(--chart-5))',
  won: 'hsl(142 71% 45%)', // Green
  onboarding: 'hsl(var(--chart-1))',
  ready_for_billing: 'hsl(var(--chart-2))',
  active: 'hsl(var(--chart-3))',
  lost: 'hsl(var(--destructive))',
  churned: 'hsl(var(--muted-foreground))',
};

export function FunnelChart({ title = 'Lead Pipeline', leads }: FunnelChartProps) {
  const stageData = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    SALES_BOARD_STAGES.forEach(stage => { stageCounts[stage] = 0; });

    leads.forEach(lead => {
      const stage = lead.pipeline_stage || 'new';
      if (stageCounts[stage] !== undefined) {
        stageCounts[stage]++;
      }
      // Leads in a non-board stage (onboarding, active, churned, etc.) are
      // intentionally left out of this working-pipeline chart, matching what
      // the Sales Pipeline board itself shows.
    });

    return SALES_BOARD_STAGES.map(stage => {
      const meta = PIPELINE_STAGES.find(s => s.key === stage)!;
      return {
        stage,
        label: meta.label,
        count: stageCounts[stage],
        color: STAGE_FILL[stage],
      };
    });
  }, [leads]);

  const boardLeadCount = useMemo(
    () => stageData.reduce((sum, s) => sum + s.count, 0),
    [stageData],
  );

  const conversionRate = useMemo(() => {
    const won = stageData.find(s => s.stage === 'won')?.count || 0;
    if (boardLeadCount === 0) return 0;
    return Math.round((won / boardLeadCount) * 100);
  }, [stageData, boardLeadCount]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="text-right">
            <p className="text-lg font-bold text-green-600">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Win rate</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={70}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value, 'Leads']}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              >
                {stageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="font-semibold">{boardLeadCount}</p>
            <p className="text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="font-semibold text-green-600">
              {stageData.find(s => s.stage === 'won')?.count || 0}
            </p>
            <p className="text-muted-foreground">Won</p>
          </div>
          <div>
            <p className="font-semibold text-destructive">
              {stageData.find(s => s.stage === 'lost')?.count || 0}
            </p>
            <p className="text-muted-foreground">Lost</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
