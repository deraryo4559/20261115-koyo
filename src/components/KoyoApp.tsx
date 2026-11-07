"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { filterSpots, spotById, spots } from "../data";
import { routes } from "../data/routes";
import {
  initialState,
  restoreBrowseState,
  STORAGE_KEY,
  type BrowseState,
} from "../lib/browse-state";
import type { RouteFilter } from "../types/spot";
import SpotGallery from "./SpotGallery";
import SpotDetails from "./SpotDetails";
import Credits from "./Credits";
import MapErrorBoundary from "./MapErrorBoundary";

const SpotMap = lazy(() => import("./SpotMap"));

export default function KoyoApp() {
  const [state, setState] = useState<BrowseState>(initialState);
  const [ready, setReady] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [revealRequest, setRevealRequest] = useState(0);
  const [resetRequest, setResetRequest] = useState(0);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const selected = state.selectedId ? spotById[state.selectedId] : null;
  const filtered = useMemo(() => filterSpots(state.route), [state.route]);

  useEffect(() => {
    let restored = initialState;
    try {
      restored = restoreBrowseState(localStorage.getItem(STORAGE_KEY), spots);
    } catch {
      /* optional persistence */
    }
    const query = new URLSearchParams(window.location.search);
    const requestedSpot = spots.find((spot) => spot.id === query.get("spot"));
    if (query.get("view") === "map" && requestedSpot) {
      restored = {
        ...restored,
        view: "map",
        route: requestedSpot.routeId,
        selectedId: requestedSpot.id,
      };
      setMapMounted(true);
      setRevealRequest(1);
      // Consume this one-time navigation request so browser Back restores later browsing choices.
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.delete("spot");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
    setState(restored);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, selectedId: null }));
    } catch {
      /* optional persistence */
    }
    if (state.view === "map") setMapMounted(true);
  }, [state, ready]);

  const closeDetails = useCallback(() => {
    const trigger = lastTrigger.current;
    setState((current) => ({ ...current, selectedId: null }));
    requestAnimationFrame(() => {
      if (trigger?.isConnected && trigger.getClientRects().length)
        trigger.focus({ preventScroll: true });
      else {
        const id = trigger?.dataset.spotId;
        const fallback = id
          ? document.querySelector<HTMLAnchorElement>(
              `#map-view .gallery-button[data-spot-id="${id}"]`,
            )
          : null;
        (
          fallback ??
          document.querySelector<HTMLButtonElement>(
            '.route-filter button[aria-pressed="true"]',
          )
        )?.focus({ preventScroll: true });
      }
    });
  }, []);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        state.selectedId &&
        !document.querySelector("dialog[open]")
      )
        closeDetails();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [state.selectedId, closeDetails]);

  useEffect(() => {
    if (revealRequest > 0)
      document.getElementById("detail-close")?.focus({ preventScroll: true });
  }, [revealRequest]);

  function changeRoute(route: RouteFilter) {
    const next = filterSpots(route);
    if (route === "all") setResetRequest((request) => request + 1);
    setState((current) => ({
      ...current,
      route,
      selectedId: route !== "all" && next.some((spot) => spot.id === current.selectedId)
        ? current.selectedId
        : null,
    }));
    setAnnouncement(
      `${route === "all" ? "すべて" : routes.find((item) => item.id === route)?.label}、${next.length}スポットを表示しました。`,
    );
  }
  const selectSpot = useCallback((id: string, trigger?: HTMLElement) => {
    if (trigger) lastTrigger.current = trigger;
    setState((current) => ({ ...current, selectedId: id }));
    setMapMounted(true);
    setRevealRequest((request) => request + 1);
    setAnnouncement(`${spotById[id].name}の写真と詳細を表示しました。`);

  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">
        スポット一覧へ
      </a>
      <header className="site-header">
        <div className="header-top">
          <h1>紅葉ドライブ地図</h1>
        </div>
        <nav className="route-filter" aria-label="行き先の方面">
          <button
            type="button"
            aria-pressed={state.route === "all"}
            onClick={() => changeRoute("all")}
            data-route="all"
          >
            <span>すべて</span>
            <span className="route-count">{spots.length}</span>
          </button>
          {routes.map((route) => (
            <button
              key={route.id}
              type="button"
              data-route={route.id}
              aria-pressed={state.route === route.id}
              aria-label={`${route.label}、${route.count}スポット`}
              onClick={() => changeRoute(route.id)}
            >
              <span className="route-name">
                <span className="route-name-full">{route.label}</span>
                <span className="route-name-short">{route.shortLabel}</span>
              </span>
              <span className="route-count">{route.count}</span>
            </button>
          ))}
        </nav>
      </header>
      <main id="main-content">
        <section
          id="map-view"
          className="map-section"
          aria-label="地図から紅葉スポットを選ぶ"
        >
          <div className="map-caption content-width">
            <p>{filtered.length}スポット</p>
          </div>
          <ul
            className="map-legend content-width"
            aria-label="ピンのルート凡例"
          >
            {routes.map((route) => (
              <li key={route.id}>
                <span
                  className="route-key"
                  style={{ backgroundColor: route.color }}
                  aria-hidden="true"
                >
                </span>
                {route.shortLabel}
              </li>
            ))}
          </ul>
          <div className="map-layout content-width">
            {mapMounted && (
              <MapErrorBoundary onRetry={() => window.location.reload()}>
                <Suspense
                  fallback={
                    <div className="map-loading" role="status">
                      地図を読み込んでいます…
                    </div>
                  }
                >
                  <SpotMap
                    spots={filtered}
                    selectedId={state.selectedId}
                    active
                    filterKey={state.route}
                    revealRequest={revealRequest}
                    resetRequest={resetRequest}
                    onSelect={selectSpot}
                  />
                </Suspense>
              </MapErrorBoundary>
            )}
            {selected && (
              <SpotDetails
                key={selected.id}
                spot={selected}
                onClose={closeDetails}
              />
            )}
          </div>
          <section
            className="map-index content-width"
            aria-label="地図と同じスポットの一覧"
          >
            <h2>
              スポット一覧 <span>{filtered.length}</span>
            </h2>
            <SpotGallery spots={filtered} compact />
          </section>
        </section>
      </main>
      <footer className="site-footer content-width">
        <div>
          <Credits spots={spots} />
        </div>
      </footer>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
