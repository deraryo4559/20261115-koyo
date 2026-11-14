// Explicit maintenance command, never part of build/check or a visitor request.
import { createServer } from 'vite';
import { writeFile, rename } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const server = await createServer({ configFile: false, server: { middlewareMode: true } });
let data, buildItinerary;
try {
  data = await server.ssrLoadModule('/src/data/drive-plans.ts');
  ({ buildItinerary } = await server.ssrLoadModule('/src/lib/drive-plans.ts'));
} finally { await server.close(); }

const pairs = new Map();
for (const lunch of data.lunchCandidates) for (const cafe of [null, ...data.cafeCandidates]) {
  for (const plan1Foliage of ['corridor', 'koyodai']) for (const plan2Koyodai of [false, true]) {
    for (const plan of data.drivePlans) {
      const stops = buildItinerary(plan.stages, { lunchId: lunch.id, cafeId: cafe?.id ?? null, plan1Foliage, plan2Koyodai });
      stops.slice(1).forEach((stop, index) => {
        if (stops[index].coordinates && stop.coordinates) pairs.set(`${stops[index].id}>${stop.id}`, [stops[index], stop]);
      });
    }
  }
}

const endpoint = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/';
const segments = {};
for (const [key, places] of pairs) {
  const coordinates = places.map((place) => place.coordinates);
  const query = coordinates.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const response = await fetch(`${endpoint}${query}?overview=full&geometries=geojson&steps=false&continue_straight=false`, {
    headers: { 'User-Agent': 'KoyoDriveMap/1.0 (https://github.com/deraryo4559/20261115-koyo)' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
  const route = await response.json();
  if (route.code !== 'Ok' || !route.routes[0]?.geometry?.coordinates?.length) throw new Error(`${key}: no road route`);
  segments[key] = {
    requested: coordinates,
    snapped: route.waypoints.map((point) => ({ coordinates: [point.location[1], point.location[0]], distance: point.distance, road: point.name })),
    coordinates: route.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
  console.log(`${key}: ${segments[key].coordinates.length} points; snaps ${route.waypoints.map((point) => Math.round(point.distance)).join(', ')} m`);
  // FOSSGIS's service policy allows at most one request per second.
  await delay(1100);
}
const output = 'src/data/plan-road-routes.json';
await writeFile(`${output}.tmp`, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'OSRM car routing / FOSSGIS / OpenStreetMap',
  sourceUrl: 'https://routing.openstreetmap.de/about.html',
  licenseUrl: 'https://www.openstreetmap.org/copyright',
  endpoint, segments,
}));
await rename(`${output}.tmp`, output);
console.log(`Saved ${pairs.size} road segments to ${output}`);
