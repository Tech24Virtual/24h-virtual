import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Routes where 24H Virtual tracking must NOT fire
// These are WL partner sessions — the end users belong to our partners,
// not to 24H Virtual, and have not consented to 24H tracking
const WL_ROUTE_PREFIXES = [
  '/wl-portal',
  '/white-label-dashboard',
  '/c/',         // public WL client token portal
];

const GA4_ID = 'G-J1TZ6N6MTC';
const META_PIXEL_ID = '377446893399400';

function isWLRoute(pathname: string): boolean {
  return WL_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function TrackingPixels() {
  const { pathname } = useLocation();
  const suppress = isWLRoute(pathname);

  useEffect(() => {
    if (suppress) return;

    // GA4 — load once
    if (!document.getElementById('ga4-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
      document.head.appendChild(script);

      const inline = document.createElement('script');
      inline.id = 'ga4-inline';
      inline.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA4_ID}', { anonymize_ip: true });
      `;
      document.head.appendChild(inline);
    }

    // Meta Pixel — load once
    if (!document.getElementById('meta-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'meta-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
        (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }

  }, [suppress]);

  // Track page views on route change (GA4 only, not on WL routes)
  useEffect(() => {
    if (suppress) return;
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'page_view', {
        page_path: pathname,
      });
    }
  }, [pathname, suppress]);

  return null;
}
