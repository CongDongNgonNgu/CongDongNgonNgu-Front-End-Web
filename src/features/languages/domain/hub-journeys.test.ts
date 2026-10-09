import { describe, expect, it } from 'vitest';
import { buildHubJourneys } from './hub-journeys';

const language = { code: 'vi', slug: 'vietnamese' };
describe('Phase25 canonical Hub journeys', () => {
  it('routes supported learning categories through canonical Library with only supported filters', () => {
    const journeys = buildHubJourneys(language, { levels: ['B2'], topic: 'travel' });
    expect(journeys.find((item) => item.key === 'vocabulary')?.href).toBe('/library?language=vi&type=VOCABULARY&level=B2&topic=travel');
    expect(journeys.find((item) => item.key === 'sentences')?.href).toBe('/library?language=vi&type=SENTENCE&level=B2&topic=travel');
    expect(journeys.find((item) => item.key === 'resources')?.href).toBe('/library?language=vi&level=B2&topic=travel');
  });
  it('does not send legacy multi-level values to the single-level Library API', () => {
    const journeys = buildHubJourneys(language, { levels: ['A1', 'B2'], topic: null });
    expect(journeys.find((item) => item.key === 'vocabulary')?.href).toBe('/library?language=vi&type=VOCABULARY');
  });
});
