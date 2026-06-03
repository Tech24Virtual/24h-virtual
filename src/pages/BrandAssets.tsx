import { Helmet } from 'react-helmet-async';
import { Palette } from 'lucide-react';
import { LogoShowcase } from '@/components/brand-assets/LogoShowcase';
import { ColorPalette } from '@/components/brand-assets/ColorPalette';
import { TypographyShowcase } from '@/components/brand-assets/TypographyShowcase';
import { BannerPreview } from '@/components/brand-assets/BannerPreview';
import { UsageGuidelines } from '@/components/brand-assets/UsageGuidelines';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export default function BrandAssets() {
  return (
    <>
      <Helmet>
        <title>Brand Assets | 24H Virtual</title>
        <meta name="description" content="Download official 24H Virtual logos, banners, brand colors, and typography guidelines for your marketing materials." />
      </Helmet>
      <Navigation />
      <main>
        {/* Hero */}
        <section className="gradient-blue py-20 lg:py-28">
          <div className="container-custom text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6">
              <Palette className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">Brand Resources</span>
            </div>
            <h1 className="text-primary-foreground mb-4">Brand Assets</h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
              Everything you need to represent 24H Virtual: logos, colors, fonts, and promotional banners in all standard sizes.
            </p>
          </div>
        </section>

        <div className="container-custom py-16 space-y-12">
          <LogoShowcase />
          <BannerPreview />
          <ColorPalette />
          <TypographyShowcase />
          <UsageGuidelines />
        </div>
      </main>
      <Footer />
    </>
  );
}
