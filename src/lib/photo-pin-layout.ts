export interface PhotoPoint { id: string; x: number; y: number }
/** Place visible photo cards near their coordinates without covering one another or map controls. */
export function layoutPhotoPins(points: PhotoPoint[], width: number, height: number) {
  const placed: { id: string; x: number; y: number; left: number; top: number }[] = [];
  for (const point of points) {
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) continue;
    let best: { left: number; top: number; score: number } | undefined;
    for (let top = 8; top <= height - 76; top += 8) {
      for (let left = 8; left <= width - 68; left += 8) {
        if (left < 62 && top < 112) continue;
        const overlaps = placed.some((p) => left < p.left + 68 && left + 68 > p.left && top < p.top + 62 && top + 62 > p.top);
        if (overlaps) continue;
        const score = (left + 30 - point.x) ** 2 + (top + 52 - point.y) ** 2;
        if (!best || score < best.score) best = { left, top, score };
      }
    }
    // The mobile canvas is tall enough for the full catalog; retain a card even if future catalogs grow.
    placed.push({ ...point, left: best?.left ?? Math.max(8, Math.min(point.x - 30, width - 68)), top: best?.top ?? Math.max(8, Math.min(point.y - 52, height - 76)) });
  }
  return placed;
}
