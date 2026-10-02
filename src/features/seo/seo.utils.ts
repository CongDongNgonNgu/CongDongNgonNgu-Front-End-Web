import type { SeoBreadcrumb, SeoDocument } from './seo.types';

export const SITE_NAME = 'CongDongNgonNgu.vn';
export const DEFAULT_TITLE = 'Cộng đồng ngôn ngữ | Học hỏi và chia sẻ cùng nhau';
export const DEFAULT_DESCRIPTION = 'Cộng đồng ngôn ngữ độc lập để học hỏi, thực hành và chia sẻ cùng nhau.';

const PUBLIC_ROUTES = {
  home: '/',
  languages: '/languages',
  library: '/library',
  community: '/community',
} as const;

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const withoutTrailingSlash = pathname.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
}

function hasSearch(search: string): boolean {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).size > 0;
}

function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return segment;
  }
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function createBreadcrumbs(pathname: string, routeLabel?: string): SeoBreadcrumb[] {
  const breadcrumbs: SeoBreadcrumb[] = [{ name: 'Trang chủ', path: '/' }];
  if (pathname === PUBLIC_ROUTES.home) return breadcrumbs;
  if (pathname === PUBLIC_ROUTES.languages) return [...breadcrumbs, { name: 'Khám phá ngôn ngữ', path: '/languages' }];
  if (pathname.startsWith(`${PUBLIC_ROUTES.languages}/`)) {
    return [...breadcrumbs, { name: 'Khám phá ngôn ngữ', path: '/languages' }, { name: routeLabel ?? 'Ngôn ngữ', path: pathname }];
  }
  if (pathname === PUBLIC_ROUTES.library) return [...breadcrumbs, { name: 'Thư viện mở', path: '/library' }];
  if (pathname.startsWith(`${PUBLIC_ROUTES.library}/`)) {
    return [...breadcrumbs, { name: 'Thư viện mở', path: '/library' }, { name: routeLabel ?? 'Tài nguyên', path: pathname }];
  }
  if (pathname === PUBLIC_ROUTES.community) return [...breadcrumbs, { name: 'Cộng đồng học ngôn ngữ', path: '/community' }];
  if (pathname.startsWith(`${PUBLIC_ROUTES.community}/posts/`)) {
    return [...breadcrumbs, { name: 'Cộng đồng học ngôn ngữ', path: '/community' }, { name: routeLabel ?? 'Bài viết', path: pathname }];
  }
  return breadcrumbs;
}

function buildStructuredData(seo: Omit<SeoDocument, 'structuredData'>, origin: string): Record<string, unknown>[] {
  if (seo.robots !== 'index,follow') return [];

  const pageUrl = new URL(seo.canonicalPath ?? '/', origin).toString();
  const webPage: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: new URL('/', origin).toString(),
    },
  };

  const structuredData = [webPage];
  if (seo.canonicalPath === '/') {
    structuredData.unshift({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: new URL('/', origin).toString(),
      description: seo.description,
    });
  }
  if (seo.breadcrumbs.length > 1) {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: seo.breadcrumbs.map((breadcrumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: breadcrumb.name,
        item: new URL(breadcrumb.path, origin).toString(),
      })),
    });
  }
  return structuredData;
}

export function getSeoDocument(pathname: string, search = '', origin = 'https://cong-dong-ngon-ngu-sigma.vercel.app'): SeoDocument {
  const normalizedPath = normalizePath(pathname);
  const queryPresent = hasSearch(search);
  const isLanguageHub = /^\/languages\/[^/]+$/.test(normalizedPath);
  const isLibraryResource = /^\/library\/[^/]+$/.test(normalizedPath) && !['/library/contribute', '/library/review'].includes(normalizedPath);
  const isCommunityPost = /^\/community\/posts\/[^/]+$/.test(normalizedPath);
  const isPublicRoute = normalizedPath === '/' || normalizedPath === '/languages' || isLanguageHub || normalizedPath === '/library' || isLibraryResource || normalizedPath === '/community' || isCommunityPost;
  const routeLabel = normalizedPath.split('/').at(-1) && titleCase(decodeRouteSegment(normalizedPath.split('/').at(-1) ?? ''));

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  if (normalizedPath === '/languages') {
    title = 'Khám phá ngôn ngữ | CongDongNgonNgu.vn';
    description = 'Khám phá các ngôn ngữ đang được mở trên CongDongNgonNgu.vn.';
  } else if (isLanguageHub) {
    title = `${routeLabel ?? 'Ngôn ngữ'} | CongDongNgonNgu.vn`;
    description = 'Không gian học ngôn ngữ với tài nguyên, ghi chú và trao đổi được tổ chức cho người học.';
  } else if (normalizedPath === '/library') {
    title = 'Thư viện mở | CongDongNgonNgu.vn';
    description = 'Khám phá tài nguyên ngôn ngữ đã được xác minh, có nguồn và giấy phép rõ ràng.';
  } else if (isLibraryResource) {
    title = `${routeLabel ?? 'Tài nguyên'} | Thư viện mở`;
    description = 'Đọc tài nguyên ngôn ngữ công khai với nguồn gốc và điều kiện sử dụng rõ ràng.';
  } else if (normalizedPath === '/community') {
    title = 'Cộng đồng học ngôn ngữ | CongDongNgonNgu.vn';
    description = 'Trao đổi, đặt câu hỏi và chia sẻ khoảnh khắc học ngôn ngữ cùng cộng đồng.';
  } else if (isCommunityPost) {
    title = `${routeLabel ?? 'Bài viết cộng đồng'} | CongDongNgonNgu.vn`;
    description = 'Một bài viết trong không gian trao đổi ngôn ngữ của CongDongNgonNgu.vn.';
  }

  const robots = isPublicRoute ? (queryPresent ? 'noindex,follow' : 'index,follow') : 'noindex,nofollow';
  const canonicalPath = isPublicRoute ? normalizedPath : null;
  const withoutStructuredData: Omit<SeoDocument, 'structuredData'> = {
    title,
    description,
    canonicalPath,
    robots,
    openGraphType: isCommunityPost ? 'article' : 'website',
    breadcrumbs: isPublicRoute ? createBreadcrumbs(normalizedPath, routeLabel) : [],
  };

  return {
    ...withoutStructuredData,
    structuredData: buildStructuredData(withoutStructuredData, origin),
  };
}

export function getSiteOrigin(): string {
  return typeof window === 'undefined' ? 'https://cong-dong-ngon-ngu-sigma.vercel.app' : window.location.origin;
}
