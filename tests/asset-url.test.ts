import { describe, expect, it } from 'vitest';
import { assetUrl } from '../src/lib/asset-url';

describe('public asset URLs', () => {
  it('works at the local server root', () => {
    expect(assetUrl('/images/spots/p01.webp', '/')).toBe('/images/spots/p01.webp');
  });
  it('keeps the repository prefix for GitHub Pages', () => {
    expect(assetUrl('/images/spots/p01.webp', '/20261115-koyo/')).toBe('/20261115-koyo/images/spots/p01.webp');
    expect(assetUrl('/favicon.svg', '/20261115-koyo/')).toBe('/20261115-koyo/favicon.svg');
  });
  it('normalizes the separator without duplicating it', () => {
    expect(assetUrl('images/spots/p01.webp', '/20261115-koyo')).toBe('/20261115-koyo/images/spots/p01.webp');
  });
});
