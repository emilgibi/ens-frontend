'use client';

interface ReasoningData {
  summary?: string;
  drivers?: string[];
  methodology_note?: string;
  availability?: string;
}

interface ReasoningBoxProps {
  reasoning?: string | ReasoningData;
}

export default function ReasoningBox({ reasoning }: ReasoningBoxProps) {
  if (!reasoning) return null;

  const ACCENT = '#FFE600';

  if (typeof reasoning === 'string') {
    return (
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 8,
        padding: '16px 18px',
        marginTop: 24,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
        }}>
          Assessment Summary
        </div>
        <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65 }}>{reasoning}</p>
      </div>
    );
  }

  const { summary, drivers = [], methodology_note, availability } = reasoning;

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${ACCENT}`,
      borderRadius: 8,
      padding: '16px 18px',
      marginTop: 24,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
      }}>
        Assessment Summary
      </div>
      {summary && (
        <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, marginBottom: 8 }}>
          {summary}
        </p>
      )}
      {drivers.length > 0 && (
        <ul style={{ margin: '8px 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
          {drivers.map((d, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--foreground)' }}>{d}</li>
          ))}
        </ul>
      )}
      {availability && availability !== 'full' && (
        <div style={{
          marginTop: 8, fontSize: 12, color: '#d97706',
          background: '#fffbeb', padding: '6px 10px', borderRadius: 6,
        }}>
          ⚠ Partial data: {availability === 'climate_only'
            ? 'Political data unavailable for this district.'
            : 'Climate data unavailable for this district.'}
        </div>
      )}
      {methodology_note && (
        <details style={{ marginTop: 12, fontSize: 12, color: 'var(--muted-foreground)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 4 }}>Methodology</summary>
          <p style={{ marginTop: 6, lineHeight: 1.6 }}>{methodology_note}</p>
        </details>
      )}
    </div>
  );
}
