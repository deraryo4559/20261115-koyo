import rawSpots from './spots.json';
import rawPhotos from './photos.json';
import type { Photo, RouteFilter, Spot } from '../types/spot';

const photos = rawPhotos as Record<string, Photo | null>;
export const spots: Spot[] = rawSpots.map((spot) => ({
  ...spot,
  coordinates: spot.coordinates as [number, number],
  routeId: spot.routeId as Spot['routeId'],
  coordinateStatus: spot.coordinateStatus as Spot['coordinateStatus'],
  photo: photos[spot.id] ?? null,
}));

export const spotById = Object.fromEntries(spots.map((spot) => [spot.id, spot]));
export function filterSpots(route: RouteFilter): Spot[] {
  return route === 'all' ? spots : spots.filter((spot) => spot.routeId === route);
}
