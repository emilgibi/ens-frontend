'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import GaugeCard    from '@/components/location360/GaugeCard';
import ReasoningBox from '@/components/location360/ReasoningBox';

const LEVEL_COLORS: Record<string, string> = {
  Low: '#16a34a', Medium: '#f59e0b', High: '#dc2626',
};
const TYPE_COLORS: Record<string, string> = {
  climate:   '#2563eb',
  political: '#7c3aed',
};
const COMP_COLORS = ['#2563eb', '#7c3aed'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 8, padding: '8px 12px',
      fontSize: 12, color: '#fff', minWidth: 120,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: '#e2e8f0' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  );
};

interface InfraPanelProps {
  data: any;
  error?: string | null;
}

export default function InfraPanel({ data, error }: InfraPanelProps) {
  if (error) return (
    <div style={{ padding: 24, color: '#dc2626', fontSize: 13 }}>⚠ {error}</div>
  );
  if (!data) return null;

  const {
    infrastructure_static_risk: risk,
    components,
    top_infrastructure_drivers,
    visualization,
    reasoning,
  } = data;

  const { overall_gauge, component_bar_chart, top_driver_bar_chart, impact_cards } = visualization;

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Formula</span>
            <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500, fontFamily: 'monospace' }}>0.6 × Climate + 0.4 × Political</span>
          </div>
          {components.climate_disruption && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Climate Component</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: LEVEL_COLORS[components.climate_disruption.level] }}>
                {components.climate_disruption.score.toFixed(4)} ({components.climate_disruption.level})
              </span>
            </div>
          )}
          {components.political_disruption && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Political Component</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: LEVEL_COLORS[components.political_disruption.level] }}>
                {components.political_disruption.score.toFixed(4)} ({components.political_disruption.level})
              </span>
            </div>
          )}
          {risk.availability !== 'full' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#f59e0b' }}>Partial ({risk.availability})</span>
            </div>
          )}
        </div>
      </div>

      {/* Component summary cards */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        Component Summary
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {impact_cards.map((c: any) => {
          const color = LEVEL_COLORS[c.level] ?? '#64748b';
          return (
            <div key={c.label} style={{
              background: 'var(--muted)', borderRadius: 10, padding: '14px 16px',
              borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color }}>
                {c.score != null ? c.score.toFixed(4) : '—'}
              </div>
              <div style={{ display: 'inline-block', color: '#fff', background: color, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, width: 'fit-content' }}>
                {c.level}
              </div>
              {c.note && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{c.note}</div>}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 12 }}>
        <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>Component Contributions</div>
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={component_bar_chart} margin={{ top: 8, right: 32, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
              <XAxis dataKey='label' tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey='value' name='Contribution' radius={[6, 6, 0, 0]}>
                {component_bar_chart.map((_: any, i: number) => (
                  <Cell key={i} fill={COMP_COLORS[i % COMP_COLORS.length]} />
                ))}
                <LabelList dataKey='value' position='top' formatter={(v: any) => v.toFixed(2)} style={{ fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>Top Infrastructure Risk Drivers</div>
          <ResponsiveContainer width='100%' height={Math.max(200, top_driver_bar_chart.length * 30)}>
            <BarChart layout='vertical' data={top_driver_bar_chart} margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
              <XAxis type='number' tick={{ fontSize: 11 }} />
              <YAxis type='category' dataKey='label' tick={{ fontSize: 11 }} width={145} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey='value' name='Contribution' radius={[0, 4, 4, 0]}>
                {top_driver_bar_chart.map((d: any) => (
                  <Cell key={d.label} fill={TYPE_COLORS[d.type] ?? '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 20 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS.climate, display: 'inline-block' }} />
        <span>Climate hazard</span>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS.political, display: 'inline-block', marginLeft: 16 }} />
        <span>Political / security</span>
      </div>

      {/* Driver detail table */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        Driver Detail
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {[['Driver', 'left'], ['Type', 'left'], ['Score', 'right'], ['Contribution', 'right'], ['Level', 'left']].map(([h, align]) => (
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
            {top_infrastructure_drivers.map((d: any, i: number) => {
              const color = LEVEL_COLORS[d.level] ?? '#64748b';
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--foreground)' }}>{d.driver}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      fontSize: 11, fontWeight: 600, color: '#fff',
                      background: TYPE_COLORS[d.type] ?? '#e2e8f0',
                    }}>
                      {d.type}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--foreground)' }}>{d.score.toFixed(4)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--foreground)' }}>{d.contribution.toFixed(4)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color, fontWeight: 600 }}>{d.level}</span>
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
