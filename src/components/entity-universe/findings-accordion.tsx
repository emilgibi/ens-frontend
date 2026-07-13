import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RiskBadge, RiskLevel } from './risk-badge';

interface Finding {
  kpi_area: string;
  kpi_code: string;
  kpi_definition: string;
  kpi_rating: RiskLevel;
  kpi_flag: boolean;
  kpi_details: string;
}

function tryParseJson(value: string): object[] | null {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function JsonTable({ data }: { data: object[] }) {
  const preferredOrder = ['name', 'relation', 'relationship', 'type_of_transaction', 'period', 'rating_date', 'rating_agency', 'rating', 'amount', 'type_of_loan', 'factor', '2026', '2025', '2024', '2023', 'value', 'date_of_registration', 'state_of_registration', 'gst_in', 'filing_timeliness'];

  const allKeys = Object.keys(data[0]);
  const headers = [
    ...preferredOrder.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !preferredOrder.includes(k)),
  ];
  return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
          <tr className="bg-muted">
            {headers.map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium border border-border capitalize">
                  {h.replace(/_/g, ' ')}
                </th>
            ))}
          </tr>
          </thead>
          <tbody>
          {data.map((row, idx) => (
              <tr key={idx} className="even:bg-muted/30">
                {headers.map((h) => (
                    <td key={h} className="px-3 py-2 border border-border">
                      {String((row as Record<string, unknown>)[h] ?? '-')}
                    </td>
                ))}
              </tr>
          ))}
          </tbody>
        </table>
      </div>
  );
}

function KpiDetails({ details }: { details: string }) {
  const parsed = tryParseJson(details);
  if (parsed) {
    return <JsonTable data={parsed} />;
  }
  return (
      <>
        {details
            .split(/\n+/)
            .filter((line) => line.trim() !== '')
            .map((line, idx) => (
                <div className="py-2" key={idx}>{line}</div>
            ))}
      </>
  );
}
export default function FindingsMultiAccordion({
  findings,
}: {
  readonly findings: readonly Finding[];
}) {
  return (
    <div className="space-y-4">
      <Accordion
        type="multiple"
        className="w-full -space-y-px"
        defaultValue={findings.map((item) => item.kpi_code)}
      >
        {findings.map((item) => (
          <AccordionItem
            value={item.kpi_code}
            key={item.kpi_code}
            className="bg-background has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative border px-4 py-1 outline-none first:rounded-t-md last:rounded-b-md last:border-b has-focus-visible:z-10 has-focus-visible:ring-[3px]"
          >
            <AccordionTrigger className="py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0">
              <div className="flex items-center justify-between w-full">
                <div> {item.kpi_definition}</div>
                <RiskBadge
                  risk={item.kpi_rating.toLowerCase() as RiskLevel}
                  size="small"
                  keepFill={false}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-2">
              <KpiDetails details={item.kpi_details} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
