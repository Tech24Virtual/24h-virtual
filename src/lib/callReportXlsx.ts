import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

export interface XlsxCallRow {
  call_date: string | null;
  call_time: string | null;
  caller_phone: string | null;
  agent_name: string | null;
  campaign_name: string | null;
  billable_minutes: number | null;
  handle_time_seconds: number | null;
  disposition: string | null;
  status: string | null;
  call_direction: string | null;
  notes: string | null;
}

export interface XlsxSummary {
  total_calls: number;
  total_minutes: number;
  completed_calls: number;
  missed_calls: number;
  avg_handle_seconds: number;
  agents_used: number;
  campaigns_used: number;
}

export function downloadCallReportXlsx(
  calls: XlsxCallRow[],
  summary: XlsxSummary | null,
  clientName: string,
  period: string
): void {
  const wb = XLSX.utils.book_new();

  const periodLabel = (() => {
    try { return format(parseISO(`${period}-01`), 'MMMM yyyy'); } catch { return period; }
  })();

  // ── Summary sheet ──────────────────────────────────────────────────
  const summaryData: (string | number)[][] = [
    ['Field', 'Value'],
    ['Period', periodLabel],
    ['Client', clientName],
    ['Total Calls', summary?.total_calls ?? 0],
    ['Total Minutes', summary?.total_minutes != null ? Number(summary.total_minutes).toFixed(0) : 0],
    ['Completed Calls', summary?.completed_calls ?? 0],
    ['Missed Calls', summary?.missed_calls ?? 0],
    ['Avg Handle Time (sec)', summary?.avg_handle_seconds ? Math.round(summary.avg_handle_seconds) : 0],
    ['Agents Used', summary?.agents_used ?? 0],
    ['Campaigns Used', summary?.campaigns_used ?? 0],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  setAutoWidth(wsSummary, summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ── Call Log sheet ─────────────────────────────────────────────────
  const headers = [
    'Date', 'Time', 'Caller Phone', 'Agent', 'Campaign',
    'Duration (min)', 'Handle Time (sec)', 'Disposition', 'Status', 'Direction', 'Notes',
  ];
  const rows = calls.map(r => [
    r.call_date ?? '',
    r.call_time ?? '',
    r.caller_phone ?? '',
    r.agent_name ?? '',
    r.campaign_name ?? '',
    r.billable_minutes != null ? Number(r.billable_minutes).toFixed(2) : '',
    r.handle_time_seconds ?? '',
    r.disposition ?? '',
    r.status ?? '',
    r.call_direction ?? '',
    r.notes ?? '',
  ]);
  const wsLogs = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  setAutoWidth(wsLogs, [headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Call Log');

  const safe = clientName.replace(/[^a-z0-9-_]/gi, '-');
  XLSX.writeFile(wb, `call-report-${safe}-${period}.xlsx`);
}

function setAutoWidth(ws: XLSX.WorkSheet, data: (string | number)[][]): void {
  const widths = data.reduce((acc: number[], row) => {
    row.forEach((cell, i) => {
      acc[i] = Math.max(acc[i] ?? 10, String(cell ?? '').length + 2);
    });
    return acc;
  }, []);
  ws['!cols'] = widths.map(w => ({ wch: Math.min(w, 45) }));
}
