import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spots, filterSpots } from '../src/data';
import { routes } from '../src/data/routes';

describe('published spot catalog', () => {
  it('contains the 20 requested places once, in the three disjoint routes', () => {
    expect(spots.map((spot) => spot.id)).toEqual(Array.from({ length: 20 }, (_, index) => `P${String(index + 1).padStart(2, '0')}`));
    expect(new Set(spots.map((spot) => spot.name)).size).toBe(20);
    expect(routes.map((route) => filterSpots(route.id).length)).toEqual([4, 7, 9]);
    for (const route of routes) expect(filterSpots(route.id)).toHaveLength(route.count);
    expect(filterSpots('all')).toHaveLength(20);
    expect(spots.some((spot) => /筑波山|あしかが|竜神峡/.test(spot.name))).toBe(false);
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
      expect(url.searchParams.get('cid')).toMatch(/^\d+$/);
      expect(spot.sources.length).toBeGreaterThan(0);
      expect(spot.locationNote).not.toBe('');
      links.add(spot.googleMapsUrl);
    }
    expect(links.size).toBe(20);
  });

  it('gives every spot a distinct photo album and an attributed local autumn cover', () => {
    for (const spot of spots) {
      expect(spot.photos.length).toBeGreaterThanOrEqual(2);
      expect(spot.photo).toBe(spot.photos[0]);
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
