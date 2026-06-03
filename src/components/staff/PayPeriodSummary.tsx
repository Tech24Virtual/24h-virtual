import { differenceInMinutes } from 'date-fns';
import { Clock, CheckCircle, Coffee, Calculator } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Shift {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_break_minutes: number;
  manual_deduction_minutes?: number;
  status: string;
}

interface PayPeriodSummaryProps {
  shifts: Shift[];
  breaksPaid: boolean;
}

export function PayPeriodSummary({ shifts, breaksPaid }: PayPeriodSummaryProps) {
  const approvedShifts = shifts.filter(s => s.status === 'approved');
  const completedShifts = shifts.filter(s => s.status === 'completed');

  const calcMinutes = (shiftList: Shift[]) => {
    let totalMins = 0;
    let totalBreakMins = 0;
    let totalDeductMins = 0;
    for (const s of shiftList) {
      if (!s.clock_out) continue;
      const mins = differenceInMinutes(new Date(s.clock_out), new Date(s.clock_in));
      totalMins += mins;
      totalBreakMins += s.total_break_minutes || 0;
      totalDeductMins += s.manual_deduction_minutes || 0;
    }
    const netMins = breaksPaid ? Math.max(0, totalMins - totalDeductMins) : Math.max(0, totalMins - totalBreakMins - totalDeductMins);
    return { totalMins, totalBreakMins, totalDeductMins, netMins };
  };

  const approved = calcMinutes(approvedShifts);
  const all = calcMinutes([...approvedShifts, ...completedShifts]);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const stats = [
    { label: 'Approved Shifts', value: approvedShifts.length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Approval', value: completedShifts.length, icon: Clock, color: 'text-amber-600' },
    { label: 'Total Break Time', value: formatHours(approved.totalBreakMins), icon: Coffee, color: 'text-blue-600' },
    { label: 'Net Billable Hours', value: formatHours(approved.netMins), icon: Calculator, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
