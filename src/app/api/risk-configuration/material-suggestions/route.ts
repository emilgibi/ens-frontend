import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/risk-configuration/material-suggestions
 * Given an entity identifier, fetches company data and derives material suggestions
 * from the company's NIC description, industry classification, and description.
 *
 * If `risks` are also supplied, suggestions are additionally cross-checked against
 * a risk→material sensitivity map so that materials which are especially exposed
 * to the tagged risk type(s) are flagged (`exposed: true`) and sorted to the top —
 * e.g. a Flood/Cyclone risk on a steel company surfaces MS/HR Coil/TMT Bars as
 * high-exposure, since those are heavy, logistics-dependent raw materials, while
 * a Cyber Risk surfaces PCBs/semiconductors/electronic components instead.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, identifier_type, entity_type, name, risks } = body;

    if (!identifier && !name) {
      return NextResponse.json({ suggestions: [], exposed: [] });
    }

    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get('probe42_access_token')?.value ??
      req.headers.get('authorization')?.replace('Bearer ', '');

    const orchestrationBase =
      process.env.SERVER_APPLICATION_ORCHESTRATION ||
      process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;

    let companyData: any = null;
    if (identifier && orchestrationBase) {
      try {
        const r = await fetch(`${orchestrationBase}/get-complete-company-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            identifier,
            identifier_type: identifier_type ?? 'cin',
            entity_type: entity_type ?? 'company',
          }),
        });
        if (r.ok) {
          const j = await r.json();
          companyData = j?.data?.data?.[0] ?? j?.data ?? null;
        }
      } catch {
        // non-fatal
      }
    }

    const baseSuggestions = deriveMaterialSuggestions(companyData, name ?? '');
    const riskList: string[] = Array.isArray(risks) ? risks.filter(Boolean) : [];
    const { ordered, exposed } = applyRiskExposure(baseSuggestions, riskList);

    return NextResponse.json({ suggestions: ordered, exposed });
  } catch (err: any) {
    return NextResponse.json({ suggestions: [], exposed: [], error: err?.message }, { status: 500 });
  }
}

const INDUSTRY_MATERIAL_MAP: Record<string, string[]> = {
  steel: ['Mild Steel (MS)', 'High Tensile Steel', 'Stainless Steel', 'Alloy Steel', 'HR Coil', 'CR Coil', 'TMT Bars'],
  iron: ['Pig Iron', 'Cast Iron', 'Sponge Iron', 'Iron Ore', 'Scrap Metal'],
  aluminium: ['Aluminium Ingots', 'Aluminium Sheets', 'Aluminium Extrusions', 'Aluminium Alloy'],
  copper: ['Copper Rods', 'Copper Sheets', 'Copper Wire', 'Copper Tubes'],
  plastic: ['PP (Polypropylene)', 'HDPE', 'LDPE', 'PVC', 'ABS Plastic', 'Nylon'],
  polymer: ['PP (Polypropylene)', 'HDPE', 'PET', 'Polycarbonate', 'Epoxy Resin'],
  chemical: ['Solvents', 'Acids', 'Alkalis', 'Specialty Chemicals', 'Pigments', 'Resins'],
  paint: ['Paints', 'Coatings', 'Primers', 'Varnish', 'Pigments', 'Thinners'],
  pharma: ['Active Pharmaceutical Ingredients (API)', 'Excipients', 'Solvents', 'Packaging Material'],
  textile: ['Cotton Yarn', 'Polyester Fabric', 'Dyes', 'Chemicals', 'Synthetic Fibre'],
  auto: ['Steel Sheets', 'Aluminium Die Castings', 'Rubber Components', 'Plastic Mouldings', 'Glass'],
  rubber: ['Natural Rubber', 'Synthetic Rubber', 'Carbon Black', 'Rubber Compounds'],
  cement: ['Clinker', 'Limestone', 'Gypsum', 'Fly Ash', 'Slag'],
  paper: ['Wood Pulp', 'Recycled Paper', 'Chemicals', 'Packaging Board'],
  food: ['Raw Materials', 'Packaging Material', 'Food Additives', 'Preservatives'],
  it: ['Electronic Components', 'PCBs', 'Semiconductors', 'Cables'],
  electronics: ['PCBs', 'Semiconductors', 'Capacitors', 'Resistors', 'ICs', 'Connectors'],
  construction: ['Cement', 'Steel', 'Sand', 'Aggregates', 'Bricks', 'Tiles'],
  logistics: ['Packaging Material', 'Fuel', 'Lubricants'],
  energy: ['Coal', 'Natural Gas', 'Fuel Oil', 'Solar Panels', 'Transformers'],
};

function deriveMaterialSuggestions(companyData: any, entityName: string): string[] {
  const suggestions = new Set<string>();
  const d = companyData?.probe42_data ?? companyData ?? {};
  const co = d.company ?? d.llp ?? {};

  const textSources = [
    co.nic_description ?? '',
    co.classification ?? '',
    d.description?.desc_thousand_char ?? '',
    co.main_division_description ?? '',
    co.sub_class_description ?? '',
    entityName,
  ].join(' ').toLowerCase();

  for (const [keyword, materials] of Object.entries(INDUSTRY_MATERIAL_MAP)) {
    if (textSources.includes(keyword)) {
      materials.forEach(m => suggestions.add(m));
    }
  }

  if (suggestions.size === 0) {
    return ['Raw Materials', 'Packaging Material', 'Components', 'Consumables'];
  }

  return Array.from(suggestions).slice(0, 12);
}

// ── Risk → material sensitivity ─────────────────────────────────────────────
// Each entry: risk keyword pattern → material keywords considered "exposed"
// to that risk category. Matching is substring-based on lower-cased material
// names, so e.g. "flood" matches "Mild Steel (MS)" via "steel", and matches
// "TMT Bars" via "tmt".
const RISK_SENSITIVITY_PATTERNS: { pattern: RegExp; materialKeywords: string[] }[] = [
  {
    // Flood / cyclone / natural disaster — heavy, bulky, logistics-dependent
    // raw materials whose road/rail/port movement is disrupted first.
    pattern: /flood|cyclone|natural disaster/i,
    materialKeywords: ['steel', 'iron', 'tmt', 'coil', 'cement', 'clinker', 'limestone', 'gypsum',
      'slag', 'coal', 'ore', 'aggregate', 'fuel', 'packaging'],
  },
  {
    // Heat wave / drought / water scarcity — agri and water-intensive inputs.
    pattern: /heat wave|drought|water scarcity/i,
    materialKeywords: ['cotton', 'yarn', 'fabric', 'fibre', 'food', 'additive', 'preservative',
      'pulp', 'paper', 'rubber', 'dye', 'api', 'excipient'],
  },
  {
    // Earthquake / infrastructure risk — structural/heavy materials.
    pattern: /earthquake|infrastructure/i,
    materialKeywords: ['steel', 'cement', 'clinker', 'aggregate', 'glass', 'brick', 'tile'],
  },
  {
    // Cyber risk — electronics and component supply.
    pattern: /cyber/i,
    materialKeywords: ['electronic', 'pcb', 'semiconductor', 'ic', 'capacitor', 'resistor',
      'connector', 'cable', 'transformer'],
  },
  {
    // Political / sanctions — chemicals, APIs, and other import-sensitive inputs.
    pattern: /political|sanctions/i,
    materialKeywords: ['chemical', 'solvent', 'acid', 'alkali', 'specialty', 'pigment', 'resin',
      'api', 'excipient', 'semiconductor'],
  },
];

function riskExposureKeywords(risks: string[]): Set<string> {
  const keywords = new Set<string>();
  for (const risk of risks) {
    for (const { pattern, materialKeywords } of RISK_SENSITIVITY_PATTERNS) {
      if (pattern.test(risk)) {
        materialKeywords.forEach(k => keywords.add(k));
      }
    }
  }
  return keywords;
}

function applyRiskExposure(
  suggestions: string[],
  risks: string[],
): { ordered: string[]; exposed: string[] } {
  if (risks.length === 0) {
    return { ordered: suggestions, exposed: [] };
  }

  const keywords = riskExposureKeywords(risks);
  if (keywords.size === 0) {
    // Risks tagged (e.g. Labour Unrest, Financial Risk) have no material-specific
    // sensitivity pattern — leave suggestions as-is rather than over-flagging.
    return { ordered: suggestions, exposed: [] };
  }

  const exposed: string[] = [];
  const rest: string[] = [];
  for (const material of suggestions) {
    const lower = material.toLowerCase();
    if ([...keywords].some(k => lower.includes(k))) {
      exposed.push(material);
    } else {
      rest.push(material);
    }
  }

  return { ordered: [...exposed, ...rest], exposed };
}
