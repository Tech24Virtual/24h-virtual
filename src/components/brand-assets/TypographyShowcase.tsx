import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const fontSamples = [
  {
    family: 'Poppins',
    usage: 'Headlines, page titles, brand name',
    cssVar: 'var(--font-heading)',
    weights: [
      { label: 'Regular', weight: 400 },
      { label: 'Medium', weight: 500 },
      { label: 'Semibold', weight: 600 },
      { label: 'Bold', weight: 700 },
    ],
  },
  {
    family: 'Inter',
    usage: 'Body text, UI elements, buttons',
    cssVar: 'var(--font-body)',
    weights: [
      { label: 'Light', weight: 300 },
      { label: 'Regular', weight: 400 },
      { label: 'Medium', weight: 500 },
      { label: 'Semibold', weight: 600 },
      { label: 'Bold', weight: 700 },
    ],
  },
];

export function TypographyShowcase() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Typography</CardTitle>
        <CardDescription>Font families and weight samples used across the brand</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {fontSamples.map((font) => (
          <div key={font.family}>
            <div className="flex items-baseline gap-3 mb-1">
              <h4
                className="text-2xl"
                style={{ fontFamily: font.cssVar, fontWeight: 700 }}
              >
                {font.family}
              </h4>
              <span className="text-xs text-muted-foreground font-mono">{font.cssVar}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{font.usage}</p>
            <div className="space-y-2">
              {font.weights.map((w) => (
                <div key={w.weight} className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-20">{w.label} ({w.weight})</span>
                  <p
                    className="text-lg"
                    style={{ fontFamily: font.cssVar, fontWeight: w.weight }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
