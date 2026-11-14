import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { cafeCandidates, drivePlans, initialPlanSelections, lunchCandidates, planPlaces } from '../src/data/drive-plans';
import { buildItinerary, itineraryMapStops } from '../src/lib/drive-plans';
import { itineraryRoadLegs } from '../src/lib/plan-roads';
import roadData from '../src/data/plan-road-routes.json';
import { planAlbums, planAlbumUrl, planCover } from '../src/lib/plan-albums';
import { spotById, spots } from '../src/data';
import locations from '../src/data/plan-locations.json';

describe('plan map', () => {
  it('numbers the same itinerary, leaving the unselected cafe and its adjoining lines out', () => {
    const stops = buildItinerary(drivePlans[0].stages, initialPlanSelections);
    expect(itineraryMapStops(stops).map((stop) => [stop.id, stop.order])).toEqual([
      ['start', 1], ['funari', 2], ['corridor', 3], ['pass', 4], ['oldTunnel', 5], ['newTunnel', 7], ['illumination', 8],
    ]);
    expect(itineraryRoadLegs(stops)).toHaveLength(5);
    expect(itineraryRoadLegs(stops).map((leg) => leg.key)).not.toContain('oldTunnel>newTunnel');
  });
  it('includes only the chosen businesses and independent foliage choices, in order', () => {
    for (const lunch of lunchCandidates) for (const cafe of cafeCandidates) {
      const stops = buildItinerary(drivePlans[1].stages, { ...initialPlanSelections, lunchId: lunch.id, cafeId: cafe.id, plan2Koyodai: true });
      expect(itineraryMapStops(stops).map((stop) => stop.id)).toEqual(['start', lunch.id, 'koyodai', 'shoji', 'motosu', 'pass', 'oldTunnel', cafe.id, 'newTunnel', 'illumination']);
      expect(itineraryRoadLegs(stops)).toHaveLength(stops.length - 1);
      expect(itineraryRoadLegs(stops)[6].key).toBe(`oldTunnel>${cafe.id}`);
    }
  });
  it('covers every ordered selection with actual road geometry and no guessed straight fallback', () => {
    const keys = new Set<string>();
    for (const lunch of lunchCandidates) for (const cafe of [null, ...cafeCandidates]) {
      for (const plan1Foliage of ['corridor', 'koyodai'] as const) for (const plan2Koyodai of [false, true]) {
        for (const plan of drivePlans) {
          const stops = buildItinerary(plan.stages, { lunchId: lunch.id, cafeId: cafe?.id ?? null, plan1Foliage, plan2Koyodai });
          for (const leg of itineraryRoadLegs(stops)) {
            keys.add(leg.key);
            expect(leg.coordinates?.length).toBeGreaterThan(2);
            expect(leg.coordinates?.every(([lat, lng]) => lat > 35 && lat < 36 && lng > 138 && lng < 140)).toBe(true);
          }
        }
      }
    }
    expect([...keys].sort()).toEqual(Object.keys(roadData.segments).sort());
    for (const segment of Object.values(roadData.segments)) {
      expect(segment.coordinates[0]).toEqual(segment.snapped[0].coordinates);
      expect(segment.coordinates.at(-1)).toEqual(segment.snapped[1].coordinates);
      expect(segment.snapped.every((point) => point.distance < 700)).toBe(true);
    }
    expect(roadData.segments['pass>oldTunnel'].snapped[1].road).toContain('御坂隧道');
    expect(roadData.segments['newTunnel>illumination'].snapped[0].road).toContain('御坂');
    const changed = buildItinerary(drivePlans[0].stages, initialPlanSelections).map((stop) => stop.id === 'funari' ? { ...stop, coordinates: [0, 0] as [number, number] } : stop);
    expect(itineraryRoadLegs(changed).slice(0, 2).every((leg) => leg.coordinates === null)).toBe(true);
  });
  it('retains separate road waypoints and records coordinate sources', () => {
    expect(planPlaces.oldTunnel.coordinates).not.toEqual(planPlaces.newTunnel.coordinates);
    expect(planPlaces.pass.coordinates).not.toEqual(spotById.P09.coordinates);
    for (const location of Object.values(locations)) {
      expect(location.coordinates[0]).toBeGreaterThan(35);
      expect(location.coordinates[0]).toBeLessThan(36);
      expect(location.coordinates[1]).toBeGreaterThan(138);
      expect(location.coordinates[1]).toBeLessThan(140);
      expect(location.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});

describe('plan photo albums', () => {
  it('reuses existing foliage albums, covers and coordinates without changing the regional catalog', () => {
    for (const [place, id] of [[planPlaces.corridor, 'P07'], [planPlaces.pass, 'P09'], [planPlaces.illumination, 'P06']] as const) {
      expect(planAlbumUrl(place)).toMatch(new RegExp(`/spots/${id.toLowerCase()}/$`));
      expect(planCover(place)).toBe(spotById[id].photo);
    }
    expect(planPlaces.corridor.coordinates).toEqual(spotById.P07.coordinates);
    expect(planPlaces.illumination.coordinates).toEqual(spotById.P06.coordinates);
    expect(spots).toHaveLength(25);
  });
  it('provides separate static albums for all restaurants and the three new foliage locations', () => {
    const expected = [...lunchCandidates, ...cafeCandidates, planPlaces.koyodai, planPlaces.shoji, planPlaces.motosu];
    expect(planAlbums.map((album) => album.id)).toEqual(expected.map((place) => place.id));
    for (const place of expected) expect(planAlbumUrl(place)).toMatch(new RegExp(`/plans/1115/${place.id}/$`));
    expect(planAlbumUrl(planPlaces.oldTunnel)).toBeUndefined();
  });
  it('ships several distinct photos, lightweight covers and source credits for each album', () => {
    for (const album of planAlbums) {
      expect(album.photos.length).toBeGreaterThanOrEqual(2);
      expect(new Set(album.photos.map((photo) => photo.src)).size).toBe(album.photos.length);
      for (const photo of album.photos) {
        expect(existsSync(`public${photo.src}`)).toBe(true);
        expect(existsSync(`public${photo.thumbnailSrc}`)).toBe(true);
        expect(photo.width).toBeGreaterThanOrEqual(500);
        expect(photo.height).toBeGreaterThanOrEqual(300);
        expect(photo.credit.length).toBeGreaterThan(0);
        expect(photo.sourceUrl).toMatch(/^https?:\/\//);
        if (['koyodai', 'shoji', 'motosu'].includes(album.id)) expect(photo.season).toBe('autumn');
      }
    }
  });
});
