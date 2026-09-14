import { describe, expect, it } from 'vitest';
import { validateReportInput } from './community-validation';

describe('community report validation', () => {
  it('requires a supported report category', () => {
    expect(validateReportInput({ category: '', details: '' })).toEqual({
      category: 'Vui lòng chọn lý do báo cáo.',
    });
  });

  it('enforces the 1,000 Unicode code point details limit', () => {
    expect(validateReportInput({ category: 'OTHER', details: '😀'.repeat(1_001) }).details)
      .toContain('1.000');
  });
});
