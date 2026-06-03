import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportElementAsPNG, downloadBlob } from '@/lib/bannerExporter';
import { bundleAndDownload } from '@/lib/assetZipper';
import logoWhite from '@/assets/logos/logo-white.png';

interface BannerDef {
  name: string;
  width: number;
  height: number;
  category: string;
}

const banners: BannerDef[] = [
  { name: 'Leaderboard', width: 728, height: 90, category: 'header' },
  { name: 'Large Leaderboard', width: 970, height: 90, category: 'header' },
  { name: 'Billboard', width: 970, height: 250, category: 'header' },
  { name: 'Medium Rectangle', width: 300, height: 250, category: 'sidebar' },
  { name: 'Wide Skyscraper', width: 160, height: 600, category: 'sidebar' },
  { name: 'Mobile Banner', width: 320, height: 50, category: 'mobile' },
  { name: 'Large Mobile', width: 320, height: 100, category: 'mobile' },
  { name: 'Facebook Cover', width: 1200, height: 630, category: 'social' },
  { name: 'Twitter/X Header', width: 1500, height: 500, category: 'social' },
  { name: 'Instagram Post', width: 1080, height: 1080, category: 'social' },
];

const categories = [
  { value: 'header', label: 'Header' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'social', label: 'Social Media' },
];

function BannerComponent({ width, height, affiliateCode }: { width: number; height: number; affiliateCode?: string }) {
  const isSmall = height <= 100;
  const isTall = height > width;
  const isSquare = Math.abs(width - height) < 200;

  if (isTall) {
    return (
      <div
        className="flex flex-col items-center justify-between text-center"
        style={{
          width, height,
          background: 'linear-gradient(180deg, #005FB4 0%, #003d75 100%)',
          padding: '24px 16px',
        }}
      >
        <img src={logoWhite} alt="24H Virtual" style={{ height: 28 }} />
        <div>
          <p style={{ color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
            Professional Virtual Receptionists
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
            24/7 Live Answering
          </p>
        </div>
        <div
          style={{
            background: '#E74A3E', color: 'white', padding: '8px 20px',
            borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
          }}
        >
          Learn More →
        </div>
        {affiliateCode && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, fontFamily: 'Inter, sans-serif' }}>
            ref: {affiliateCode}
          </p>
        )}
      </div>
    );
  }

  if (isSquare) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          width, height,
          background: 'linear-gradient(135deg, #005FB4 0%, #003d75 100%)',
          padding: 32,
          gap: 16,
        }}
      >
        <img src={logoWhite} alt="24H Virtual" style={{ height: 36 }} />
        <p style={{ color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
          Professional Virtual Receptionists
        </p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
          Never miss a call. 24/7 live answering for your business.
        </p>
        <div
          style={{
            background: '#E74A3E', color: 'white', padding: '12px 28px',
            borderRadius: 8, fontSize: 15, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            marginTop: 8,
          }}
        >
          Get Started →
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between"
      style={{
        width, height,
        background: 'linear-gradient(135deg, #005FB4 0%, #003d75 100%)',
        padding: isSmall ? '0 12px' : '0 24px',
      }}
    >
      <img src={logoWhite} alt="24H Virtual" style={{ height: isSmall ? 18 : 28 }} />
      <p style={{
        color: 'white', fontSize: isSmall ? 11 : 15, fontWeight: 600,
        fontFamily: 'Poppins, sans-serif', flex: 1, textAlign: 'center',
        padding: '0 8px',
      }}>
        Professional Virtual Receptionists
      </p>
      <div
        style={{
          background: '#E74A3E', color: 'white',
          padding: isSmall ? '4px 10px' : '8px 18px',
          borderRadius: 6, fontSize: isSmall ? 10 : 13,
          fontWeight: 600, fontFamily: 'Inter, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        Learn More →
      </div>
    </div>
  );
}

interface BannerPreviewProps {
  affiliateCode?: string;
}

export function BannerPreview({ affiliateCode }: BannerPreviewProps) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [downloading, setDownloading] = useState('');

  const handleDownload = async (banner: BannerDef, scale: 1 | 2) => {
    const el = refs.current[banner.name];
    if (!el) return;
    const id = `${banner.name}-${scale}x`;
    setDownloading(id);
    try {
      const blob = await exportElementAsPNG(el, banner.width, banner.height, scale);
      const suffix = scale === 2 ? '@2x' : '';
      downloadBlob(blob, `24h-virtual-${banner.name.toLowerCase().replace(/\s+/g, '-')}${suffix}.png`);
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadAll = async (category: string) => {
    setDownloading(`all-${category}`);
    const categoryBanners = banners.filter((b) => b.category === category);
    const assets: { filename: string; blob: Blob }[] = [];
    for (const banner of categoryBanners) {
      const el = refs.current[banner.name];
      if (!el) continue;
      const blob1x = await exportElementAsPNG(el, banner.width, banner.height, 1);
      const blob2x = await exportElementAsPNG(el, banner.width, banner.height, 2);
      const slug = banner.name.toLowerCase().replace(/\s+/g, '-');
      assets.push({ filename: `${slug}.png`, blob: blob1x });
      assets.push({ filename: `${slug}@2x.png`, blob: blob2x });
    }
    await bundleAndDownload(assets, `24h-virtual-${category}-banners.zip`);
    setDownloading('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Promotional Banners</CardTitle>
        <CardDescription>
          Download banners in standard ad sizes at 1x and 2x resolution
          {affiliateCode && '. All banners include your affiliate referral link'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="header">
          <TabsList className="mb-4">
            {categories.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="space-y-6">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadAll(cat.value)}
                  disabled={!!downloading}
                >
                  {downloading === `all-${cat.value}` ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  Download All ({cat.label}) as ZIP
                </Button>
              </div>

              {banners
                .filter((b) => b.category === cat.value)
                .map((banner) => (
                  <div key={banner.name} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{banner.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {banner.width}×{banner.height}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(banner, 1)}
                          disabled={!!downloading}
                        >
                          {downloading === `${banner.name}-1x` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>PNG 1x</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(banner, 2)}
                          disabled={!!downloading}
                        >
                          {downloading === `${banner.name}-2x` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>PNG 2x</>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-auto border rounded-lg bg-muted/30 p-4 flex justify-center">
                      <div
                        ref={(el) => { refs.current[banner.name] = el; }}
                        style={{ width: banner.width, height: banner.height, flexShrink: 0 }}
                      >
                        <BannerComponent
                          width={banner.width}
                          height={banner.height}
                          affiliateCode={affiliateCode}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
