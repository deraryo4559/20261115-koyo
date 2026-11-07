import { isRouteFilter } from '../data/routes';
import type { RouteFilter, ViewMode } from '../types/spot';

export interface BrowseState {
  version: 1;
  route: RouteFilter;
  view: ViewMode;
  selectedId: string | null;
}
export const STORAGE_KEY = 'koyo-drive:browse:v1';
export const initialState: BrowseState = { version: 1, route: 'all', view: 'map', selectedId: null };

export function restoreBrowseState(raw: string | null, available: { id: string; routeId: string }[]): BrowseState {
  if (!raw) return { ...initialState };
  try {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !isRouteFilter(saved.route) || !['scenery', 'map'].includes(saved.view)) return { ...initialState };
    const selected = available.find((spot) => spot.id === saved.selectedId);
    if (saved.selectedId !== null && !selected) return { ...initialState };
    return {
      version: 1, route: saved.route, view: 'map',
      selectedId: null,
    };
  } catch {
    return { ...initialState };
  }
}
