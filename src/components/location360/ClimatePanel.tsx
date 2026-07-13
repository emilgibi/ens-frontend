'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import GaugeCard    from '@/components/location360/GaugeCard';
import ReasoningBox from '@/components/location360/ReasoningBox';

const CHART_COLORS = [
  '#2563eb', '#7c3aed', '#dc2626', '#d97706',
  '#16a34a', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#9333ea', '#ca8a04',
];
const LEVEL_COLORS: Record<string, string> = {
  Low: '#16a34a', Medium: '#f59e0b', High: '#dc2626',
};
const SEV_COLORS: Record<string, string> = {
  High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a', 'Very low': '#6ee7b7',
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

interface ClimatePanelProps {
  data: any;
  error?: string | null;
}

export default function ClimatePanel({ data, error }: ClimatePanelProps) {
  if (error) return (
    <div style={{ padding: 24, color: '#dc2626', fontSize: 13 }}>⚠ {error}</div>
  );
  if (!data) return null;

  const { climate_static_risk: risk, visualization, reasoning } = data;
  const { overall_gauge, hazard_cards, hazard_bar_chart, hazard_radar_chart, severity_distribution_donut, hazard_table } = visualization;

  return (
    <div style={{ padding: 24 }}>
      {/* Gauge + meta */}
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
            { key: 'Method',             val: risk.method },
            { key: 'Source',             val: risk.source },
            { key: 'Available Hazards',  val: `${hazard_cards.length} / ${hazard_table.length}` },
          ].map(({ key, val }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{key}</span>
              <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hazard score chips */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        Hazard Scores
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10, marginBottom: 24 }}>
        {hazard_cards.map((h: any) => {
          const c = LEVEL_COLORS[h.level] ?? '#64748b';
          return (
            <div key={h.hazard} style={{
              background: 'var(--muted)', borderRadius: 8, padding: '10px 12px',
              textAlign: 'center', borderTop: `3px solid ${c}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>{h.hazard}</div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: c }}>{h.score}</div>
              <div style={{ fontSize: 11, color: 'var(--foreground)', marginTop: 2 }}>{h.severity}</div>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 2 }}>wt {h.weight}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>Hazard Score Comparison</div>
          <ResponsiveContainer width='100%' height={260}>
            <BarChart data={hazard_bar_chart} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
              <XAxis dataKey='label' tick={{ fontSize: 11 }} angle={-35} textAnchor='end' interval={0} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey='value' name='Score' radius={[4, 4, 0, 0]}>
                {hazard_bar_chart.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>Severity Distribution</div>
          <ResponsiveContainer width='100%' height={260}>
            <PieChart>
              <Pie
                data={severity_distribution_donut}
                dataKey='value' nameKey='label'
                cx='50%' cy='44%'
                outerRadius={80} innerRadius={45}
                label={({ label, percent }: any) => `${label} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {severity_distribution_donut.map((d: any) => (
                  <Cell key={d.label} fill={SEV_COLORS[d.label] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar */}
      {hazard_radar_chart?.length >= 3 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Multi-Hazard Exposure Profile
          </div>
          <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <ResponsiveContainer width='100%' height={300}>
              <RadarChart data={hazard_radar_chart} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                <PolarGrid stroke='var(--border)' />
                <PolarAngleAxis dataKey='axis' tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Radar dataKey='value' name='Score' stroke='#2563eb' fill='#2563eb' fillOpacity={0.25} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Full hazard table */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        Hazard Detail Table
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {[['Hazard', 'left'], ['Severity', 'left'], ['Score', 'right'], ['Weight', 'right'], ['Contribution', 'right']].map(([h, align]) => (
                <th key={h} style={{
                  textAlign: align as any,
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
            {hazard_table.map((h: any, i: number) => {
              const color = h.available ? (LEVEL_COLORS[h.level] ?? '#64748b') : '#94a3b8';
              const sevColor = h.available ? (SEV_COLORS[h.severity] ?? '#e2e8f0') : '#e2e8f0';
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: h.available ? 1 : 0.55 }}>
                  <td style={{ padding: '8px 12px', color: 'var(--foreground)' }}>{h.hazard}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      fontSize: 11, fontWeight: 600,
                      background: h.available ? sevColor : '#e2e8f0',
                      color: h.available ? '#fff' : '#94a3b8',
                    }}>
                      {h.severity ?? 'No Data'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color }}>{h.score ?? '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--foreground)' }}>{h.weight}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--foreground)' }}>
                    {h.available ? (h.score * h.weight).toFixed(1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ReasoningBox reasoning={reasoning} />
    </div>
  );
}
