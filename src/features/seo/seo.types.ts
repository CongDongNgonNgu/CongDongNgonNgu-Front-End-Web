export type SeoRobots = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
export type SeoOpenGraphType = 'website' | 'article';

export interface SeoBreadcrumb {
  name: string;
  path: string;
}

export interface SeoDocument {
  title: string;
  description: string;
  canonicalPath: string | null;
  robots: SeoRobots;
  openGraphType: SeoOpenGraphType;
  breadcrumbs: SeoBreadcrumb[];
  structuredData: Record<string, unknown>[];
}
