import {
  chooseBrandDisplayName,
  normalizeBrandDisplayName,
  normalizeBrandKey,
  uniqueBrandDisplayNames,
} from './brand.util';

describe('brand utilities', () => {
  it('uses the same key regardless of case, accents, or repeated spaces', () => {
    expect(normalizeBrandKey('  VCP ')).toBe(normalizeBrandKey('vcp'));
    expect(normalizeBrandKey('Santa  Vida')).toBe(normalizeBrandKey('sánta vida'));
  });

  it('prefers an uppercase acronym for display', () => {
    expect(chooseBrandDisplayName('Vcp', 'VCP')).toBe('VCP');
    expect(chooseBrandDisplayName('VCP', 'Vcp')).toBe('VCP');
  });

  it('persists short brand acronyms with one canonical spelling', () => {
    expect(normalizeBrandDisplayName('VCP')).toBe('VCP');
    expect(normalizeBrandDisplayName('Vcp')).toBe('VCP');
    expect(normalizeBrandDisplayName('vcp')).toBe('VCP');
    expect(normalizeBrandDisplayName('Santa Vida')).toBe('Santa Vida');
  });

  it('deduplicates brand names without losing the preferred spelling', () => {
    expect(uniqueBrandDisplayNames(['Vcp', 'VCP', 'Santa Vida'])).toEqual([
      'Santa Vida',
      'VCP',
    ]);
  });
});
