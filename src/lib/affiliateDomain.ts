export const AFFILIATE_BASE_URL = "https://24hv.io";

export function generateAffiliateLink(
  code: string,
  utmParams?: { campaign?: string; source?: string; medium?: string }
): string {
  const base = `${AFFILIATE_BASE_URL}?ref=${code}`;
  if (!utmParams) return base;

  const params = new URLSearchParams();
  if (utmParams.campaign) params.set("utm_campaign", utmParams.campaign);
  if (utmParams.source) params.set("utm_source", utmParams.source);
  if (utmParams.medium) params.set("utm_medium", utmParams.medium);
  const qs = params.toString();
  return qs ? `${base}&${qs}` : base;
}
