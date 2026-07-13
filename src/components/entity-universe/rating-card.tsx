import { db } from '@/db';
import { entityUniverse } from '@/drizzle/schema';
import { sql } from 'drizzle-orm';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RatingCard() {
  const ratingsCount = await db
    .select({
      highCount: sql`SUM(CASE WHEN ${entityUniverse.overallSupplierRating} = 'High' THEN 1 ELSE 0 END)`,
      mediumCount: sql`SUM(CASE WHEN ${entityUniverse.overallSupplierRating} = 'Medium' THEN 1 ELSE 0 END)`,
      lowCount: sql`SUM(CASE WHEN ${entityUniverse.overallSupplierRating} = 'Low' THEN 1 ELSE 0 END)`,
    })
    .from(entityUniverse);

  const { highCount, mediumCount, lowCount } = ratingsCount[0] ?? {};
  const high = Number(highCount ?? 0);
  const medium = Number(mediumCount ?? 0);
  const low = Number(lowCount ?? 0);

  const total = high + medium + low;

  const ratings = [
    {
      label: 'High Risk',
      value: high,
      percentage: total > 0 ? ((high / total) * 100) : 0,
      color: 'bg-red-500',
      lightColor: 'bg-red-100',
      textColor: 'text-red-700',
      ringColor: 'ring-red-200'
    },
    {
      label: 'Medium Risk',
      value: medium,
      percentage: total > 0 ? ((medium / total) * 100) : 0,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      ringColor: 'ring-amber-200'
    },
    {
      label: 'Low Risk',
      value: low,
      percentage: total > 0 ? ((low / total) * 100) : 0,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      ringColor: 'ring-emerald-200'
    },
  ];

  return (
    <div className="w-full">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-md font-medium">Risk Distribution</CardTitle>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Risk Breakdown with Progress Bars */}
          <div className="space-y-3">
            {ratings.map((rating) => (
              <div key={rating.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${rating.color}`} />
                    <span className="text-xs font-medium">{rating.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{rating.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">({rating.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className={`w-full ${rating.lightColor} rounded-full h-1.5 ring-1 ${rating.ringColor}`}>
                  <div
                    className={`h-full ${rating.color} rounded-full transition-all duration-1000 ease-out`}
                    style={{
                      width: `${rating.percentage}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}