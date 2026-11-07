export interface PhotoPoint { id: string; x: number; y: number }
/** Place visible photo cards near their coordinates without covering one another or map controls. */
export function layoutPhotoPins(points: PhotoPoint[], width: number, height: number) {
  const compact = width > 500 && height < 360;
  const cardWidth = compact ? 48 : 60;
  const cardHeight = compact ? 36 : 44;
  const gapX = cardWidth + 8;
  const gapY = cardHeight + 14;
  const tip = cardHeight + 4;
  const placed: { id: string; x: number; y: number; left: number; top: number; width: number; height: number }[] = [];
  for (const point of points) {
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) continue;
    let best: { left: number; top: number; score: number } | undefined;
    for (let top = 8; top <= height - cardHeight - 26; top += 8) {
      for (let left = 8; left <= width - gapX; left += 8) {
        if (left < 62 && top < 112) continue;
        const overlaps = placed.some((p) => left < p.left + gapX && left + gapX > p.left && top < p.top + gapY && top + gapY > p.top);
        if (overlaps) continue;
        const score = (left + cardWidth / 2 - point.x) ** 2 + (top + tip - point.y) ** 2;
        if (!best || score < best.score) best = { left, top, score };
      }
    }
    // The mobile canvas is tall enough for the full catalog; retain a card even if future catalogs grow.
    placed.push({ ...point, width: cardWidth, height: cardHeight, left: best?.left ?? Math.max(8, Math.min(point.x - cardWidth / 2, width - gapX)), top: best?.top ?? Math.max(8, Math.min(point.y - tip, height - cardHeight - 26)) });
  }
  return placed;
}
