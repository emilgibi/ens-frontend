'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { surveyQuestions } from '@/data/survey-dummy/questions';
import { SurveyCategory, SurveyResponse } from '@/types/survey';
import { surveyProgress, isSurveyComplete } from '@/lib/survey-scoring';

export default function SurveyForm({
  response,
  onAnswer,
  onSubmit,
}: {
  response: SurveyResponse;
  onAnswer: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
}) {
  const categories = Array.from(new Set(surveyQuestions.map((q) => q.category))) as SurveyCategory[];
  const progress = surveyProgress(response);
  const complete = isSurveyComplete(response);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">Survey Progress</span>
            <span className="text-muted-foreground">{progress}% complete</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {surveyQuestions
              .filter((q) => q.category === category)
              .map((q) => (
                <div key={q.id} className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{q.text}</p>
                  <RadioGroup
                    value={response[q.id] ?? ''}
                    onValueChange={(value) => onAnswer(q.id, value)}
                  >
                    {q.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                        <Label htmlFor={`${q.id}-${opt.id}`} className="font-normal cursor-pointer">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button disabled={!complete} onClick={onSubmit} className="min-w-[160px]">
          {complete ? 'Submit Survey' : `Answer all questions (${progress}%)`}
        </Button>
      </div>
    </div>
  );
}
