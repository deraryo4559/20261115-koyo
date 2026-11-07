import { expect, it } from 'vitest';
import { layoutPhotoPins } from '../src/lib/photo-pin-layout';
it('keeps 25 dense photo cards separate within the smallest mobile canvas', () => {
  const pins = layoutPhotoPins(Array.from({length:25}, (_, i) => ({id:String(i), x:144, y:270})), 286, 660);
  expect(pins).toHaveLength(25);
  pins.forEach((p, i) => {
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.left + 60).toBeLessThanOrEqual(286);
    expect(p.top + 54).toBeLessThan(660);
    pins.slice(i+1).forEach(q => expect(p.left < q.left + 60 && p.left + 60 > q.left && p.top < q.top + 54 && p.top + 54 > q.top).toBe(false));
  });
});
it('does not pull offscreen spots into the viewport', () => {
  expect(layoutPhotoPins([{id:'outside', x:-1,y:20}],320,660)).toEqual([]);
});
