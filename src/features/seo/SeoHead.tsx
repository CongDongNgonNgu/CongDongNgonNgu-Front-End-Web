import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeoDocument, getSiteOrigin, SITE_NAME } from './seo.utils';

function upsertMeta(attribute: 'name' | 'property', value: string, content: string): void {
  const selector = `meta[${attribute}="${value}"]`;
  const meta = document.head.querySelector<HTMLMetaElement>(selector) ?? document.createElement('meta');
  if (!meta.parentNode) document.head.appendChild(meta);
  meta.setAttribute(attribute, value);
  meta.setAttribute('content', content);
  meta.dataset.seoManaged = 'true';
}

function removeMeta(attribute: 'name' | 'property', value: string): void {
  document.head.querySelector(`meta[${attribute}="${value}"][data-seo-managed="true"]`)?.remove();
}

export function SeoHead() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const origin = getSiteOrigin();
    const seo = getSeoDocument(pathname, search, origin);
    document.title = seo.title;
    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.robots);

    if (seo.canonicalPath) {
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement('link');
      if (!canonical.parentNode) document.head.appendChild(canonical);
      canonical.rel = 'canonical';
      canonical.href = new URL(seo.canonicalPath, origin).toString();
      canonical.dataset.seoManaged = 'true';
    } else {
      document.head.querySelector('link[rel="canonical"][data-seo-managed="true"]')?.remove();
    }

    if (seo.canonicalPath) {
      upsertMeta('property', 'og:title', seo.title);
      upsertMeta('property', 'og:description', seo.description);
      upsertMeta('property', 'og:type', seo.openGraphType);
      upsertMeta('property', 'og:url', new URL(seo.canonicalPath, origin).toString());
      upsertMeta('property', 'og:site_name', SITE_NAME);
    } else {
      ['og:title', 'og:description', 'og:type', 'og:url', 'og:site_name'].forEach((property) => removeMeta('property', property));
    }

    document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((script) => script.remove());
    if (seo.structuredData.length) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.textContent = JSON.stringify(seo.structuredData);
      document.head.appendChild(script);
    }
  }, [pathname, search]);

  return null;
}
