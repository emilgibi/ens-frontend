'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { RiskBadge } from '@/components/shared/risk-badge';
import { Vendor } from '@/types/ccm';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

function TrendIcon({ trend }: { trend: Vendor['trend'] }) {
  if (trend === 'up') return <ArrowUp className="h-4 w-4 text-red-500" />;
  if (trend === 'down') return <ArrowDown className="h-4 w-4 text-green-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function VendorTable({ vendors }: { vendors: Vendor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monitored Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Vendor</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Current Tier</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Last Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/continuous-monitoring/watchlist/${v.id}`} className="hover:underline">
                      {v.name}
                    </Link>
                  </TableCell>
                  <TableCell>{v.industry}</TableCell>
                  <TableCell>
                    <RiskBadge tier={v.currentTier} />
                  </TableCell>
                  <TableCell>
                    <TrendIcon trend={v.trend} />
                  </TableCell>
                  <TableCell>{new Date(v.lastEventDate).toLocaleDateString('en-GB')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
