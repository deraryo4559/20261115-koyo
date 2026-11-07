import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spots, filterSpots } from '../src/data';
import { routes } from '../src/data/routes';

describe('published spot catalog', () => {
  it('contains the 19 requested places once, in the three disjoint routes', () => {
    expect(spots.map((spot) => spot.id)).toEqual(Array.from({ length: 19 }, (_, index) => `P${String(index + 1).padStart(2, '0')}`));
    expect(new Set(spots.map((spot) => spot.name)).size).toBe(19);
    expect(routes.map((route) => filterSpots(route.id).length)).toEqual([4, 6, 9]);
    expect(filterSpots('all')).toHaveLength(19);
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
    expect(links.size).toBe(19);
  });

  it('only references existing local photos with reusable attribution metadata', () => {
    for (const spot of spots) {
      if (!spot.photo) continue;
      expect(spot.photo.src).toMatch(/^\/images\/spots\/p\d{2}\.webp$/);
      const file = path.join(process.cwd(), 'public', spot.photo.src);
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file).subarray(8, 12).toString()).toBe('WEBP');
      expect(spot.photo.credit.length).toBeGreaterThan(0);
      expect(spot.photo.licenseUrl).toMatch(/^https:\/\/(creativecommons\.org|commons\.wikimedia\.org)\//);
      expect(spot.photo.sourceUrl).toMatch(/^https:\/\//);
      expect(spot.photo.caption).not.toBe('');
    }
  });
});
