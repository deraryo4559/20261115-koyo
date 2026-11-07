import type { RouteFilter, RouteId } from '../types/spot';

export const routes = [
  { id: 'hakone', label: '箱根・芦ノ湖・御殿場', shortLabel: '箱根・御殿場', color: '#a43e27', number: '01', count: 5 },
  { id: 'yamanashi', label: '山梨', shortLabel: '山梨', color: '#265f88', number: '02', count: 9 },
  { id: 'chichibu-tama', label: '秩父・多摩', shortLabel: '秩父・多摩', color: '#64652a', number: '03', count: 11 },
] as const;

export const routeById = Object.fromEntries(routes.map((route) => [route.id, route])) as Record<RouteId, (typeof routes)[number]>;
export function isRouteFilter(value: unknown): value is RouteFilter {
  return value === 'all' || routes.some((route) => route.id === value);
}
