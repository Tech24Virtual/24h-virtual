import { useState, useEffect } from 'react';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { LogoShowcase } from '@/components/brand-assets/LogoShowcase';
import { ColorPalette } from '@/components/brand-assets/ColorPalette';
import { TypographyShowcase } from '@/components/brand-assets/TypographyShowcase';
import { BannerPreview } from '@/components/brand-assets/BannerPreview';
import { UsageGuidelines } from '@/components/brand-assets/UsageGuidelines';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function AffiliateBrandAssets() {
  const { user } = useAuth();
  const [affiliateCode, setAffiliateCode] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('affiliates')
      .select('affiliate_code')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAffiliateCode(data.affiliate_code);
      });
  }, [user]);

  return (
    <AffiliateLayout title="Brand Assets">
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground text-sm mb-6">
            Download logos, banners, and brand materials. All banners include your affiliate referral code automatically.
          </p>
        </div>
        <LogoShowcase />
        <BannerPreview affiliateCode={affiliateCode} />
        <ColorPalette />
        <TypographyShowcase />
        <UsageGuidelines />
      </div>
    </AffiliateLayout>
  );
}
