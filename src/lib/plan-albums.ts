import { spotById } from '../data';
import { cafeCandidates, lunchCandidates, planPlaces, type PlanPlace } from '../data/drive-plans';
import rawPhotos from '../data/plan-photos.json';
import type { Photo } from '../types/spot';
import { assetUrl } from './asset-url';
import { spotUrl } from './spot-url';

const photos = rawPhotos as Record<string, Photo[]>;
const places: PlanPlace[] = [...lunchCandidates, ...cafeCandidates, ...Object.values(planPlaces)];
export const planAlbums = places.filter((place) => photos[place.id]).map((place) => ({
  id: place.id, name: place.name, photos: photos[place.id],
}));
export const planAlbumById = Object.fromEntries(planAlbums.map((album) => [album.id, album]));

export function planAlbumUrl(place: PlanPlace): string | undefined {
  if (place.existingSpotId) return spotUrl(place.existingSpotId);
  if (photos[place.id]) return assetUrl(`/plans/1115/${place.id}/`);
}
export function planCover(place: PlanPlace): Photo | undefined {
  if (place.existingSpotId) return spotById[place.existingSpotId]?.photo ?? undefined;
  return photos[place.id]?.[0];
}
export function planAlbumName(place: PlanPlace) {
  return place.existingSpotId ? spotById[place.existingSpotId].name : place.name;
}
