'use client';

import { PieChart, Pie, Cell } from 'recharts';

const LEVEL_COLORS: Record<string, string> = {
  Low:    '#16a34a',
  Medium: '#f59e0b',
  High:   '#dc2626',
};

interface GaugeCardProps {
  label: string;
  actual: number;
  gauge?: number;
  level: string;
  size?: 'sm' | 'lg';
}

export default function GaugeCard({ label, actual, gauge, level, size = 'lg' }: GaugeCardProps) {
  const color  = LEVEL_COLORS[level] ?? '#64748b';
  const filled = Math.min(gauge ?? actual ?? 0, 10);
  const data   = [{ v: filled }, { v: Math.max(0, 10 - filled) }];
  const isLg   = size === 'lg';

  const W  = isLg ? 220 : 160;
  const H  = isLg ? 120 : 88;
  const cy = isLg ? 112 : 82;
  const OR = isLg ? 95  : 70;
  const IR = isLg ? 70  : 54;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: W, height: H }}>
        <PieChart width={W} height={H}>
          <Pie
            data={data}
            cx={W / 2} cy={cy}
            startAngle={180} endAngle={0}
            innerRadius={IR} outerRadius={OR}
            dataKey='v'
            strokeWidth={0}
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill='var(--border)' />
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: isLg ? 8 : 4,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            display: 'block',
            fontWeight: 700,
            lineHeight: 1,
            color,
            fontSize: isLg ? 22 : 15,
          }}>
            {(actual ?? 0).toFixed(2)}
          </span>
          <span style={{
            display: 'inline-block',
            color: '#fff',
            background: color,
            padding: '2px 10px',
            borderRadius: 10,
            fontSize: 9,
            fontWeight: 700,
            marginTop: 4,
          }}>
            {level}
          </span>
        </div>
      </div>
      <p style={{
        fontSize: 10,
        color: 'var(--muted-foreground)',
        marginTop: 6,
        textAlign: 'center',
        maxWidth: 180,
      }}>
        {label}
      </p>
    </div>
  );
}
