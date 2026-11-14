'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { itineraryMapStops, type ItineraryStop } from '../lib/drive-plans';
import { itineraryRoadLegs } from '../lib/plan-roads';
import { planAlbumName, planAlbumUrl, planCover } from '../lib/plan-albums';
import { assetUrl } from '../lib/asset-url';
import { layoutPhotoPins } from '../lib/photo-pin-layout';
import 'leaflet/dist/leaflet.css';

type Props = { stops: ItineraryStop[]; planId: string; label: string };
type MapInstance = { map: Leaflet.Map; leaflet: typeof import('leaflet'); layer: Leaflet.LayerGroup };

export default function DrivePlanMap({ stops, planId, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<MapInstance | null>(null);
  const latestStops = useRef(stops);
  const lastPlan = useRef('');
  const includeDeparture = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [retry, setRetry] = useState(0);
  latestStops.current = stops;

  function fit(showDeparture: boolean) {
    const current = instance.current;
    if (!current) return;
    includeDeparture.current = showDeparture;
    const points = itineraryMapStops(latestStops.current).filter((stop) => showDeparture || stop.id !== 'start');
    if (!points.length) return;
    const roads = itineraryRoadLegs(latestStops.current).filter((leg) => showDeparture || leg.from.id !== 'start').flatMap((leg) => leg.coordinates ?? []);
    current.map.invalidateSize({ pan: false });
    current.map.fitBounds(current.leaflet.latLngBounds([...points.map((stop) => stop.coordinates), ...roads]), { padding: [42, 42], maxZoom: 12, animate: false });
  }

  useEffect(() => {
    let disposed = false;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    setFailed(false); setReady(false); setTileError(false);
    void import('leaflet').then((module) => {
      if (disposed || !container.current) return;
      const leaflet = ('default' in module ? module.default : module) as typeof import('leaflet');
      map = leaflet.map(container.current, {
        center: [35.52, 138.72], zoom: 10, minZoom: 5, maxZoom: 18,
        scrollWheelZoom: false, zoomAnimation: false, markerZoomAnimation: false,
      });
      leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, updateWhenIdle: true, keepBuffer: 1,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      }).on('tileerror', () => { if (!disposed) setTileError(true); }).addTo(map);
      instance.current = { map, leaflet, layer: leaflet.layerGroup().addTo(map) };
      map.on('resize', () => map?.closePopup());
      lastPlan.current = '';
      observer = new ResizeObserver(() => fit(includeDeparture.current));
      observer.observe(container.current);
      setReady(true);
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; observer?.disconnect(); map?.remove(); instance.current = null; };
  }, [retry]);

  useEffect(() => {
    const current = instance.current;
    if (!ready || !current) return;
    const { leaflet, layer } = current;
    layer.clearLayers();
    const connectors = leaflet.layerGroup().addTo(layer);
    const markers: { marker: Leaflet.Marker; id: string; coordinates: [number, number] }[] = [];
    const color = planId === 'plan1' ? '#883d27' : '#28647b';
    const roads = itineraryRoadLegs(stops);
    const roadStyle: Leaflet.PolylineOptions = { smoothFactor: 0, lineCap: 'round', lineJoin: 'round', interactive: false };
    // Draw every casing first. At wide zoom, a later leg's white casing used to
    // erase an earlier colored leg where roads run close together or retrace.
    for (const road of roads) {
      if (road.coordinates) leaflet.polyline(road.coordinates, { ...roadStyle, color: '#fffaf1', weight: 7, opacity: .9, className: 'plan-road-outline' }).addTo(layer);
    }
    for (const road of roads) {
      if (!road.coordinates) continue;
      const line = leaflet.polyline(road.coordinates, { ...roadStyle, color, weight: 4, opacity: 1, className: 'plan-visit-line' }).addTo(layer);
      line.getElement()?.setAttribute('data-plan-leg', road.key);
    }
    itineraryMapStops(stops).forEach((stop) => {
      const marker = leaflet.marker(stop.coordinates, {
        title: `${stop.order}. ${stop.name}`, keyboard: true, autoPanOnFocus: false, riseOnHover: true,
        icon: leaflet.divIcon({ className: 'plan-map-marker', iconSize: [44, 44], iconAnchor: [22, 40], popupAnchor: [0, -36],
          html: `<svg width="38" height="44" viewBox="0 0 38 44" aria-hidden="true"><path d="M19 41C16 36 4 25 4 17a15 15 0 0 1 30 0c0 8-12 19-15 24Z" fill="${color}" stroke="#fffaf1" stroke-width="2"/><text x="19" y="22" text-anchor="middle" fill="#fffaf1" font-family="sans-serif" font-size="14" font-weight="700">${stop.order}</text></svg>` }),
      });
      const popup = document.createElement('div');
      popup.className = 'plan-pin-preview';
      const name = document.createElement('strong');
      name.textContent = `${stop.order}. ${stop.name}`;
      popup.append(name);
      const albumUrl = planAlbumUrl(stop);
      const photo = planCover(stop);
      if (albumUrl && photo) {
        const album = document.createElement('a'); album.href = albumUrl;
        album.setAttribute('aria-label', `${planAlbumName(stop)}の写真を見る`);
        const image = document.createElement('img'); image.src = assetUrl(photo.thumbnailSrc ?? photo.src); image.alt = photo.alt; image.width = 240;
        image.addEventListener('error', () => image.remove(), { once: true });
        album.append(image, document.createTextNode(`${planAlbumName(stop)}の写真を見る →`)); popup.append(album);
      }
      if (stop.mapUrl) {
        const link = document.createElement('a'); link.href = stop.mapUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Googleマップで確認 ↗'; popup.append(link);
      }
      marker.bindPopup(popup, { autoPan: false, maxWidth: 260, closeButton: true, className: 'plan-stop-popup' });
      // Keep the preview inside the map without panning the map or scrolling the page.
      marker.on('popupopen', () => {
        const preview = marker.getPopup()!;
        const size = current.map.getSize();
        preview.options.maxWidth = Math.min(260, size.x - 56);
        preview.options.maxHeight = Math.max(90, size.y - 70);
        preview.options.offset = leaflet.point(0, 7);
        preview.update();
        const element = preview.getElement();
        if (!element) return;
        element.querySelector('.leaflet-popup-close-button')?.setAttribute('aria-label', '地点の詳細を閉じる');
        const box = element.getBoundingClientRect();
        const bounds = current.map.getContainer().getBoundingClientRect();
        const x = Math.max(bounds.left + 12 - box.left, Math.min(0, bounds.right - 12 - box.right));
        const y = Math.max(bounds.top + 12 - box.top, Math.min(0, bounds.bottom - 12 - box.bottom));
        preview.options.offset = leaflet.point(x, 7 + y);
        preview.update();
      });
      marker.addTo(layer);
      markers.push({ marker, id: stop.id, coordinates: stop.coordinates });
      const element = marker.getElement();
      element?.setAttribute('aria-label', `${stop.order}. ${stop.name}の詳細を表示`);
      if (element) element.dataset.planStop = stop.id;
      element?.addEventListener('keydown', (event) => {
        if (event.key === ' ') { event.preventDefault(); event.stopPropagation(); marker.openPopup(); }
      });
    });
    const placePins = () => {
      const size = current.map.getSize();
      const positions = layoutPhotoPins(markers.map((entry) => {
        const point = current.map.latLngToContainerPoint(entry.coordinates);
        return { id: entry.id, x: point.x, y: point.y };
      }), size.x, size.y);
      connectors.clearLayers();
      for (const entry of markers) {
        const position = positions.find((pin) => pin.id === entry.id);
        if (!position) { entry.marker.setLatLng(entry.coordinates); continue; }
        const tip = current.map.containerPointToLatLng([position.left + position.width / 2, position.top + 40]);
        entry.marker.setLatLng(tip);
        leaflet.polyline([entry.coordinates, tip], { color, weight: 1, opacity: .55, interactive: false }).addTo(connectors);
        leaflet.circleMarker(entry.coordinates, { radius: 2, color, fillOpacity: 1, weight: 1, interactive: false }).addTo(connectors);
      }
    };
    current.map.on('moveend zoomend resize', placePins);
    const itineraryKey = `${planId}:${stops.map((stop) => stop.id).join(',')}`;
    if (lastPlan.current !== itineraryKey) { fit(includeDeparture.current); lastPlan.current = itineraryKey; }
    placePins();
    return () => { current.map.off('moveend zoomend resize', placePins); };
  }, [stops, ready, planId]);

  return <div className="plan-map-block">
    <div className="plan-map-tools"><button type="button" onClick={() => fit(false)}>山梨エリアを表示</button><button type="button" onClick={() => fit(true)}>赤羽からの全行程</button></div>
    <div className="plan-map-canvas" ref={container} role="region" aria-label={`${label}の訪問順の地図`} />
    {failed && <p role="status">地図を読み込めませんでした。<button type="button" onClick={() => setRetry((value) => value + 1)}>再読み込み</button></p>}
    {tileError && <p role="status">背景地図の一部を読み込めませんでした。地点と行程は下の一覧でも確認できます。</p>}
    {itineraryRoadLegs(stops).some((leg) => !leg.coordinates) && <p role="status">一部区間の道路データがありません。各地点の地図リンクで確認できます。</p>}
    <p className="plan-map-note">道路に沿った参考ルートです。湖などの代表地点では近くの道路まで表示します。{stops.some((stop) => stop.id === 'cafe') && 'カフェの前後は、候補を選ぶとつながります。'}</p>
    <p className="plan-map-source">経路：<a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">OSRM / FOSSGIS</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">地図の修正</a></p>
  </div>;
}
