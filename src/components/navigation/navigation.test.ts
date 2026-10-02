import { describe, expect, it } from 'vitest';
import { additionalNavigation, headerNavigation, isNavigationItemActive } from './navigation';

describe('global navigation routes', () => {
  it('points public menu items at implemented destinations', () => {
    expect(Object.fromEntries(headerNavigation.map((item) => [item.id, item.href]))).toMatchObject({
      home: '/',
      exchange: '/exchange',
    });
    expect(Object.fromEntries(additionalNavigation.map((item) => [item.id, item.href]))).toMatchObject({
      languages: '/languages',
      community: '/community',
      membership: '/membership',
      'how-it-works': '/#how-it-works',
    });
  });

  it('matches route trees without treating the root as a prefix', () => {
    const home = headerNavigation.find((item) => item.id === 'home');
    const community = additionalNavigation.find((item) => item.id === 'community');
    const languages = additionalNavigation.find((item) => item.id === 'languages');

    expect(home && isNavigationItemActive(home, '/')).toBe(true);
    expect(home && isNavigationItemActive(home, '/community')).toBe(false);
    expect(community && isNavigationItemActive(community, '/community/posts/post-1')).toBe(true);
    expect(community && isNavigationItemActive(community, '/community-old')).toBe(false);
    expect(languages && isNavigationItemActive(languages, '/languages/english')).toBe(true);
  });

  it('matches homepage section links only on the target section', () => {
    const howItWorks = additionalNavigation.find((item) => item.id === 'how-it-works');

    expect(howItWorks && isNavigationItemActive(howItWorks, '/', '#how-it-works')).toBe(true);
    expect(howItWorks && isNavigationItemActive(howItWorks, '/', '#community')).toBe(false);
    expect(howItWorks && isNavigationItemActive(howItWorks, '/community')).toBe(false);
  });
});
