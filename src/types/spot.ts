export type RouteId = 'hakone' | 'yamanashi' | 'chichibu-tama';
export type RouteFilter = 'all' | RouteId;
export type ViewMode = 'scenery' | 'map';

export interface Photo {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  season: 'autumn' | 'other' | 'unknown';
}

export interface Spot {
  id: string;
  name: string;
  routeId: RouteId;
  coordinates: [number, number];
  kind: string;
  description: string;
  address: string;
  googleMapsUrl: string;
  officialUrl: string;
  locationNote: string;
  parkingNote: string;
  walkingNote: string;
  sources: { label: string; url: string }[];
  verifiedAt: string;
  coordinateStatus: 'verified' | 'approximate';
  photo: Photo | null;
}
