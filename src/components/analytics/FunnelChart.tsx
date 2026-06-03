import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Lead {
  id: string;
  status: string | null;
  pipeline_stage: string | null;
}

interface FunnelChartProps {
  title?: string;
  leads: Lead[];
}

const STAGE_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'negotiating', 'closed_won', 'closed_lost'];

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiating: 'Negotiating',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  new: 'hsl(var(--chart-1))',
  contacted: 'hsl(var(--chart-2))',
  qualified: 'hsl(var(--chart-3))',
  proposal: 'hsl(var(--chart-4))',
  negotiating: 'hsl(var(--chart-5))',
  closed_won: 'hsl(142 71% 45%)', // Green
  closed_lost: 'hsl(var(--destructive))',
};

export function FunnelChart({ title = 'Lead Pipeline', leads }: FunnelChartProps) {
  const stageData = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    
    // Initialize all stages with 0
    STAGE_ORDER.forEach(stage => {
      stageCounts[stage] = 0;
    });

    // Count leads per stage
    leads.forEach(lead => {
      const stage = lead.pipeline_stage || lead.status || 'new';
      if (stageCounts[stage] !== undefined) {
        stageCounts[stage]++;
      } else {
        // Map unknown statuses to 'new'
        stageCounts['new']++;
      }
    });

    return STAGE_ORDER.map(stage => ({
      stage,
      label: STAGE_LABELS[stage] || stage,
      count: stageCounts[stage],
      color: STAGE_COLORS[stage] || 'hsl(var(--muted-foreground))',
    }));
  }, [leads]);

  const conversionRate = useMemo(() => {
    const newLeads = stageData.find(s => s.stage === 'new')?.count || 0;
    const closedWon = stageData.find(s => s.stage === 'closed_won')?.count || 0;
    if (newLeads === 0) return 0;
    return Math.round((closedWon / leads.length) * 100);
  }, [stageData, leads.length]);

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
            <p className="font-semibold">{leads.length}</p>
            <p className="text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="font-semibold text-green-600">
              {stageData.find(s => s.stage === 'closed_won')?.count || 0}
            </p>
            <p className="text-muted-foreground">Won</p>
          </div>
          <div>
            <p className="font-semibold text-destructive">
              {stageData.find(s => s.stage === 'closed_lost')?.count || 0}
            </p>
            <p className="text-muted-foreground">Lost</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
