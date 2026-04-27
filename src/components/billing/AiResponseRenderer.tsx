import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, XCircle, ArrowRight, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Structured response types                                           */
/* ------------------------------------------------------------------ */

export interface KpiMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  status?: 'healthy' | 'warning' | 'critical';
}

export interface StatusRow {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical' | 'neutral';
  detail?: string;
}

export interface BarItem {
  label: string;
  value: number;
  max: number;
  color?: 'primary' | 'healthy' | 'warning' | 'critical';
}

export interface TableData {
  headers: string[];
  rows: (string | { text: string; badge?: 'healthy' | 'warning' | 'critical' })[][];
}

export interface StructuredBlock {
  type: 'title' | 'kpi-grid' | 'status-list' | 'bar-chart' | 'table' | 'text' | 'insight' | 'action-hint' | 'divider';
  data?: any;
}

export interface StructuredResponse {
  blocks: StructuredBlock[];
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

const statusColors = {
  healthy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
  neutral: 'text-muted-foreground bg-secondary/50 border-border',
};

const statusIcons = {
  healthy: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  neutral: Clock,
};

const barColors = {
  primary: 'bg-primary',
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

const KpiCard = ({ metric }: { metric: KpiMetric }) => {
  const borderColor = metric.status === 'critical' ? 'border-red-200' : metric.status === 'warning' ? 'border-amber-200' : 'border-border';
  return (
    <div className={cn("rounded-xl border bg-card p-3 space-y-1", borderColor)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</div>
      <div className="text-xl font-bold font-display text-foreground">{metric.value}</div>
      {metric.trendValue && (
        <div className={cn("flex items-center gap-1 text-[11px] font-medium",
          metric.trend === 'up' ? 'text-emerald-600' : metric.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {metric.trend === 'up' && <TrendingUp className="h-3 w-3" />}
          {metric.trend === 'down' && <TrendingDown className="h-3 w-3" />}
          {metric.trendValue}
        </div>
      )}
    </div>
  );
};

const StatusListItem = ({ row }: { row: StatusRow }) => {
  const Icon = statusIcons[row.status];
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg border", statusColors[row.status])}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold">{row.label}</div>
        {row.detail && <div className="text-[11px] opacity-75">{row.detail}</div>}
      </div>
      <span className="text-[12px] font-bold shrink-0">{row.value}</span>
    </div>
  );
};

const BarChartMini = ({ items }: { items: BarItem[] }) => (
  <div className="space-y-2">
    {items.map((item, i) => (
      <div key={i} className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="font-medium text-foreground">{item.label}</span>
          <span className="font-bold text-foreground">{item.value}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColors[item.color ?? 'primary'])}
            style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

const badgeColors = {
  healthy: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const RichTable = ({ data }: { data: TableData }) => (
  <div className="rounded-lg border border-border overflow-hidden">
    <table className="w-full text-[11px]">
      <thead>
        <tr className="bg-secondary/60">
          {data.headers.map((h, i) => (
            <th key={i} className="text-left font-semibold py-2 px-2.5 text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, ri) => (
          <tr key={ri} className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
            {row.map((cell, ci) => (
              <td key={ci} className="py-2 px-2.5">
                {typeof cell === 'string' ? (
                  <span className="text-foreground">{cell}</span>
                ) : (
                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold", badgeColors[cell.badge ?? 'healthy'])}>
                    {cell.text}
                  </span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const InsightCard = ({ text, type = 'info' }: { text: string; type?: 'info' | 'warning' | 'success' }) => {
  const styles = {
    info: 'bg-primary/5 border-primary/20 text-primary',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  const icons = { info: BarChart3, warning: AlertTriangle, success: CheckCircle2 };
  const Icon = icons[type];
  return (
    <div className={cn("flex items-start gap-2 px-3 py-2.5 rounded-lg border", styles[type])}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="text-[12px] font-medium leading-relaxed">{text}</span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main renderer                                                       */
/* ------------------------------------------------------------------ */

export const AiResponseRenderer = ({ response }: { response: StructuredResponse }) => {
  return (
    <div className="space-y-3">
      {response.blocks.map((block, i) => {
        switch (block.type) {
          case 'title':
            return <h3 key={i} className="text-[13px] font-bold text-foreground">{block.data}</h3>;

          case 'kpi-grid':
            return (
              <div key={i} className="grid grid-cols-2 gap-2">
                {(block.data as KpiMetric[]).map((m, j) => <KpiCard key={j} metric={m} />)}
              </div>
            );

          case 'status-list':
            return (
              <div key={i} className="space-y-1.5">
                {(block.data as StatusRow[]).map((r, j) => <StatusListItem key={j} row={r} />)}
              </div>
            );

          case 'bar-chart':
            return <BarChartMini key={i} items={block.data as BarItem[]} />;

          case 'table':
            return <RichTable key={i} data={block.data as TableData} />;

          case 'text':
            return <p key={i} className="text-[12px] text-muted-foreground leading-relaxed">{block.data}</p>;

          case 'insight':
            return <InsightCard key={i} text={block.data.text} type={block.data.type} />;

          case 'action-hint':
            return (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-primary font-medium cursor-pointer hover:underline">
                <ArrowRight className="h-3 w-3" />
                {block.data}
              </div>
            );

          case 'divider':
            return <div key={i} className="h-px bg-border" />;

          default:
            return null;
        }
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Structured mock responses                                           */
/* ------------------------------------------------------------------ */

export const STRUCTURED_RESPONSES: Record<string, StructuredResponse> = {
  'Summarize this patient': {
    blocks: [
      { type: 'title', data: 'Patient Summary — James Wilson' },
      { type: 'kpi-grid', data: [
        { label: 'Claim Amount', value: '$487.20', status: 'healthy', trend: 'up', trendValue: 'Ready to submit' },
        { label: 'Auth Remaining', value: '62/80', status: 'healthy', trend: 'flat', trendValue: '78% utilized' },
        { label: 'Doc Score', value: '92%', status: 'healthy', trend: 'up', trendValue: 'Above threshold' },
        { label: 'Compliance', value: '14/14', status: 'healthy', trend: 'up', trendValue: 'All checks passed' },
      ] as KpiMetric[] },
      { type: 'insight', data: { text: 'No issues detected. Claim is clean and ready for submission.', type: 'success' } },
      { type: 'text', data: 'Program: DDA Waiver · Funding: DDA Community · Period: Mar 1–15, 2026' },
    ],
  },

  'Flag all risk factors': {
    blocks: [
      { type: 'title', data: '4 Risk Factors Identified' },
      { type: 'kpi-grid', data: [
        { label: 'High Risk', value: '2', status: 'critical' },
        { label: 'Medium Risk', value: '1', status: 'warning' },
        { label: 'Low Risk', value: '1', status: 'healthy' },
        { label: 'Total Portfolio', value: '20', status: 'healthy', trend: 'flat', trendValue: '80% clean' },
      ] as KpiMetric[] },
      { type: 'table', data: {
        headers: ['Individual', 'Risk', 'Rule Triggered'],
        rows: [
          ['David Kim', { text: 'HIGH', badge: 'critical' }, 'Auth expired'],
          ['Patricia Anderson', { text: 'HIGH', badge: 'critical' }, 'Missing progress note'],
          ['Robert Johnson', { text: 'MEDIUM', badge: 'warning' }, 'Auth balance < 20%'],
          ['Michael Brown', { text: 'LOW', badge: 'healthy' }, 'Daily cap warning'],
        ],
      } as TableData },
      { type: 'action-hint', data: 'Review these in the AI Queue tab' },
    ],
  },

  'Authorization status': {
    blocks: [
      { type: 'title', data: 'Authorization Status — 127 Individuals' },
      { type: 'status-list', data: [
        { label: 'Active & Valid', value: '122', status: 'healthy', detail: 'No action needed' },
        { label: 'Expiring in 14 days', value: '3', status: 'warning', detail: 'Renewal recommended' },
        { label: 'Expired or Missing', value: '2', status: 'critical', detail: 'Immediate attention required' },
      ] as StatusRow[] },
      { type: 'bar-chart', data: [
        { label: 'Active', value: 122, max: 127, color: 'healthy' },
        { label: 'Expiring', value: 3, max: 127, color: 'warning' },
        { label: 'Expired', value: 2, max: 127, color: 'critical' },
      ] as BarItem[] },
      { type: 'action-hint', data: 'View details in Auth Burn Rate tab' },
    ],
  },

  'Auth expiring / expired': {
    blocks: [
      { type: 'title', data: '3 Authorizations Expiring Soon' },
      { type: 'table', data: {
        headers: ['Individual', 'Service', 'Expires', 'Units Left'],
        rows: [
          ['David Kim', 'DDA Community', 'Apr 1', '18'],
          ['Robert Johnson', 'DDA Day Hab', 'Apr 14', '12'],
          ['Maria Garcia', 'Personal Supports', 'Apr 22', '31'],
        ],
      } as TableData },
      { type: 'insight', data: { text: 'Submitting renewals now can prevent $2,180 in revenue loss.', type: 'warning' } },
      { type: 'action-hint', data: 'Go to Auth Burn Rate tab to renew' },
    ],
  },

  'Claims & denial summary': {
    blocks: [
      { type: 'title', data: 'Denial Summary — March 2026' },
      { type: 'kpi-grid', data: [
        { label: 'Total Denials', value: '6', status: 'critical', trend: 'down', trendValue: '↓ 2 from last month' },
        { label: 'Revenue at Risk', value: '$2,520', status: 'critical' },
        { label: 'Recoverable', value: '$1,860', status: 'warning', trend: 'up', trendValue: '74% recoverable' },
        { label: 'Resubmitted', value: '2/6', status: 'warning' },
      ] as KpiMetric[] },
      { type: 'table', data: {
        headers: ['Denial Code', 'Description', 'Count', 'Impact'],
        rows: [
          ['CO4', 'Procedure modifier', '3', '$1,240'],
          ['CO16', 'Missing info', '2', '$860'],
          ['CO50', 'Non-covered svc', '1', '$420'],
        ],
      } as TableData },
      { type: 'bar-chart', data: [
        { label: 'CO4 — Procedure modifier', value: 1240, max: 2520, color: 'critical' },
        { label: 'CO16 — Missing info', value: 860, max: 2520, color: 'warning' },
        { label: 'CO50 — Non-covered svc', value: 420, max: 2520, color: 'primary' },
      ] as BarItem[] },
    ],
  },
};

export const DEFAULT_STRUCTURED_RESPONSE: StructuredResponse = {
  blocks: [
    { type: 'title', data: 'Billing Analysis — March 2026' },
    { type: 'kpi-grid', data: [
      { label: 'Total Claims', value: '20', status: 'healthy', trend: 'up', trendValue: '+3 from last period' },
      { label: 'Clean Claims', value: '18', status: 'healthy', trend: 'up', trendValue: '90% rate' },
      { label: 'Blocked', value: '2', status: 'warning' },
      { label: 'Compliance', value: '90%', status: 'healthy', trend: 'up', trendValue: '+2% improvement' },
    ] as KpiMetric[] },
    { type: 'divider' },
    { type: 'status-list', data: [
      { label: 'Clean & Ready', value: '18', status: 'healthy', detail: 'Ready for submission' },
      { label: 'Needs Review', value: '2', status: 'warning', detail: 'Missing documentation' },
    ] as StatusRow[] },
    { type: 'text', data: 'Would you like me to drill into a specific area?' },
  ],
};
