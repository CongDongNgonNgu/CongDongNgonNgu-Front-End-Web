import { describe, expect, it } from 'vitest';
import { parseCommunitySearch, serializeCommunitySearch } from './community-search';

describe('Community search URL contract', () => {
  it('normalizes literal query and topic with an implied question state', () => {
    const result=parseCommunitySearch(new URLSearchParams('q=%20%EF%BC%A1%25_%20&topic=Daily%20Practice&responseState=ACCEPTED&savedByMe=true&sort=USEFUL'));
    expect(result).toEqual({query:{q:'A%_',topic:'daily-practice',postType:'QUESTION',responseState:'ACCEPTED',savedByMe:true,sort:'USEFUL'},invalid:false});
    expect(serializeCommunitySearch(result.query).get('responseState')).toBe('ACCEPTED');
  });
  it.each(['postType=ACTIVITY','sort=ACTIVITY','responseState=WRONG','savedByMe=other','postType=DISCUSSION&responseState=ANSWERED','languageCode=unknown%21','q='+ 'x'.repeat(121)])('rejects unsupported or incompatible URL filters: %s', (search) => {
    expect(parseCommunitySearch(new URLSearchParams(search)).invalid).toBe(true);
  });
  it('never accepts actor identifiers, pagination cursors, or arbitrary extra filters from the URL', () => {
    const parsed=parseCommunitySearch(new URLSearchParams('q=hello&userId=foreign&cursor=opaque&tag=madeup'));
    expect(parsed.query).toEqual({q:'hello'});
    expect(parsed.invalid).toBe(true);
    expect(serializeCommunitySearch(parsed.query).has('cursor')).toBe(false);
  });
  it('omits defaults and empty filters without mutating input', () => {
    const input={q:'',sort:'NEWEST' as const,savedByMe:false};
    expect(serializeCommunitySearch(input).toString()).toBe('');
    expect(input).toEqual({q:'',sort:'NEWEST',savedByMe:false});
  });
});

it('normalizes catalog language codes consistently with server and rejects overlong codes', () => {
  expect(parseCommunitySearch(new URLSearchParams({languageCode:'  EN-US  '}))).toEqual({query:{languageCode:'en-us'},invalid:false});
  expect(parseCommunitySearch(new URLSearchParams({languageCode:'abcd'}))).toEqual({query:{languageCode:'abcd'},invalid:false});
  expect(parseCommunitySearch(new URLSearchParams({languageCode:'a'.repeat(36)})).invalid).toBe(true);
});
