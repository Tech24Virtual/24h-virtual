import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface Task {
  id: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ComplianceChartProps {
  title?: string;
  tasks: Task[];
}

const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high: 8,
  medium: 24,
  low: 72,
};

export function ComplianceChart({ title = 'SLA Compliance', tasks }: ComplianceChartProps) {
  const compliance = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completed_at);
    
    if (completedTasks.length === 0) {
      return { onTime: 0, late: 0, percentage: 100, total: 0 };
    }

    const withinSLA = completedTasks.filter(task => {
      if (!task.due_date || !task.completed_at) return true;
      const completed = new Date(task.completed_at);
      const due = new Date(task.due_date);
      return completed <= due;
    });

    return {
      onTime: withinSLA.length,
      late: completedTasks.length - withinSLA.length,
      percentage: Math.round((withinSLA.length / completedTasks.length) * 100),
      total: completedTasks.length,
    };
  }, [tasks]);

  const chartData = [
    { name: 'On Time', value: compliance.onTime, color: 'hsl(var(--chart-2))' },
    { name: 'Late', value: compliance.late, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {compliance.percentage >= 75 ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {compliance.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <p className="text-sm">No completed tasks yet</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-3xl font-bold ${getComplianceColor(compliance.percentage)}`}>
                  {compliance.percentage}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {compliance.onTime} of {compliance.total} on time
                </p>
              </div>
              <div className="h-[80px] w-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={35}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />
                <span className="text-muted-foreground">On Time: {compliance.onTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Late: {compliance.late}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
