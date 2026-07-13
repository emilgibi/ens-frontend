'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import GaugeCard    from '@/components/location360/GaugeCard';
import ReasoningBox from '@/components/location360/ReasoningBox';

const CHART_COLORS = [
  '#2563eb', '#7c3aed', '#dc2626', '#d97706',
  '#16a34a', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#9333ea',
];
const LEVEL_COLORS: Record<string, string> = {
  Low: '#16a34a', Medium: '#f59e0b', High: '#dc2626',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 8, padding: '8px 12px',
      fontSize: 12, color: '#fff', minWidth: 120,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: '#e2e8f0' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

interface PoliticalPanelProps {
  data: any;
  error?: string | null;
}

export default function PoliticalPanel({ data, error }: PoliticalPanelProps) {
  if (error) return (
    <div style={{ padding: 24, color: '#dc2626', fontSize: 13 }}>⚠ {error}</div>
  );
  if (!data) return null;

  const { political_static_risk: risk, score_breakdown, visualization, reasoning } = data;

  if (!visualization) return (
    <p style={{ padding: 24, color: 'var(--muted-foreground)', fontSize: 13 }}>
      No visualization data available for this location.
    </p>
  );

  const { overall_gauge, risk_cards, top_event_bar_chart, risk_composition_donut, event_table } = visualization;

  return (
    <div style={{ padding: 24 }}>
      {/* Gauge + meta row */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 28,
        paddingBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        <GaugeCard
          label={overall_gauge.label}
          actual={overall_gauge.actual_score}
          gauge={overall_gauge.gauge_score}
          level={overall_gauge.level}
          size='lg'
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
          {[
            { key: 'Method',       val: risk.method },
            { key: 'Total Events', val: score_breakdown.total_events?.toLocaleString() },
            { key: 'Raw Score',    val: score_breakdown.raw_score?.toLocaleString() },
          ].map(({ key, val }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{key}</span>
              <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-risk cards */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        Risk Breakdown
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {risk_cards.map((c: any) => {
          const color = LEVEL_COLORS[c.level] ?? '#64748b';
          return (
            <div key={c.label} style={{
              background: 'var(--muted)', borderRadius: 10, padding: '14px 16px',
              borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, color }}>{c.score?.toFixed(2)}</div>
              <div style={{ display: 'inline-block', color: '#fff', background: color, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, width: 'fit-content' }}>
                {c.level}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>Top Event Drivers</div>
          <ResponsiveContainer width='100%' height={Math.max(200, top_event_bar_chart.length * 32)}>
            <BarChart layout='vertical' data={top_event_bar_chart} margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
              <XAxis type='number' tick={{ fontSize: 11 }} />
              <YAxis type='category' dataKey='event_type' tick={{ fontSize: 11 }} width={175} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey='count' name='Events' radius={[0, 4, 4, 0]}>
                {top_event_bar_chart.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>Risk Composition</div>
          <ResponsiveContainer width='100%' height={240}>
            <PieChart>
              <Pie
                data={risk_composition_donut}
                dataKey='value'
                nameKey='label'
                cx='50%' cy='45%'
                outerRadius={80} innerRadius={45}
                label={({ label, percent }: any) => `${label.split('/')[0]} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {risk_composition_donut.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event table */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        Event Detail
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Event Type', 'Count', '% of Total'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '8px 12px',
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {event_table.map((row: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--foreground)' }}>{row.event_type}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--foreground)' }}>{row.count?.toLocaleString()}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--foreground)' }}>{row.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReasoningBox reasoning={reasoning} />
    </div>
  );
}