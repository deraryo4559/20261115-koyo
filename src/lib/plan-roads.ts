import roadData from '../data/plan-road-routes.json';
import type { ItineraryStop } from './drive-plans';

type Coordinates = [number, number];
type RoadSegment = { requested: Coordinates[]; coordinates: Coordinates[] };
// JSON infers arrays rather than tuples; the generated coordinates are checked by plan-map.test.ts.
const segments = roadData.segments as unknown as Record<string, RoadSegment>;

/** Unknown cafes leave a gap; a missing/outdated road is never replaced by a straight line. */
export function itineraryRoadLegs(stops: ItineraryStop[]) {
  return stops.slice(1).flatMap((to, index) => {
    const from = stops[index];
    if (!from.coordinates || !to.coordinates) return [];
    const key = `${from.id}>${to.id}`;
    const road = segments[key];
    const matches = road?.requested.every((point, i) => point.every((value, axis) => value === [from.coordinates, to.coordinates][i]?.[axis]));
    return [{ key, from, to, coordinates: matches ? road.coordinates : null }];
  });
}
