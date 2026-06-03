import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const brandColors = [
  { name: 'Primary Blue', hex: '#005FB4', hsl: 'hsl(207, 100%, 35%)', usage: 'Primary CTA, headers, brand identity', swatch: 'bg-primary' },
  { name: 'Secondary Purple', hex: '#AD5E80', hsl: 'hsl(340, 30%, 52%)', usage: 'Accents, highlights, secondary headings', swatch: 'bg-secondary' },
  { name: 'Soft Rose', hex: '#EED3BD', hsl: 'hsl(28, 58%, 84%)', usage: 'Soft backgrounds, borders, muted areas', swatch: 'bg-muted' },
  { name: 'CTA Red', hex: '#E74A3E', hsl: 'hsl(6, 77%, 57%)', usage: 'Action buttons on primary backgrounds', swatch: 'bg-cta' },
  { name: 'Dark Text', hex: '#1A1F2C', hsl: 'hsl(228, 24%, 14%)', usage: 'Body text, headings on light backgrounds', swatch: '' },
  { name: 'Light Background', hex: '#F8F9FA', hsl: 'hsl(210, 17%, 97%)', usage: 'Card backgrounds, page backgrounds', swatch: '' },
];

export function ColorPalette() {
  const [copied, setCopied] = useState('');

  const copyColor = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Color Palette</CardTitle>
        <CardDescription>Click any value to copy to clipboard</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandColors.map((color) => (
            <div key={color.name} className="border rounded-xl overflow-hidden">
              <div
                className="h-20 w-full"
                style={{ backgroundColor: color.hex }}
              />
              <div className="p-3 space-y-2">
                <p className="font-semibold text-sm">{color.name}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyColor(color.hex, `${color.name}-hex`)}
                    className="text-xs bg-muted/50 px-2 py-1 rounded font-mono hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    {color.hex}
                    {copied === `${color.name}-hex` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-50" />}
                  </button>
                  <button
                    onClick={() => copyColor(color.hsl, `${color.name}-hsl`)}
                    className="text-xs bg-muted/50 px-2 py-1 rounded font-mono hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    HSL
                    {copied === `${color.name}-hsl` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-50" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{color.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
