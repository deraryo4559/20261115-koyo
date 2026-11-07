import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spots, filterSpots } from '../src/data';
import { routes } from '../src/data/routes';

describe('published spot catalog', () => {
  it('contains the 25 requested places once, in the three disjoint routes', () => {
    expect(spots.map((spot) => spot.id)).toEqual(Array.from({ length: 25 }, (_, index) => `P${String(index + 1).padStart(2, '0')}`));
    expect(new Set(spots.map((spot) => spot.name)).size).toBe(25);
    expect(routes.map((route) => filterSpots(route.id).length)).toEqual([5, 9, 11]);
    for (const route of routes) expect(filterSpots(route.id)).toHaveLength(route.count);
    expect(filterSpots('all')).toHaveLength(25);
    expect(spots.some((spot) => /筑波山|あしかが|竜神峡/.test(spot.name))).toBe(false);
  });

  it('adds the five requested places with three high-resolution autumn photos each', () => {
    const expected = { P21: '中津峡', P22: '鳩ノ巣渓谷', P23: '名勝・猿橋', P24: '南伊奈ヶ湖', P25: '大雄山最乗寺' };
    for (const [id, name] of Object.entries(expected)) {
      const spot = spots.find((item) => item.id === id)!;
      expect(spot.name).toBe(name);
      expect(spot.photos).toHaveLength(3);
      for (const photo of spot.photos) {
        expect(photo.season).toBe('autumn');
        // The user supplied P25's first replacement at its original 1024px resolution.
        expect(Math.max(photo.width!, photo.height!)).toBeGreaterThanOrEqual(photo.src === '/images/spots/p25-04.webp' ? 1024 : 1400);
      }
    }
  });

  it('preserves the four explicitly fixed thumbnails', () => {
    const fixed = { P02: 'p02-04.webp', P13: 'p13-03.webp', P15: 'p15-01.webp', P20: 'p20-01.webp' };
    for (const [id, file] of Object.entries(fixed)) expect(spots.find((spot) => spot.id === id)?.photo?.src).toBe(`/images/spots/${file}`);
  });

  it('uses valid source-backed coordinates and unique individual Google Maps links', () => {
    const links = new Set<string>();
    for (const spot of spots) {
      expect(spot.coordinates[0]).toBeGreaterThan(35);
      expect(spot.coordinates[0]).toBeLessThan(37);
      expect(spot.coordinates[1]).toBeGreaterThan(138);
      expect(spot.coordinates[1]).toBeLessThan(140);
      const url = new URL(spot.googleMapsUrl);
      expect(url.hostname).toBe('www.google.com');
      if (url.searchParams.has('cid')) {
        expect(url.searchParams.get('cid')).toMatch(/^\d+$/);
      } else {
        expect(url.pathname).toBe('/maps/search/');
        expect(url.searchParams.get('api')).toBe('1');
        expect(url.searchParams.get('query')).toContain(spot.name);
        expect(url.searchParams.get('query')).toContain(spot.address);
      }
      expect(spot.sources.length).toBeGreaterThan(0);
      expect(spot.locationNote).not.toBe('');
      links.add(spot.googleMapsUrl);
    }
    expect(links.size).toBe(25);
  });

  it('gives every spot a distinct photo album and an attributed local autumn cover', () => {
    for (const spot of spots) {
      expect(spot.photos.length).toBeGreaterThanOrEqual(2);
      expect(spot.photos).toContain(spot.photo);
      expect(spot.photo?.season).toBe('autumn');
      expect(new Set(spot.photos.map((photo) => photo.src)).size).toBe(spot.photos.length);
      for (const photo of spot.photos) {
        expect(photo.src).toMatch(/^\/images\/spots\/p\d{2}(?:-\d{2})?\.webp$/);
        const file = path.join(process.cwd(), 'public', photo.src);
        expect(existsSync(file)).toBe(true);
        expect(readFileSync(file).subarray(8, 12).toString()).toBe('WEBP');
        expect(['autumn', 'other', 'unknown']).toContain(photo.season);
        expect(photo.credit.length).toBeGreaterThan(0);
        expect(photo.licenseUrl).toMatch(/^https:\/\//);
        expect(photo.sourceUrl).toMatch(/^https:\/\//);
        expect(photo.caption).not.toBe('');
      }
    }
  });
});
