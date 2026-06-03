import { useEffect, type ReactNode } from 'react';

export interface PublicBranding {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  portal_footer_text: string | null;
  powered_by_visible: boolean;
  font_heading: string | null;
  font_body: string | null;
}

interface Props {
  branding: PublicBranding | null;
  children: ReactNode;
}

/**
 * Hex (#RRGGBB) → "H S% L%" string for CSS HSL injection. Returns null on bad input.
 */
function hexToHsl(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const h = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      case b: hue = (r - g) / d + 4; break;
    }
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
}

export function WLProposalPublicShell({ branding, children }: Props) {
  const primary = hexToHsl(branding?.primary_color);
  const accent = hexToHsl(branding?.accent_color) ?? primary;

  // Inject Google Font links if partner specified custom fonts
  useEffect(() => {
    const fonts = [branding?.font_heading, branding?.font_body].filter(
      (f): f is string => !!f && f.length < 60,
    );
    if (!fonts.length) return;
    const family = Array.from(new Set(fonts)).map((f) =>
      `family=${encodeURIComponent(f)}:wght@400;500;600;700`,
    ).join('&');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${family}&display=swap`;
    link.dataset.wlProposalFont = '1';
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [branding?.font_heading, branding?.font_body]);

  const styleVars: React.CSSProperties = {
    ...(primary ? ({ ['--wl-primary']: primary } as React.CSSProperties) : {}),
    ...(accent ? ({ ['--wl-accent']: accent } as React.CSSProperties) : {}),
    ...(branding?.font_heading
      ? ({ ['--wl-font-heading']: `"${branding.font_heading}", system-ui, sans-serif` } as React.CSSProperties)
      : {}),
    ...(branding?.font_body
      ? ({ ['--wl-font-body']: `"${branding.font_body}", system-ui, sans-serif` } as React.CSSProperties)
      : {}),
  };

  const company = branding?.company_name || 'Proposal';

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        ...styleVars,
        fontFamily: 'var(--wl-font-body, inherit)',
      }}
    >
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={company}
              className="h-9 w-auto object-contain"
            />
          ) : (
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: 'var(--wl-font-heading, inherit)' }}
            >
              {company}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>

      <footer className="border-t mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-muted-foreground space-y-1">
          {branding?.portal_footer_text && (
            <p className="whitespace-pre-wrap">{branding.portal_footer_text}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {branding?.support_email && (
              <a
                href={`mailto:${branding.support_email}`}
                className="hover:underline"
              >
                {branding.support_email}
              </a>
            )}
            {branding?.support_phone && (
              <a
                href={`tel:${branding.support_phone}`}
                className="hover:underline"
              >
                {branding.support_phone}
              </a>
            )}
          </div>
          {branding?.powered_by_visible && company && (
            <p className="opacity-60">Powered by {company}</p>
          )}
        </div>
      </footer>
    </div>
  );
}
