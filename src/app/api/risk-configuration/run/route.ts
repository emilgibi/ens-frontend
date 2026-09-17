import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const newsBase =
      process.env.SERVER_NEWS_BACKEND ||
      process.env.SERVER_APPLICATION_ORCHESTRATION ||
      process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;

    if (!newsBase) {
      return NextResponse.json({ news: [], ai_summary: null, error: 'No backend configured' });
    }

    const entityName: string = body.entity?.name ?? body.entity?.label ?? '';
    const risks: string[]    = body.rows?.flatMap((r: any) => r.risks ?? []) ?? body.risks ?? [];
    const materials: string[] = body.rows?.flatMap((r: any) => r.materials ?? []) ?? body.materials ?? [];
    // Full per-vendor configuration (entity/risks/materials/finalMat/sob) — the
    // backend needs this, not just the flattened risks/materials above, so it
    // can build vendor-aware news queries and write a narrative that actually
    // names each vendor, its %SOB, and the finished goods (FG) it feeds.
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

    console.log('[risk-config/run] newsBase =', newsBase);
    console.log('[risk-config/run] entity =', entityName, '| risks =', risks, '| rows =', rows.length);

    // ── Call the risk_agent endpoint (RSS + scrape + Azure OpenAI) ────────────
    let agentResult: any = null;
    try {
      const r = await fetch(`${newsBase}/items/risk_agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: entityName, risks, materials, rows }),
      });
      const text = await r.text();
      console.log('[risk-config/run] risk_agent status =', r.status, '| body[:300] =', text.slice(0, 300));
      if (r.ok && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
        agentResult = JSON.parse(text);
      }
    } catch (e: any) {
      console.error('[risk-config/run] risk_agent fetch error:', e?.message);
    }

    const articles: any[] = agentResult?.articles ?? [];
    const synthesis: any  = agentResult?.synthesis ?? null;

    // ── AI summary ─────────────────────────────────────────────────────────────
    // The backend now returns a ready-to-render narrative in ai_summary (a
    // short story: risk → affected vendors → affected materials/%SOB →
    // affected FG), including a config-only fallback narrative on the rare
    // occasions no relevant news evidence was found. That is used as-is.
    // The block below only kicks in as a last-resort safety net for older
    // backend deployments that haven't picked up the narrative-returning
    // pipeline yet, or if the backend call failed outright.
    let aiSummary: string | null = agentResult?.ai_summary ?? null;

    const hasStructuredSynthesis = synthesis && !synthesis.error &&
      (synthesis.key_driver || synthesis.supply_chain_impact || synthesis.recommended_action ||
       synthesis.overall_risk_score != null || synthesis.risk_level);

    if (!aiSummary && hasStructuredSynthesis) {
      const lines: string[] = [];
      if (synthesis.overall_risk_score != null) {
        lines.push(`OVERALL RISK: ${synthesis.risk_level ?? ''} (${synthesis.overall_risk_score}/10) · Trend: ${synthesis.trend ?? '—'}`);
      }
      if (synthesis.key_driver)        lines.push(`\nKEY DRIVER\n• ${synthesis.key_driver}`);
      if (synthesis.supply_chain_impact) lines.push(`\nSUPPLY CHAIN IMPACT\n• ${synthesis.supply_chain_impact}`);
      if (synthesis.recommended_action) lines.push(`\nRECOMMENDED ACTION\n• ${synthesis.recommended_action}`);
      if (Array.isArray(synthesis.monitor_next) && synthesis.monitor_next.length) {
        lines.push(`\nMONITOR NEXT\n${synthesis.monitor_next.map((m: string) => `• ${m}`).join('\n')}`);
      }
      if (Array.isArray(synthesis.affected_materials) && synthesis.affected_materials.length) {
        lines.push(`\nAFFECTED MATERIALS\n• ${synthesis.affected_materials.join(', ')}`);
      }
      aiSummary = lines.join('\n');
    } else if (!aiSummary && articles.length === 0 && !agentResult) {
      // Backend call failed entirely (network error, non-JSON response, etc.)
      // — last-resort Azure fallback direct from this route, using whatever
      // row context we have so it's still vendor/material/FG-aware rather
      // than a generic prompt.
      const azureEndpoint  = process.env.AZURE_OPENAI_ENDPOINT;
      const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
      const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;
      const azureKey        = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;

      if (azureEndpoint && azureDeployment && azureApiVersion && azureKey) {
        try {
          const rowContext = rows.length > 0
            ? rows.map((r: any) =>
                `Entity: ${r.entity || '—'} | Risks: ${(r.risks ?? []).join(', ') || '—'} | Materials: ${(r.materials ?? []).join(', ') || '—'} | Final Material: ${r.finalMat || '—'} | %SOB: ${r.sob || '—'}`
              ).join('\n')
            : `Entity: ${entityName || '—'} | Risks: ${risks.join(', ') || '—'}`;

          const chatUrl = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
          const chatRes = await fetch(chatUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': azureKey },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: 'You are a supply chain risk analyst who writes short narrative briefs, not bulleted reports.' },
                { role: 'user', content: `Configuration:\n${rowContext}\n\nThe news backend is unavailable right now. Write a 3-5 sentence narrative — risk, which vendors it hits, which materials/%SOB are exposed, and which finished goods are downstream-affected — based only on this configuration. No bullet points, no headers.` },
              ],
              max_tokens: 400,
              temperature: 0.3,
            }),
          });
          if (chatRes.ok) {
            const chatJson = await chatRes.json();
            aiSummary = chatJson?.choices?.[0]?.message?.content ?? null;
          }
        } catch (e: any) {
          console.error('[risk-config/run] Azure fallback error:', e?.message);
        }
      }
    }

    return NextResponse.json({
      news: articles,
      ai_summary: aiSummary,
      ai_errors: agentResult?.ai_errors ?? [],
      queries: agentResult?.queries,
    });
  } catch (err: any) {
    console.error('[risk-config/run] outer catch:', err?.message);
    return NextResponse.json({ news: [], ai_summary: null, error: err?.message ?? 'Internal error' });
  }
}
