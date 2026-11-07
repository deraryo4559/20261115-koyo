/** Public assets need the repository prefix when served by GitHub Pages. */
export function assetUrl(path: string, base = import.meta.env.BASE_URL): string {
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`;
}
