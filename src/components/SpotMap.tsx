'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { routeById } from '../data/routes';
import { assetUrl } from '../lib/asset-url';
import type { RouteFilter, Spot } from '../types/spot';
import 'leaflet/dist/leaflet.css';
import '../styles/map.css';

export interface SpotMapProps {
  spots: Spot[];
  selectedId: string | null;
  active: boolean;
  filterKey: RouteFilter;
  revealRequest: number;
  resetRequest: number;
  onSelect: (spotId: string, trigger?: HTMLElement) => void;
}

type MapStatus = 'loading' | 'ready' | 'partial' | 'error';
type Preview = { spot: Spot; trigger?: HTMLElement };
type LeafletModule = typeof import('leaflet');

const PREVIEW_DELAY = 200;
const TILE_TIMEOUT = 15_000;

function PreviewPhoto({ spot }: { spot: Spot }) {
  const [failed, setFailed] = useState(false);
  if (!spot.photo || failed) {
    return <div className="spot-map-photo-fallback"><span>{spot.name}</span><small>{spot.photo ? "写真を読み込めません" : "現地写真を確認中"}</small></div>;
  }
  return <img className="spot-map-preview-photo" src={assetUrl(spot.photo.thumbnailSrc ?? spot.photo.src)} alt={spot.photo.alt} onError={() => setFailed(true)} width={600} height={400} />;
}

