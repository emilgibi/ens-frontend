'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RiskBadge } from '@/components/shared/risk-badge';
import { Vendor } from '@/types/ccm';
import { SurveyResult } from '@/types/survey';
import { getStoredResult } from '@/lib/survey-store';

export default function VendorSurveyTable({ vendors }: { vendors: Vendor[] }) {
  const [results, setResults] = useState<Record<string, SurveyResult | null>>({});

  useEffect(() => {
    const map: Record<string, SurveyResult | null> = {};
    for (const v of vendors) {
      map[v.id] = getStoredResult(v.id);
    }
    setResults(map);
  }, [vendors]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Risk Surveys</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => {
                const result = results[v.id];
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>
                      {result ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Started</Badge>
                      )}
                    </TableCell>
                    <TableCell>{result ? `${result.overallScore} / 100` : '—'}</TableCell>
                    <TableCell>{result ? <RiskBadge tier={result.overallTier} /> : '—'}</TableCell>
                    <TableCell>
                      <Link href={`/vendor-survey/${v.id}`}>
                        <Button size="sm" variant="outline">
                          {result ? 'View / Retake' : 'Start Survey'}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
