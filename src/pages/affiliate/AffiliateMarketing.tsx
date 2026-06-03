import { useState, useEffect } from 'react';
import { generateAffiliateLink } from '@/lib/affiliateDomain';
import { Download, ExternalLink, Copy, Check, Megaphone, Link as LinkIcon, Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function AffiliateMarketing() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState('');

  // UTM params for link generator
  const [campaign, setCampaign] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setIsLoading(true);
      const [{ data: aff }, { data: assetData }] = await Promise.all([
        supabase.from('affiliates').select('affiliate_code').eq('user_id', user.id).maybeSingle(),
        supabase.from('affiliate_marketing_assets').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      ]);
      setAffiliateCode(aff?.affiliate_code || '');
      setAssets(assetData || []);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const generatedLink = generateAffiliateLink(affiliateCode, { campaign, source, medium });

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const assetTypeLabels: Record<string, string> = {
    banner: 'Banner',
    email_template: 'Email Template',
    social_post: 'Social Post',
    landing_page: 'Landing Page',
  };

  if (isLoading) return <AffiliateLayout title="Marketing"><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></AffiliateLayout>;

  return (
    <AffiliateLayout title="Marketing">
      {/* Brand Assets CTA */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Brand Assets</h3>
              <p className="text-xs text-muted-foreground">Download logos, banners, and brand guidelines with your affiliate link</p>
            </div>
          </div>
          <Link to="/affiliate/brand-assets">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" /> View Assets
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Link Generator */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><LinkIcon className="w-5 h-5" />Referral Link Generator</CardTitle>
          <CardDescription>Create custom links with UTM tracking parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Campaign</Label><Input placeholder="e.g. summer2026" value={campaign} onChange={e => setCampaign(e.target.value)} /></div>
            <div><Label>Source</Label><Input placeholder="e.g. facebook" value={source} onChange={e => setSource(e.target.value)} /></div>
            <div><Label>Medium</Label><Input placeholder="e.g. social" value={medium} onChange={e => setMedium(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Input value={generatedLink} readOnly className="flex-1 text-sm" />
            <Button variant="outline" onClick={() => copyText(generatedLink, 'link')}>
              {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Share Templates</CardTitle>
          <CardDescription>Pre-written messages with your referral link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 'social', label: 'Social Media Post', text: `Looking for professional virtual receptionist services? Check out 24H Virtual! ${generatedLink}` },
            { id: 'email', label: 'Email Template', text: `Hi there,\n\nI wanted to recommend 24H Virtual for your business phone answering needs. They offer professional live receptionists 24/7.\n\nLearn more: ${generatedLink}` },
          ].map(t => (
            <div key={t.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t.label}</span>
                <Button variant="ghost" size="sm" onClick={() => copyText(t.text, t.id)}>
                  {copied === t.id ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied === t.id ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{t.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Marketing Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="w-5 h-5" />Marketing Assets</CardTitle>
          <CardDescription>Download banners and promotional materials</CardDescription>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No assets available yet</p>
              <p className="text-sm">Check back soon for marketing materials</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map(asset => (
                <Card key={asset.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{assetTypeLabels[asset.asset_type] || asset.asset_type}</Badge>
                      {asset.dimensions && <span className="text-xs text-muted-foreground">{asset.dimensions}</span>}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{asset.title}</h4>
                    {asset.description && <p className="text-xs text-muted-foreground mb-3">{asset.description}</p>}
                    <a href={asset.asset_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full"><Download className="w-4 h-4 mr-1" />Download</Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AffiliateLayout>
  );
}