/** A client-only, persistent Leaflet map. Filtering changes bounds; closing a detail does not. */
export default function SpotMap({ spots, selectedId, active, filterKey, revealRequest, resetRequest, onSelect }: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<string, Leaflet.Marker>());
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  const activeRef = useRef(active);
  const lastRevealedRequestRef = useRef<number | null>(null);
  const lastResetRequestRef = useRef<number | null>(null);
  const lastFittedFilterRef = useRef<RouteFilter | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedPreviewRef = useRef<string | null>(null);
  const previewStateRef = useRef<Preview | null>(null);
  const [hasActivated, setHasActivated] = useState(active);
  const [ready, setReady] = useState(0);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ left: 12, top: 12 });

  selectedRef.current = selectedId;
  selectRef.current = onSelect;
  activeRef.current = active;
  previewStateRef.current = preview;

  const visibleSpots = useMemo(() => spots.filter((spot) => filterKey === 'all' || spot.routeId === filterKey), [spots, filterKey]);

  const cancelTimers = useCallback(() => {
    if (showTimer.current !== null) clearTimeout(showTimer.current);
    if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }, []);

  const closePreview = useCallback((restoreFocus = false) => {
    cancelTimers();
    const current = previewStateRef.current;
    if (current) dismissedPreviewRef.current = current.spot.id;
    setPreview(null);
    if (restoreFocus) current?.trigger?.focus({ preventScroll: true });
  }, [cancelTimers]);

  const scheduleClose = useCallback(() => {
    if (showTimer.current !== null) clearTimeout(showTimer.current);
    if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = setTimeout(() => setPreview(null), PREVIEW_DELAY);
  }, []);

  const showPreview = useCallback((spot: Spot, trigger: HTMLElement | undefined, immediate = false) => {
    cancelTimers();
    if (selectedRef.current || dismissedPreviewRef.current === spot.id || !activeRef.current) return;
    const open = () => {
      if (!selectedRef.current && activeRef.current) setPreview({ spot, trigger });
    };
    if (immediate) open();
    else showTimer.current = setTimeout(open, PREVIEW_DELAY);
  }, [cancelTimers]);

  const chooseSpot = useCallback((spot: Spot, trigger?: HTMLElement) => {
    cancelTimers();
    setPreview(null);
    selectRef.current(spot.id, trigger);
  }, [cancelTimers]);

  useEffect(() => {
    if (active) setHasActivated(true);
    else closePreview();
  }, [active, closePreview]);

  // Load Leaflet only in the browser. This also keeps its window access out of SSR.
  useEffect(() => {
    if (!hasActivated || !containerRef.current) return;
    let disposed = false;
    let map: Leaflet.Map | null = null;
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;
    setStatus('loading');

    void (async () => {
      try {
        const importedLeaflet = await import('leaflet');
        const leaflet = ('default' in importedLeaflet ? importedLeaflet.default : importedLeaflet) as LeafletModule;
        if (disposed || !containerRef.current) return;
        leafletRef.current = leaflet;
        map = leaflet.map(containerRef.current, {
          center: [35.65, 139.05],
          zoom: 8,
          minZoom: 5,
          maxZoom: 18,
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        });
        mapRef.current = map;
        map.getContainer().setAttribute('aria-label', '紅葉スポットの地図。ズームボタンとピンから操作できます。');
        map.getContainer().setAttribute('role', 'region');
        map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a>');

        let succeeded = 0;
        let failed = 0;
        const tileLayer = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
          updateWhenIdle: true,
          keepBuffer: 1,
        });
        const clearLoadingTimeout = () => {
          if (loadingTimeout) clearTimeout(loadingTimeout);
          loadingTimeout = undefined;
        };
        tileLayer.on('loading', () => {
          succeeded = 0;
          failed = 0;
          clearLoadingTimeout();
          loadingTimeout = setTimeout(() => {
            if (!disposed) setStatus(succeeded > 0 ? 'partial' : 'error');
          }, TILE_TIMEOUT);
        });
        tileLayer.on('tileload', () => {
          succeeded += 1;
          if (!disposed) setStatus(failed ? 'partial' : 'ready');
        });
        tileLayer.on('tileerror', () => { failed += 1; });
        tileLayer.on('load', () => {
          clearLoadingTimeout();
          if (!disposed) setStatus(failed ? (succeeded ? 'partial' : 'error') : 'ready');
        });
        tileLayer.addTo(map);

        markerLayerRef.current = leaflet.layerGroup().addTo(map);
        map.on('movestart zoomstart', () => {
          cancelTimers();
          setPreview(null);
        });
        lastFittedFilterRef.current = null;
        lastResetRequestRef.current = null;
        lastRevealedRequestRef.current = null;
        setReady((value) => value + 1);
      } catch {
        if (!disposed) setStatus('error');
      }
    })();

    return () => {
      disposed = true;
      if (loadingTimeout) clearTimeout(loadingTimeout);
      cancelTimers();
      markerRefs.current.clear();
      markerLayerRef.current = null;
      map?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [hasActivated, retry, cancelTimers]);

  // Markers are recreated only when the filtered dataset changes, not on selection.
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !leaflet || !markerLayer || !ready) return;
    closePreview();
    dismissedPreviewRef.current = null;
    markerLayer.clearLayers();
    markerRefs.current.clear();
    const unbind: (() => void)[] = [];

    visibleSpots.forEach((spot) => {
      const route = routeById[spot.routeId];
      const marker = leaflet.marker(spot.coordinates, {
        title: `${spot.name}（${route.shortLabel}）`,
        riseOnHover: true,
        keyboard: true,
        autoPanOnFocus: false,
        icon: leaflet.divIcon({
          html: `<svg class="map-pin" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true" style="--pin-color: ${route.color}"><ellipse class="map-pin-shadow" cx="18" cy="40" rx="9" ry="2.5"/><path class="map-pin-body" d="M18 40C15 35 4 24 4 16a14 14 0 0 1 28 0c0 8-11 19-14 24Z"/><circle class="map-pin-center" cx="18" cy="16" r="4.5"/></svg>`,
          className: 'koyo-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 40],
        }),
        alt: spot.name,
      });
      markerRefs.current.set(spot.id, marker);
      let lastElement: HTMLElement | null = null;
      const decorateMarker = () => {
        const element = marker.getElement();
        if (!element) return;
        element.dataset.spotId = spot.id;
        element.setAttribute('aria-label', `${route.label}ルート、${spot.name}の写真と詳細を表示`);
        element.setAttribute('aria-pressed', String(selectedRef.current === spot.id));
        element.classList.toggle('is-selected', selectedRef.current === spot.id);
        if (lastElement === element) return;
        lastElement = element;
        const focus = () => showPreview(spot, element, true);
        const blur = (event: FocusEvent) => {
          dismissedPreviewRef.current = null;
          if (event.relatedTarget instanceof Node && previewRef.current?.contains(event.relatedTarget)) cancelTimers();
          else scheduleClose();
        };
        const keydown = (event: KeyboardEvent) => {
          // Leaflet already maps Enter to click; add Space without double firing Enter.
          if (event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            chooseSpot(spot, element);
          }
        };
        element.addEventListener('focus', focus);
        element.addEventListener('blur', blur);
        element.addEventListener('keydown', keydown);
        unbind.push(() => {
          element.removeEventListener('focus', focus);
          element.removeEventListener('blur', blur);
          element.removeEventListener('keydown', keydown);
        });
      };
      marker.on('add', decorateMarker);
      marker.on('mouseover', () => {
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) showPreview(spot, marker.getElement());
      });
      marker.on('mouseout', () => {
        dismissedPreviewRef.current = null;
        scheduleClose();
      });
      marker.on('click', () => chooseSpot(spot, marker.getElement()));
      markerLayer.addLayer(marker);
    });
    return () => unbind.forEach((remove) => remove());
  }, [ready, visibleSpots, closePreview, cancelTimers, scheduleClose, showPreview, chooseSpot]);

  // A filter change or explicit reset fits the bounds; detail dismissal preserves the view.
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!active || !map || !leaflet || !ready || !visibleSpots.length) return;
    const frame = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
      if (lastFittedFilterRef.current === filterKey && lastResetRequestRef.current === resetRequest) return;
      const reserveDetail = Boolean(selectedRef.current) && window.matchMedia('(min-width: 1024px)').matches;
      map.fitBounds(leaflet.latLngBounds(visibleSpots.map((spot) => spot.coordinates)), {
        paddingTopLeft: [34, 34],
        paddingBottomRight: [reserveDetail ? 394 : 34, 34],
        maxZoom: 12,
        animate: false,
      });
      lastFittedFilterRef.current = filterKey;
      lastResetRequestRef.current = resetRequest;
    });
    return () => cancelAnimationFrame(frame);
  }, [active, filterKey, resetRequest, ready, visibleSpots]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    markerRefs.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle('is-selected', id === selectedId);
      marker.getElement()?.setAttribute('aria-pressed', String(id === selectedId));
    });
    if (selectedId) closePreview();
    if (!map || !markerLayer || !active || !selectedId || lastRevealedRequestRef.current === revealRequest) return;
    const marker = markerRefs.current.get(selectedId);
    if (!marker) return;
    // Keep the selected pin clear of the desktop detail panel.
    const frame = requestAnimationFrame(() => {
      lastRevealedRequestRef.current = revealRequest;
      if (mapRef.current !== map || selectedRef.current !== selectedId || !activeRef.current) return;
      marker.getElement()?.classList.add('is-selected');
      marker.getElement()?.setAttribute('aria-pressed', 'true');

    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId, active, ready, visibleSpots, revealRequest, closePreview]);

  const updatePreviewPosition = useCallback(() => {
    const map = mapRef.current;
    const current = previewStateRef.current;
    const element = previewRef.current;
    if (!map || !current || !element) return;
    const point = map.latLngToContainerPoint(current.spot.coordinates);
    const size = map.getSize();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const leftCandidate = point.x + 24 + width <= size.x - 12 ? point.x + 24 : point.x - width - 24;
    const left = Math.max(12, Math.min(leftCandidate, size.x - width - 12));
    const top = Math.max(12, Math.min(point.y - height / 2, size.y - height - 12));
    setPreviewPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!preview) return;
    updatePreviewPosition();
    const observer = new ResizeObserver(updatePreviewPosition);
    if (previewRef.current) observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [preview, updatePreviewPosition]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (activeRef.current) mapRef.current?.invalidateSize({ pan: false });
      updatePreviewPosition();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [updatePreviewPosition]);

  return (
    <div className="spot-map" data-testid="spot-map" onKeyDown={(event) => {
      if (event.key === 'Escape' && previewStateRef.current) {
        event.stopPropagation();
        closePreview(true);
      }
    }}>
      <div className="spot-map-canvas" ref={containerRef} />
      {status === 'loading' && <p className="spot-map-loading" role="status">地図を読み込んでいます…</p>}
      {(status === 'error' || status === 'partial') && <div className="spot-map-error" role="status">
        <p>{status === 'error' ? '地図を読み込めませんでした。' : '地図の一部を読み込めませんでした。'}<span>下の一覧から引き続きスポットを選べます。</span></p>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>再読み込み</button>
      </div>}
      {preview && !selectedId && <div
        className="spot-map-preview"
        ref={previewRef}
        role="dialog"
        aria-label={`${preview.spot.name}の写真プレビュー`}
        style={{ left: previewPosition.left, top: previewPosition.top }}
        onMouseEnter={cancelTimers}
        onMouseLeave={scheduleClose}
        onFocus={cancelTimers}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleClose();
        }}
      >
        <button className="spot-map-preview-close" type="button" aria-label="写真プレビューを閉じる" onClick={() => closePreview(true)}>×</button>
        <PreviewPhoto key={preview.spot.id} spot={preview.spot} />
        <div className="spot-map-preview-copy">
          <p className="spot-map-preview-route">{routeById[preview.spot.routeId].label}</p>
          <h3>{preview.spot.name}</h3>
          <p className="spot-map-preview-description">{preview.spot.description}</p>
          <button type="button" className="spot-map-preview-select" onClick={() => chooseSpot(preview.spot, preview.trigger)}>詳しく見る <span aria-hidden="true">↗</span></button>
          {preview.spot.photo && <a className="spot-map-preview-credit" href={preview.spot.photo.sourceUrl} target="_blank" rel="noopener noreferrer">写真：{preview.spot.photo.credit} · {preview.spot.photo.license}</a>}
        </div>
      </div>}
    </div>
  );
}
