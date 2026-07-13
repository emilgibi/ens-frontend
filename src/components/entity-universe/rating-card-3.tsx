'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Rating {
  label: string;
  value: number;
}

const getColorConfig = (label: string) => {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes('high')) {
    return {
      color: 'bg-red-500',
      lightColor: 'bg-red-100',
      textColor: 'text-red-700',
      ringColor: 'ring-red-200',
    };
  }

  if (normalizedLabel.includes('medium')) {
    return {
      color: 'bg-amber-500',
      lightColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      ringColor: 'ring-amber-200',
    };
  }

  if (normalizedLabel.includes('low')) {
    return {
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      ringColor: 'ring-emerald-200',
    };
  }

  // Default fallback
  return {
    color: 'bg-gray-500',
    lightColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    ringColor: 'ring-gray-200',
  };
};

export default function RatingCard({
  ratings,
}: {
  readonly ratings: readonly Rating[];
}) {
  const total = ratings.reduce((sum, rating) => sum + rating.value, 0);

  const ratingsWithPercentage = ratings.map((rating) => ({
    ...rating,
    ...getColorConfig(rating.label),
    percentage: total > 0 ? ((rating.value / total) * 100) : 0,
  }));

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
            {ratingsWithPercentage.map((rating) => (
              <div key={rating.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${rating.color}`} />
                    <span className="text-xs font-medium">{rating.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">
                      {rating.value.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({rating.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div
                  className={`w-full ${rating.lightColor} rounded-full h-1.5 ring-1 ${rating.ringColor}`}
                >
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
