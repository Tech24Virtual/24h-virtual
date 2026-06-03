import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import logoBlue from '@/assets/logos/logo-blue.png';
import logoWhite from '@/assets/logos/logo-white.png';

const logoVariants = [
  {
    name: 'Logo — Light Background',
    description: 'Use on white or light-colored backgrounds',
    src: logoBlue,
    filename: '24h-virtual-logo-blue.png',
    bg: 'bg-white border',
  },
  {
    name: 'Logo — Dark Background',
    description: 'Use on dark, navy, or primary-colored backgrounds',
    src: logoWhite,
    filename: '24h-virtual-logo-white.png',
    bg: 'bg-primary',
  },
];

const sizeSpecs = [
  { use: 'Favicon', dims: '32×32', export: '128×128 (4x)' },
  { use: 'Header', dims: '120×32', export: '480×128 (4x)' },
  { use: 'Hero Section', dims: '300×80', export: '1200×320 (4x)' },
  { use: 'Full Logo', dims: '512×137', export: '2048×548 (4x)' },
];

export function LogoShowcase() {
  const handleDownload = (src: string, filename: string) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Logo Variants</CardTitle>
        <CardDescription>Official 24H Virtual logos for light and dark backgrounds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {logoVariants.map((v) => (
            <div key={v.name} className="space-y-3">
              <div className={`${v.bg} rounded-xl p-8 flex items-center justify-center min-h-[120px]`}>
                <img src={v.src} alt={v.name} className="h-12 object-contain" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(v.src, v.filename)}
                >
                  <Download className="w-4 h-4 mr-1" /> PNG
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Size specs table */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Recommended Export Sizes</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Use Case</th>
                  <th className="text-left px-4 py-2 font-medium">Display Size</th>
                  <th className="text-left px-4 py-2 font-medium">Export @4x</th>
                </tr>
              </thead>
              <tbody>
                {sizeSpecs.map((s) => (
                  <tr key={s.use} className="border-t">
                    <td className="px-4 py-2">{s.use}</td>
                    <td className="px-4 py-2 font-mono text-xs">{s.dims}</td>
                    <td className="px-4 py-2 font-mono text-xs">{s.export}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
