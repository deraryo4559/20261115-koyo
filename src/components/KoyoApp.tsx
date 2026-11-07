'use client';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { filterSpots, spotById, spots } from '../data';
import { routes } from '../data/routes';
import { initialState, restoreBrowseState, STORAGE_KEY, type BrowseState } from '../lib/browse-state';
import type { RouteFilter, ViewMode } from '../types/spot';
import SpotGallery from './SpotGallery';
import SpotDetails from './SpotDetails';
import Credits from './Credits';
import MapErrorBoundary from './MapErrorBoundary';

const SpotMap = lazy(() => import('./SpotMap'));

export default function KoyoApp() {
  const [state, setState] = useState<BrowseState>(initialState);
  const [ready, setReady] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [revealRequest, setRevealRequest] = useState(0);
  const mapSection = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const scrollPositions = useRef<Record<ViewMode, number>>({ scenery: 0, map: 0 });
  const selected = state.selectedId ? spotById[state.selectedId] : null;
  const filtered = useMemo(() => filterSpots(state.route), [state.route]);

  useEffect(() => {
    let restored = initialState;
    try { restored = restoreBrowseState(localStorage.getItem(STORAGE_KEY), spots); } catch { /* optional persistence */ }
    const query = new URLSearchParams(window.location.search);
    const requestedSpot = spots.find((spot) => spot.id === query.get('spot'));
    if (query.get('view') === 'map' && requestedSpot) {
      restored = { ...restored, view: 'map', route: requestedSpot.routeId, selectedId: requestedSpot.id };
      setMapMounted(true);
      setRevealRequest(1);
      // Consume this one-time navigation request so browser Back restores later browsing choices.
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      url.searchParams.delete('spot');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
    setState(restored);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* optional persistence */ }
    if (state.view === 'map') setMapMounted(true);
  }, [state, ready]);

  const closeDetails = useCallback(() => {
    const trigger = lastTrigger.current;
    const returnToAlbum = Boolean(trigger?.closest('#scenery-view'));
    setState((current) => ({ ...current, selectedId: null, view: returnToAlbum ? 'scenery' : current.view }));
    requestAnimationFrame(() => {
      if (returnToAlbum) window.scrollTo({ top: scrollPositions.current.scenery, behavior: 'instant' });
      if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
      else {
        const id = trigger?.dataset.spotId;
        const fallback = id ? document.querySelector<HTMLAnchorElement>(`#map-view .gallery-button[data-spot-id="${id}"]`) : null;
        (fallback ?? document.getElementById('mode-map'))?.focus({ preventScroll: true });
      }
    });
  }, []);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.selectedId && !document.querySelector('dialog[open]')) closeDetails();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [state.selectedId, closeDetails]);

  useEffect(() => {
    if (revealRequest > 0) document.getElementById('detail-close')?.focus({ preventScroll: true });
  }, [revealRequest]);

  function changeView(view: ViewMode) {
    if (view === state.view) return;
    scrollPositions.current[state.view] = window.scrollY;
    if (view === 'map') setMapMounted(true);
    setState((current) => ({ ...current, view }));
    requestAnimationFrame(() => window.scrollTo({ top: scrollPositions.current[view], behavior: 'instant' }));
  }
  function changeRoute(route: RouteFilter) {
    const next = filterSpots(route);
    setState((current) => ({ ...current, route, selectedId: next.some((spot) => spot.id === current.selectedId) ? current.selectedId : null }));
    setAnnouncement(`${route === 'all' ? 'すべて' : routes.find((item) => item.id === route)?.label}、${next.length}スポットを表示しました。`);
  }
  const selectSpot = useCallback((id: string, trigger?: HTMLElement) => {
    if (trigger) lastTrigger.current = trigger;
    setState((current) => {
      if (current.view === 'scenery') scrollPositions.current.scenery = window.scrollY;
      return { ...current, view: 'map', selectedId: id };
    });
    setMapMounted(true);
    setRevealRequest((request) => request + 1);
    setAnnouncement(`${spotById[id].name}の写真と詳細を表示しました。`);
    requestAnimationFrame(() => mapSection.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }, []);

  return <>
    <a className="skip-link" href="#main-content">スポット一覧へ</a>
    <header className="site-header">
      <div className="header-top"><h1>紅葉ドライブ地図</h1><span>関東・山梨</span></div>
      <nav className="view-switch" aria-label="探し方">
        <button id="mode-scenery" type="button" aria-pressed={state.view === 'scenery'} aria-controls="scenery-view" onClick={() => changeView('scenery')}>景色から探す</button>
        <button id="mode-map" type="button" aria-pressed={state.view === 'map'} aria-controls="map-view" onClick={() => changeView('map')}>地図から探す</button>
      </nav>
      <nav className="route-filter" aria-label="行き先の方面">
        <button type="button" aria-pressed={state.route === 'all'} onClick={() => changeRoute('all')} data-route="all"><span>すべて</span><span className="route-count">19</span></button>
        {routes.map((route) => <button key={route.id} type="button" data-route={route.id} aria-pressed={state.route === route.id} aria-label={`${route.label}、${route.count}スポット`} onClick={() => changeRoute(route.id)}><span className="route-name"><span className="route-name-full">{route.label}</span><span className="route-name-short">{route.shortLabel}</span></span><span className="route-count">{route.count}</span></button>)}
      </nav>
    </header>
    <main id="main-content">
      <section id="scenery-view" className="album-section" aria-label="紅葉スポットの写真アルバム" hidden={state.view !== 'scenery'}>
        <div className="content-width"><SpotGallery spots={filtered} /></div>
      </section>
      <section id="map-view" className="map-section" aria-label="地図から紅葉スポットを選ぶ" hidden={state.view !== 'map'}>
        <div className="map-caption content-width"><p>{filtered.length}スポット</p><span>ピンで写真を見る</span></div>
        <div className="map-layout content-width" ref={mapSection}>
          {mapMounted && <MapErrorBoundary onRetry={() => window.location.reload()}>
            <Suspense fallback={<div className="map-loading" role="status">地図を読み込んでいます…</div>}>
              <SpotMap spots={filtered} selectedId={state.selectedId} active={state.view === 'map'} filterKey={state.route} revealRequest={revealRequest} onSelect={selectSpot} />
            </Suspense>
          </MapErrorBoundary>}
          {selected && <SpotDetails key={selected.id} spot={selected} onClose={closeDetails} />}
        </div>
        <section className="map-index content-width" aria-label="地図と同じスポットの一覧"><h2>スポット一覧 <span>{filtered.length}</span></h2><SpotGallery spots={filtered} compact /></section>
      </section>
    </main>
    <footer className="site-footer content-width"><p>写真は過去の秋の風景です。現在の色づき・営業情報は各スポットの公式サイトへ。</p><div><p>3つのルートは方面ごとの分類です。全地点を巡る行程ではありません。</p><Credits spots={spots} /></div></footer>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
  </>;
}
