import { Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const dos = [
  'Use the official logo files provided on this page',
  'Maintain clear space around the logo (minimum 16px)',
  'Use the blue logo on light backgrounds',
  'Use the white logo on dark or primary-colored backgrounds',
  'Keep the logo proportional — never stretch or distort',
  'Use brand colors consistently across all materials',
];

const donts = [
  'Do not alter the logo colors or add effects',
  'Do not place the logo on busy or low-contrast backgrounds',
  'Do not rotate, skew, or add drop shadows to the logo',
  'Do not recreate the logo using different fonts',
  'Do not use the logo smaller than 32px in height',
  'Do not use unapproved color combinations',
];

export function UsageGuidelines() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usage Guidelines</CardTitle>
        <CardDescription>Follow these rules to maintain brand consistency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-status-success">
              <Check className="w-4 h-4" /> Do
            </h4>
            <ul className="space-y-2">
              {dos.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-status-success mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-destructive">
              <X className="w-4 h-4" /> Don't
            </h4>
            <ul className="space-y-2">
              {donts.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
